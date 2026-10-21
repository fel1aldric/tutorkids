import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = Column(CHAR(36), ForeignKey("children.id"), nullable=True)
    parent_id = Column(CHAR(36), ForeignKey("parents.id"), nullable=True)
    role_id = Column(String(50), nullable=False)
    user_message = Column(Text, nullable=False)
    agent_response = Column(Text, nullable=True)
    audio_input_url = Column(String(500), nullable=True)
    audio_output_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    child = relationship("Child", back_populates="conversations")
    parent = relationship("Parent", back_populates="conversations")
