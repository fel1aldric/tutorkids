import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text, Table, Integer
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


parent_child_links = Table(
    "parent_child_links",
    Base.metadata,
    Column("parent_id", CHAR(36), ForeignKey("parents.id"), primary_key=True),
    Column("child_id", CHAR(36), ForeignKey("children.id"), primary_key=True),
)


class Child(Base):
    __tablename__ = "children"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name = Column(String(100), nullable=False)
    birth_date = Column(Date, nullable=True)
    school_level_code = Column(String(50), ForeignKey("school_levels.code"), nullable=True)
    language = Column(String(10), default="fr")
    interests = Column(Text, nullable=True)
    learning_style = Column(String(50), default="mixed")
    pin_hash = Column(String(255), nullable=True)
    focus_duration_minutes = Column(Integer, default=15, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    parents = relationship(
        "Parent", secondary=parent_child_links, back_populates="children"
    )
    school_level = relationship("SchoolLevel", back_populates="children")
    conversations = relationship("Conversation", back_populates="child", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="child", cascade="all, delete-orphan")
    family_messages = relationship("FamilyMessage", back_populates="child")
    focus_sessions = relationship("FocusSession", back_populates="child", cascade="all, delete-orphan")
