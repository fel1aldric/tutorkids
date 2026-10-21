from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth import get_current_parent
from app.models.parent import Parent
from app.models.child import Child
from app.schemas.child import ChildCreate, ChildUpdate, ChildRead

router = APIRouter(prefix="/children", tags=["children"])


def _can_access_child(parent: Parent, child: Child) -> bool:
    return child.parent_id == parent.id


@router.post("/", response_model=ChildRead)
def create_child(
    child: ChildCreate,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    data = child.model_dump()
    data["parent_id"] = parent.id
    db_child = Child(**data)
    db.add(db_child)
    db.commit()
    db.refresh(db_child)
    return db_child


@router.get("/", response_model=List[ChildRead])
def list_children(
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    return db.query(Child).filter(Child.parent_id == parent.id).all()


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
    for key, value in child_update.model_dump(exclude_unset=True).items():
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
    db.delete(child)
    db.commit()
    return {"deleted": True}
