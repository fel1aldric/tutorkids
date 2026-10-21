from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth import get_current_parent
from app.models.parent import Parent
from app.models.child import Child
from app.schemas.child import ChildCreate, ChildUpdate, ChildRead
from app.schemas.parent import ParentRead

router = APIRouter(prefix="/children", tags=["children"])


def _can_access_child(parent: Parent, child: Child) -> bool:
    return child in parent.children


@router.post("/", response_model=ChildRead)
def create_child(
    child: ChildCreate,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    data = child.model_dump(exclude={"parent_id"})
    db_child = Child(**data)
    db.add(db_child)
    db.commit()
    db.refresh(db_child)
    parent.children.append(db_child)
    db.commit()
    db.refresh(db_child)
    return db_child


@router.get("/", response_model=List[ChildRead])
def list_children(
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    return parent.children


@router.get("/{child_id}", response_model=ChildRead)
def get_child(
    child_id: str,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(parent, child):
        raise HTTPException(status_code=403, detail="Access denied")
    return child


@router.put("/{child_id}", response_model=ChildRead)
def update_child(
    child_id: str,
    child_update: ChildUpdate,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(parent, child):
        raise HTTPException(status_code=403, detail="Access denied")
    update_data = child_update.model_dump(exclude_unset=True)
    if "pin" in update_data:
        from app.auth import hash_password
        pin_value = update_data.pop("pin")
        child.pin_hash = hash_password(pin_value) if pin_value else None

    for key, value in update_data.items():
        setattr(child, key, value)
    db.commit()
    db.refresh(child)
    return child


@router.delete("/{child_id}")
def delete_child(
    child_id: str,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(parent, child):
        raise HTTPException(status_code=403, detail="Access denied")
    # Remove only the link to the current parent; delete child only if it has no parents left.
    parent.children.remove(child)
    db.commit()
    if not child.parents:
        db.delete(child)
        db.commit()
    return {"deleted": True}


@router.post("/{child_id}/link-parent", response_model=ParentRead)
def link_parent_to_child(
    child_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    """Link an existing parent (identified by email) to a child the current parent can access."""
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(parent, child):
        raise HTTPException(status_code=403, detail="Access denied")

    email = payload.get("parent_email")
    if not email:
        raise HTTPException(status_code=400, detail="parent_email is required")

    target_parent = db.query(Parent).filter(Parent.email == email).first()
    if not target_parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    if target_parent.id == parent.id:
        raise HTTPException(status_code=400, detail="You are already linked to this child")
    if target_parent in child.parents:
        raise HTTPException(status_code=400, detail="Parent already linked to this child")

    child.parents.append(target_parent)
    db.commit()
    db.refresh(target_parent)
    return target_parent
