from sqlalchemy import Column, String, Integer, Text
from sqlalchemy.orm import relationship
from app.database import Base


class SchoolLevel(Base):
    __tablename__ = "school_levels"

    code = Column(String(50), primary_key=True)
    label = Column(String(100), nullable=False)
    typical_age_min = Column(Integer, nullable=True)
    typical_age_max = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)

    children = relationship("Child", back_populates="school_level")
    curriculum_items = relationship("CurriculumItem", back_populates="school_level", cascade="all, delete-orphan")
