from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.conversation import Conversation


def get_conversation_history(
    db: Session,
    role_id: str,
    child_id: str = None,
    parent_id: str = None,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    query = db.query(Conversation).filter(Conversation.role_id == role_id)
    if child_id:
        query = query.filter(Conversation.child_id == child_id)
    if parent_id:
        query = query.filter(Conversation.parent_id == parent_id)

    rows = (
        query.order_by(Conversation.created_at.desc())
        .limit(limit)
        .all()
    )

    history = []
    for row in reversed(rows):
        history.append({"role": "user", "content": row.user_message})
        if row.agent_response:
            history.append({"role": "assistant", "content": row.agent_response})
    return history
