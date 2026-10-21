from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.auth import get_current_parent
from app.models.parent import Parent
from app.models.child import Child
from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate, EventRead

router = APIRouter(prefix="/events", tags=["events"])


def _can_access_event(parent: Parent, event: Event) -> bool:
    return event.parent_id == parent.id


def _can_access_child(parent: Parent, child_id: Optional[str], db: Session) -> bool:
    if child_id is None:
        return True
    child = db.query(Child).filter(Child.id == child_id).first()
    return child is not None and child in parent.children


@router.post("/", response_model=EventRead)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    if event.child_id and not _can_access_child(parent, event.child_id, db):
        raise HTTPException(status_code=403, detail="Access denied to child")

    db_event = Event(
        parent_id=parent.id,
        child_id=event.child_id,
        title=event.title,
        description=event.description,
        event_type=event.event_type,
        start_at=event.start_at,
        end_at=event.end_at,
        recurrence=event.recurrence,
        is_reminder="1" if event.is_reminder else "0",
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@router.get("/", response_model=List[EventRead])
def list_events(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    child_id: Optional[str] = None,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    query = db.query(Event).filter(Event.parent_id == parent.id)
    if child_id:
        query = query.filter(Event.child_id == child_id)
    if start:
        query = query.filter(Event.start_at >= start)
    if end:
        query = query.filter(Event.start_at <= end)
    return query.order_by(Event.start_at).all()


@router.get("/today", response_model=List[EventRead])
def today_events(
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    now = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = now + timedelta(days=1)
    return (
        db.query(Event)
        .filter(Event.parent_id == parent.id)
        .filter(and_(Event.start_at >= now, Event.start_at < tomorrow))
        .order_by(Event.start_at)
        .all()
    )


@router.get("/{event_id}", response_model=EventRead)
def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not _can_access_event(parent, event):
        raise HTTPException(status_code=403, detail="Access denied")
    return event


@router.put("/{event_id}", response_model=EventRead)
def update_event(
    event_id: str,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not _can_access_event(parent, event):
        raise HTTPException(status_code=403, detail="Access denied")

    if event_update.child_id is not None:
        if not _can_access_child(parent, event_update.child_id, db):
            raise HTTPException(status_code=403, detail="Access denied to child")

    update_data = event_update.model_dump(exclude_unset=True)
    if "is_reminder" in update_data:
        update_data["is_reminder"] = "1" if update_data["is_reminder"] else "0"

    for key, value in update_data.items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}")
def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not _can_access_event(parent, event):
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(event)
    db.commit()
    return {"deleted": True}
