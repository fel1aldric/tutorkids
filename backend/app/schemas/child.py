from pydantic import BaseModel
from datetime import date
from typing import Optional


class ChildBase(BaseModel):
    first_name: str
    birth_date: Optional[date] = None
    school_level_code: Optional[str] = None
    language: str = "fr"
    interests: Optional[str] = None
    learning_style: str = "mixed"


class ChildCreate(ChildBase):
    parent_id: Optional[str] = None


class ChildUpdate(BaseModel):
    first_name: Optional[str] = None
    birth_date: Optional[date] = None
    school_level_code: Optional[str] = None
    language: Optional[str] = None
    interests: Optional[str] = None
    learning_style: Optional[str] = None
    pin: Optional[str] = None


class ChildRead(ChildBase):
    id: str

    class Config:
        from_attributes = True
