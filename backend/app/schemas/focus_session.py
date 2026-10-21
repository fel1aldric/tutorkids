from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class FocusSessionBase(BaseModel):
    duration_minutes: int
    topic: Optional[str] = None
    agent_role_id: Optional[str] = None


class FocusSessionCreate(FocusSessionBase):
    pass


class FocusSessionUpdate(BaseModel):
    status: Optional[str] = None
    summary: Optional[str] = None
    ended_at: Optional[datetime] = None


class FocusSessionRead(FocusSessionBase):
    id: str
    child_id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str
    summary: Optional[str] = None

    class Config:
        from_attributes = True
