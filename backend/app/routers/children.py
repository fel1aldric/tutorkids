from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.child import Child
from app.schemas.child import ChildCreate, ChildUpdate, ChildRead

router = APIRouter(prefix="/children", tags=["children"])


@router.post("/", response_model=ChildRead)
def create_child(child: ChildCreate, db: Session = Depends(get_db)):
    db_child = Child(**child.model_dump())
    db.add(db_child)
    db.commit()
    db.refresh(db_child)
    return db_child


@router.get("/", response_model=List[ChildRead])
def list_children(db: Session = Depends(get_db)):
    return db.query(Child).all()


@router.get("/{child_id}", response_model=ChildRead)
def get_child(child_id: str, db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return child


@router.put("/{child_id}", response_model=ChildRead)
def update_child(child_id: str, child_update: ChildUpdate, db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    for key, value in child_update.model_dump(exclude_unset=True).items():
        setattr(child, key, value)
    db.commit()
    db.refresh(child)
    return child


@router.delete("/{child_id}")
def delete_child(child_id: str, db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    db.delete(child)
    db.commit()
    return {"deleted": True}
