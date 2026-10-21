import uuid
from sqlalchemy import Column, String, Text, DateTime, Date, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_id = Column(CHAR(36), ForeignKey("parents.id"), nullable=False)
    child_id = Column(CHAR(36), ForeignKey("children.id"), nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(50), default="activity")  # school, activity, appointment, reminder
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=True)
    recurrence = Column(String(50), nullable=True)  # daily, weekly, monthly
    is_reminder = Column(String(1), default="0")  # "1" if this is a reminder

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    parent = relationship("Parent", back_populates="events")
    child = relationship("Child", back_populates="events")
