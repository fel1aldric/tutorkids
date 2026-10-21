"""
Authentication utilities for parents and children.
Uses JWT tokens and bcrypt for password hashing.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.parent import Parent
from app.models.child import Child

security = HTTPBearer()


def _import_bcrypt():
    import bcrypt

    return bcrypt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    bcrypt = _import_bcrypt()
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def hash_password(password: str) -> str:
    bcrypt = _import_bcrypt()
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.app_secret_key, algorithm="HS256")


def decode_token(token: str) -> Optional[dict]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.app_secret_key, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


def get_current_parent(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Parent:
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None or payload.get("type") != "parent":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing parent token",
        )
    parent_id = payload.get("sub")
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if parent is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Parent not found",
        )
    return parent


def get_current_child_or_parent(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing token",
        )

    user_id = payload.get("sub")
    user_type = payload.get("type")

    if user_type == "parent":
        parent = db.query(Parent).filter(Parent.id == user_id).first()
        if parent is None:
            raise HTTPException(status_code=401, detail="Parent not found")
        return {"type": "parent", "user": parent}

    if user_type == "child":
        child = db.query(Child).filter(Child.id == user_id).first()
        if child is None:
            raise HTTPException(status_code=401, detail="Child not found")
        return {"type": "child", "user": child}

    raise HTTPException(status_code=401, detail="Invalid token type")
