from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str = "activity"
    start_at: datetime
    end_at: Optional[datetime] = None
    recurrence: Optional[str] = None
    is_reminder: bool = False
    child_id: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    recurrence: Optional[str] = None
    is_reminder: Optional[bool] = None
    child_id: Optional[str] = None


class EventRead(EventBase):
    id: str
    parent_id: str

    class Config:
        from_attributes = True
