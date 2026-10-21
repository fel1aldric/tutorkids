from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.auth import get_current_parent
from app.models.parent import Parent
from app.models.child import Child, parent_child_links
from app.models.family_message import FamilyMessage
from app.schemas.family_message import FamilyMessageCreate, FamilyMessageRead
from app.services.push_service import get_push_service

router = APIRouter(prefix="/family-messages", tags=["family_messages"])


def _get_linked_parent_ids(db: Session, parent_id: str) -> List[str]:
    """Return IDs of parents who share at least one child with the given parent."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        return []
    own_child_ids = [c.id for c in parent.children]
    if not own_child_ids:
        return []
    parents = (
        db.query(Parent)
        .join(parent_child_links, parent_child_links.c.parent_id == Parent.id)
        .filter(parent_child_links.c.child_id.in_(own_child_ids))
        .filter(Parent.id != parent_id)
        .distinct()
        .all()
    )
    return [p.id for p in parents]


@router.post("/", response_model=FamilyMessageRead)
def send_message(
    message: FamilyMessageCreate,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    if not message.content or not message.content.strip():
        raise HTTPException(status_code=400, detail="Message content is required")

    # Can only message parents linked through shared children.
    allowed_ids = _get_linked_parent_ids(db, parent.id)
    if message.recipient_parent_id not in allowed_ids:
        raise HTTPException(status_code=403, detail="Cannot send message to this parent")

    if message.child_id:
        child = db.query(Child).filter(Child.id == message.child_id).first()
        recipient = db.query(Parent).filter(Parent.id == message.recipient_parent_id).first()
        if not child or not recipient:
            raise HTTPException(status_code=404, detail="Child or recipient not found")
        if child not in parent.children and child not in recipient.children:
            raise HTTPException(status_code=403, detail="Invalid child context")

    db_msg = FamilyMessage(
        sender_parent_id=parent.id,
        recipient_parent_id=message.recipient_parent_id,
        child_id=message.child_id,
        content=message.content.strip(),
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)

    # Notify the recipient via push notification if they have a token.
    try:
        push_service = get_push_service()
        recipient = db.query(Parent).filter(Parent.id == message.recipient_parent_id).first()
        if recipient and recipient.push_token:
            child_name = db_msg.child.first_name if db_msg.child else "Famille"
            push_service.send_push(
                push_tokens=[recipient.push_token],
                title=f"Message de {parent.first_name} — {child_name}",
                body=db_msg.content,
                data={
                    "type": "family_message",
                    "message_id": db_msg.id,
                    "child_id": db_msg.child_id,
                    "sender_id": parent.id,
                },
            )
    except Exception as exc:
        print(f"[family_messages] Push notification failed: {exc}")

    return db_msg


@router.get("/", response_model=List[FamilyMessageRead])
def list_messages(
    child_id: Optional[str] = None,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    """List messages where the current parent is sender or recipient.
    If child_id is provided, filter the thread by that child.
    """
    query = db.query(FamilyMessage).filter(
        or_(
            FamilyMessage.sender_parent_id == parent.id,
            FamilyMessage.recipient_parent_id == parent.id,
        )
    )
    if child_id:
        query = query.filter(FamilyMessage.child_id == child_id)
    return query.order_by(FamilyMessage.created_at).all()


@router.get("/parents", response_model=List[dict])
def list_linked_parents(
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    """Return parents with whom the current parent shares at least one child."""
    own_children = parent.children
    if not own_children:
        return []
    child_ids = [c.id for c in own_children]
    parents = (
        db.query(Parent)
        .join(parent_child_links, parent_child_links.c.parent_id == Parent.id)
        .filter(parent_child_links.c.child_id.in_(child_ids))
        .filter(Parent.id != parent.id)
        .distinct()
        .all()
    )
    return [
        {
            "id": p.id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "email": p.email,
        }
        for p in parents
    ]


@router.get("/threads", response_model=List[dict])
def list_threads(
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    """Return message threads grouped by child for the current parent.
    Includes a 'general' thread for messages not tied to a specific child.
    """
    messages = (
        db.query(FamilyMessage)
        .filter(
            or_(
                FamilyMessage.sender_parent_id == parent.id,
                FamilyMessage.recipient_parent_id == parent.id,
            )
        )
        .order_by(FamilyMessage.created_at)
        .all()
    )

    threads = {}
    for msg in messages:
        key = msg.child_id or "general"
        if key not in threads:
            threads[key] = {
                "child_id": msg.child_id,
                "child_name": msg.child.first_name if msg.child else None,
                "messages": [],
            }
        threads[key]["messages"].append(
            {
                "id": msg.id,
                "sender_id": msg.sender_parent_id,
                "sender_name": msg.sender.first_name,
                "recipient_id": msg.recipient_parent_id,
                "content": msg.content,
                "created_at": msg.created_at,
            }
        )

    return list(threads.values())
