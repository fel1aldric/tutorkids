import uuid
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from app.database import Base


class CurriculumItem(Base):
    __tablename__ = "curriculum_items"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_level_code = Column(String(50), ForeignKey("school_levels.code"), nullable=False)
    subject = Column(String(100), nullable=False)
    skill = Column(Text, nullable=False)
    description = Column(Text, nullable=True)

    school_level = relationship("SchoolLevel", back_populates="curriculum_items")
