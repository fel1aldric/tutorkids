from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import verify_password, create_access_token, hash_password
from app.models.parent import Parent
from app.models.child import Child
from app.schemas.parent import ParentCreate, ParentRead
from app.schemas.auth import ParentLoginRequest, ChildLoginRequest, ChildPinLoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register-parent", response_model=ParentRead)
def register_parent(parent: ParentCreate, db: Session = Depends(get_db)):
    existing = db.query(Parent).filter(Parent.email == parent.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    db_parent = Parent(
        email=parent.email,
        first_name=parent.first_name,
        last_name=parent.last_name,
        hashed_password=hash_password(parent.password),
    )
    db.add(db_parent)
    db.commit()
    db.refresh(db_parent)
    return db_parent


@router.post("/login-parent")
def login_parent(payload: ParentLoginRequest, db: Session = Depends(get_db)):
    parent = db.query(Parent).filter(Parent.email == payload.email).first()
    if parent is None or not verify_password(payload.password, parent.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": parent.id, "type": "parent"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": parent.id,
            "email": parent.email,
            "first_name": parent.first_name,
        },
    }


@router.post("/login-child")
def login_child(payload: ChildLoginRequest, db: Session = Depends(get_db)):
    """
    Children log in with their UUID in this MVP.
    In production, use a PIN chosen by the parent.
    """
    child = db.query(Child).filter(Child.id == payload.child_id).first()
    if child is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Child not found",
        )

    token = create_access_token({"sub": child.id, "type": "child"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": child.id,
            "first_name": child.first_name,
            "school_level_code": child.school_level_code,
        },
    }


@router.post("/login-child-pin")
def login_child_pin(payload: ChildPinLoginRequest, db: Session = Depends(get_db)):
    """
    Children log in with parent email + a PIN chosen by the parent.
    """
    parent = db.query(Parent).filter(Parent.email == payload.parent_email).first()
    if parent is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Parent not found",
        )

    child = (
        db.query(Child)
        .filter(Child.id == payload.child_id, Child.parent_id == parent.id)
        .first()
    )
    if child is None or child.pin_hash is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Child not found or PIN not set",
        )

    if not verify_password(payload.pin, child.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN",
        )

    token = create_access_token({"sub": child.id, "type": "child"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": child.id,
            "first_name": child.first_name,
            "school_level_code": child.school_level_code,
        },
    }
