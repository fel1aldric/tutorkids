import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Child(Base):
    __tablename__ = "children"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_id = Column(CHAR(36), ForeignKey("parents.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    birth_date = Column(Date, nullable=True)
    school_level_code = Column(String(50), ForeignKey("school_levels.code"), nullable=True)
    language = Column(String(10), default="fr")
    interests = Column(Text, nullable=True)
    learning_style = Column(String(50), default="mixed")
    pin_hash = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    parent = relationship("Parent", back_populates="children")
    school_level = relationship("SchoolLevel", back_populates="children")
    conversations = relationship("Conversation", back_populates="child", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="child", cascade="all, delete-orphan")
