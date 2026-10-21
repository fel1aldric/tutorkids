from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.auth import get_current_parent, get_current_child
from app.models.parent import Parent
from app.models.child import Child
from app.models.focus_session import FocusSession
from app.schemas.focus_session import FocusSessionCreate, FocusSessionUpdate, FocusSessionRead

router = APIRouter(prefix="/focus", tags=["focus"])


def _can_access_child(parent: Parent, child: Child) -> bool:
    return child in parent.children


@router.post("/{child_id}/start", response_model=FocusSessionRead)
def start_session(
    child_id: str,
    payload: FocusSessionCreate,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(parent, child):
        raise HTTPException(status_code=403, detail="Access denied")

    active = db.query(FocusSession).filter(
        FocusSession.child_id == child_id,
        FocusSession.status == "in_progress",
    ).first()
    if active:
        raise HTTPException(status_code=400, detail="A focus session is already active")

    session = FocusSession(
        child_id=child_id,
        duration_minutes=payload.duration_minutes or child.focus_duration_minutes,
        topic=payload.topic,
        agent_role_id=payload.agent_role_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/end", response_model=FocusSessionRead)
def end_session(
    session_id: str,
    payload: FocusSessionUpdate,
    db: Session = Depends(get_db),
):
    session = db.query(FocusSession).filter(FocusSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Session already ended")

    session.status = payload.status or "completed"
    session.summary = payload.summary
    session.ended_at = payload.ended_at or datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


@router.get("/child/{child_id}", response_model=List[FocusSessionRead])
def list_child_sessions(
    child_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(parent, child):
        raise HTTPException(status_code=403, detail="Access denied")

    sessions = (
        db.query(FocusSession)
        .filter(FocusSession.child_id == child_id)
        .order_by(FocusSession.started_at.desc())
        .limit(limit)
        .all()
    )
    return sessions


@router.get("/active", response_model=FocusSessionRead)
def get_active_session(
    db: Session = Depends(get_db),
    child: Child = Depends(get_current_child),
):
    session = db.query(FocusSession).filter(
        FocusSession.child_id == child.id,
        FocusSession.status == "in_progress",
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return session


@router.get("/summary/dashboard", response_model=dict)
def focus_dashboard_summary(
    db: Session = Depends(get_db),
    parent: Parent = Depends(get_current_parent),
):
    result = []
    for child in parent.children:
        sessions = db.query(FocusSession).filter(
            FocusSession.child_id == child.id,
            FocusSession.status == "completed",
        ).order_by(FocusSession.started_at.desc()).limit(5).all()
        total_minutes = sum(s.duration_minutes for s in sessions)
        result.append({
            "child_id": child.id,
            "child_name": child.first_name,
            "total_minutes_7d": total_minutes,
            "sessions_count_7d": len(sessions),
            "last_session": sessions[0].started_at.isoformat() if sessions else None,
        })
    return {"children": result}
