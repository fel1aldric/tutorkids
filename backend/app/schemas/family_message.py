from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class FamilyMessageBase(BaseModel):
    content: str
    child_id: Optional[str] = None


class FamilyMessageCreate(FamilyMessageBase):
    recipient_parent_id: str


class FamilyMessageRead(FamilyMessageBase):
    id: str
    sender_parent_id: str
    recipient_parent_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
