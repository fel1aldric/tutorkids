import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class FamilyMessage(Base):
    __tablename__ = "family_messages"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_parent_id = Column(CHAR(36), ForeignKey("parents.id"), nullable=False)
    recipient_parent_id = Column(CHAR(36), ForeignKey("parents.id"), nullable=False)
    child_id = Column(CHAR(36), ForeignKey("children.id"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("Parent", foreign_keys=[sender_parent_id], back_populates="sent_messages")
    recipient = relationship("Parent", foreign_keys=[recipient_parent_id], back_populates="received_messages")
    child = relationship("Child", back_populates="family_messages")
