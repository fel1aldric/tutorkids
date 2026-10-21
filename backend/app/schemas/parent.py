from pydantic import BaseModel, EmailStr
from typing import Optional


class ParentBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: Optional[str] = None


class ParentCreate(ParentBase):
    password: str


class ParentRead(ParentBase):
    id: str
    push_token: Optional[str] = None
    push_provider: Optional[str] = None

    class Config:
        from_attributes = True
