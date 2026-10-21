import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(CHAR(36), ForeignKey("children.id"), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="in_progress")  # in_progress | completed | abandoned
    topic = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    agent_role_id = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    child = relationship("Child", back_populates="focus_sessions")
