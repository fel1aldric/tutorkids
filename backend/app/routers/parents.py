from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.parent import Parent
from app.schemas.parent import ParentCreate, ParentRead

router = APIRouter(prefix="/parents", tags=["parents"])


@router.post("/", response_model=ParentRead)
def create_parent(parent: ParentCreate, db: Session = Depends(get_db)):
    db_parent = Parent(
        email=parent.email,
        first_name=parent.first_name,
        last_name=parent.last_name,
        hashed_password=parent.password,  # TODO: hash password in real app
    )
    db.add(db_parent)
    db.commit()
    db.refresh(db_parent)
    return db_parent


@router.get("/", response_model=List[ParentRead])
def list_parents(db: Session = Depends(get_db)):
    return db.query(Parent).all()


@router.get("/{parent_id}", response_model=ParentRead)
def get_parent(parent_id: str, db: Session = Depends(get_db)):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    return parent
