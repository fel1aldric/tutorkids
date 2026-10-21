from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.auth import get_current_parent
from app.models.parent import Parent
from app.models.child import Child
from app.models.event import Event
from app.models.family_message import FamilyMessage
from app.schemas.parent import ParentRead

router = APIRouter(prefix="/parents", tags=["parents"])


@router.get("/me", response_model=ParentRead)
def get_current_parent_info(parent: Parent = Depends(get_current_parent)):
    return parent


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    """Return a daily summary for the connected parent."""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=7)
    day_ago = now - timedelta(days=1)

    today_events = (
        db.query(Event)
        .filter(Event.parent_id == parent.id)
        .filter(and_(Event.start_at >= today_start, Event.start_at < today_end))
        .order_by(Event.start_at)
        .all()
    )

    upcoming_homework = (
        db.query(Event)
        .filter(Event.parent_id == parent.id)
        .filter(Event.event_type == "homework")
        .filter(Event.start_at >= today_start)
        .filter(Event.start_at < week_end)
        .order_by(Event.start_at)
        .all()
    )

    active_reminders = (
        db.query(Event)
        .filter(Event.parent_id == parent.id)
        .filter(Event.event_type == "reminder")
        .filter(Event.start_at >= today_start)
        .filter(Event.start_at < week_end)
        .order_by(Event.start_at)
        .all()
    )

    recent_messages = (
        db.query(FamilyMessage)
        .filter(FamilyMessage.recipient_parent_id == parent.id)
        .filter(FamilyMessage.created_at >= day_ago)
        .order_by(FamilyMessage.created_at.desc())
        .limit(5)
        .all()
    )

    children = parent.children

    def event_card(e: Event) -> dict:
        return {
            "id": e.id,
            "title": e.title,
            "event_type": e.event_type,
            "start_at": e.start_at,
            "end_at": e.end_at,
            "child_id": e.child_id,
            "child_name": e.child.first_name if e.child else None,
        }

    def message_card(m: FamilyMessage) -> dict:
        return {
            "id": m.id,
            "content": m.content,
            "sender_id": m.sender_parent_id,
            "sender_name": m.sender.first_name,
            "child_id": m.child_id,
            "child_name": m.child.first_name if m.child else None,
            "created_at": m.created_at,
        }

    actions = []
    if not today_events:
        actions.append("Aucun événement prévu aujourd'hui — profitez-en pour planifier une activité en famille.")
    for hw in upcoming_homework[:3]:
        actions.append(f"Devoir à venir : {hw.title}")
    for rmd in active_reminders[:3]:
        actions.append(f"Rappel : {rmd.title}")
    if recent_messages:
        actions.append(f"Vous avez {len(recent_messages)} nouveau(x) message(s) familiaux.")

    return {
        "date": today_start.isoformat(),
        "today_events": [event_card(e) for e in today_events],
        "upcoming_homework": [event_card(e) for e in upcoming_homework],
        "active_reminders": [event_card(e) for e in active_reminders],
        "children": [
            {
                "id": c.id,
                "first_name": c.first_name,
                "school_level_code": c.school_level_code,
            }
            for c in children
        ],
        "recent_messages": [message_card(m) for m in recent_messages],
        "recommended_actions": actions,
    }


@router.get("/", response_model=List[ParentRead])
def list_parents(
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    return db.query(Parent).all()


@router.get("/{parent_id}", response_model=ParentRead)
def get_parent(
    parent_id: str,
    db: Session = Depends(get_db),
    current_parent: Parent = Depends(get_current_parent),
):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent


@router.post("/push-token")
def register_push_token(
    payload: dict,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    """Register the current parent's Expo push notification token."""
    token = payload.get("push_token")
    provider = payload.get("push_provider", "expo")
    if not token or not token.startswith("ExponentPushToken["):
        raise HTTPException(status_code=400, detail="Invalid Expo push token")

    parent.push_token = token
    parent.push_provider = provider
    db.commit()
    return {"registered": True}
