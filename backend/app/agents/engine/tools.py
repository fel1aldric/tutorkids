"""
Tools available to agents. These are simple functions that agents can use
via the agent runner to interact with the database.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.child import Child
from app.models.curriculum import CurriculumItem


def get_today_events(db: Session, parent_id: str) -> List[Event]:
    now = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = now + timedelta(days=1)
    return (
        db.query(Event)
        .filter(Event.parent_id == parent_id)
        .filter(Event.start_at >= now)
        .filter(Event.start_at < tomorrow)
        .order_by(Event.start_at)
        .all()
    )


def get_week_events(db: Session, parent_id: str) -> List[Event]:
    now = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    week_later = now + timedelta(days=7)
    return (
        db.query(Event)
        .filter(Event.parent_id == parent_id)
        .filter(Event.start_at >= now)
        .filter(Event.start_at < week_later)
        .order_by(Event.start_at)
        .all()
    )


def add_event(
    db: Session,
    parent_id: str,
    title: str,
    start_at: datetime,
    end_at: Optional[datetime] = None,
    description: Optional[str] = None,
    event_type: str = "activity",
    child_id: Optional[str] = None,
    recurrence: Optional[str] = None,
) -> Event:
    is_reminder = "1" if event_type and event_type.lower() == "reminder" else "0"
    event = Event(
        parent_id=parent_id,
        child_id=child_id,
        title=title,
        description=description,
        event_type=event_type,
        start_at=start_at,
        end_at=end_at,
        recurrence=recurrence,
        is_reminder=is_reminder,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_child_profile(db: Session, child_id: str) -> Optional[Child]:
    return db.query(Child).filter(Child.id == child_id).first()


def get_children_for_parent(db: Session, parent_id: str) -> List[Child]:
    return db.query(Child).filter(Child.parent_id == parent_id).order_by(Child.first_name).all()


def get_curriculum_for_level(db: Session, school_level_code: str) -> List[CurriculumItem]:
    return (
        db.query(CurriculumItem)
        .filter(CurriculumItem.school_level_code == school_level_code)
        .all()
    )


def format_event(event: Event) -> str:
    child_name = event.child.first_name if event.child else "toute la famille"
    time_str = event.start_at.strftime("%H:%M")
    return f"- {time_str} : {event.title} ({child_name})"
