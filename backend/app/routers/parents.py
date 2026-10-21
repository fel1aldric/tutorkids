from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth import get_current_parent
from app.models.parent import Parent
from app.schemas.parent import ParentRead

router = APIRouter(prefix="/parents", tags=["parents"])


@router.get("/me", response_model=ParentRead)
def get_current_parent_info(parent: Parent = Depends(get_current_parent)):
    return parent


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
