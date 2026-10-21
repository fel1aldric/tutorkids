import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Parent(Base):
    __tablename__ = "parents"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    push_token = Column(String(255), nullable=True)
    push_provider = Column(String(50), default="expo")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    children = relationship(
        "Child", secondary="parent_child_links", back_populates="parents"
    )
    conversations = relationship("Conversation", back_populates="parent")
    events = relationship("Event", back_populates="parent", cascade="all, delete-orphan")
    sent_messages = relationship(
        "FamilyMessage", foreign_keys="FamilyMessage.sender_parent_id", back_populates="sender"
    )
    received_messages = relationship(
        "FamilyMessage", foreign_keys="FamilyMessage.recipient_parent_id", back_populates="recipient"
    )
