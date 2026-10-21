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
from app.models.family_message import FamilyMessage
from app.models.parent import Parent


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
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        return []
    return sorted(parent.children, key=lambda c: c.first_name)


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


def _get_linked_parents(db: Session, parent_id: str) -> List[Parent]:
    from app.models.child import Child, parent_child_links

    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        return []
    own_child_ids = [c.id for c in parent.children]
    if not own_child_ids:
        return []
    return (
        db.query(Parent)
        .join(parent_child_links, parent_child_links.c.parent_id == Parent.id)
        .filter(parent_child_links.c.child_id.in_(own_child_ids))
        .filter(Parent.id != parent_id)
        .distinct()
        .all()
    )


def send_message_to_parents(
    db: Session,
    sender_parent_id: str,
    content: str,
    child_id: Optional[str] = None,
) -> str:
    """Send a message to every parent linked through shared children."""
    recipients = _get_linked_parents(db, sender_parent_id)
    if not recipients:
        return "Aucun autre parent lié à votre famille. Le message n'a pas été envoyé."

    for recipient in recipients:
        msg = FamilyMessage(
            sender_parent_id=sender_parent_id,
            recipient_parent_id=recipient.id,
            child_id=child_id,
            content=content,
        )
        db.add(msg)
    db.commit()

    child_hint = f" concernant {child_id}" if child_id else ""
    return f"Message envoyé à {len(recipients)} parent(s){child_hint}."
