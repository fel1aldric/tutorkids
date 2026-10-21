from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.agent import AgentMessageRequest, AgentMessageResponse
from app.services.llm_service import get_agent_runner
from app.services.tts_service import get_tts_service
from app.agents.engine.memory import get_conversation_history
from app.models.child import Child
from app.models.parent import Parent
from app.models.conversation import Conversation

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/roles")
def list_roles():
    runner = get_agent_runner()
    return {"roles": runner.list_roles()}


@router.post("/chat", response_model=AgentMessageResponse)
def chat(request: AgentMessageRequest, db: Session = Depends(get_db)):
    runner = get_agent_runner()

    if request.role_id not in runner.roles:
        raise HTTPException(status_code=404, detail=f"Role {request.role_id} not found")

    child = None
    parent = None

    if request.child_id:
        child = db.query(Child).filter(Child.id == request.child_id).first()
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")

    if request.parent_id:
        parent = db.query(Parent).filter(Parent.id == request.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent not found")

    history = get_conversation_history(
        db,
        role_id=request.role_id,
        child_id=request.child_id,
        parent_id=request.parent_id,
        limit=10,
    )

    response_text = runner.run(
        role_id=request.role_id,
        message=request.message,
        db=db,
        child=child,
        parent=parent,
        conversation_history=history,
    )

    audio_url = None
    if request.voice:
        tts = get_tts_service()
        audio_url = tts.synthesize(response_text)

    conversation = Conversation(
        child_id=request.child_id,
        parent_id=request.parent_id,
        role_id=request.role_id,
        user_message=request.message,
        agent_response=response_text,
        audio_output_url=audio_url,
    )
    db.add(conversation)
    db.commit()

    return AgentMessageResponse(
        role_id=request.role_id,
        response_text=response_text,
        response_audio_url=audio_url,
    )
