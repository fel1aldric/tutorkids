from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.schemas.agent import AgentMessageRequest, AgentMessageResponse
from app.services.llm_service import get_agent_runner
from app.services.tts_service import get_tts_service
from app.services.stt_service import get_stt_service
from app.agents.engine.memory import get_conversation_history
from app.models.child import Child
from app.models.parent import Parent
from app.models.conversation import Conversation
import tempfile
import os

router = APIRouter(prefix="/agents", tags=["agents"])


def _run_agent_chat(
    db: Session,
    role_id: str,
    message: str,
    child_id: Optional[str] = None,
    parent_id: Optional[str] = None,
    voice: bool = False,
    audio_input_url: Optional[str] = None,
) -> AgentMessageResponse:
    runner = get_agent_runner()

    if role_id not in runner.roles:
        raise HTTPException(status_code=404, detail=f"Role {role_id} not found")

    child = None
    parent = None

    if child_id:
        child = db.query(Child).filter(Child.id == child_id).first()
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")

    if parent_id:
        parent = db.query(Parent).filter(Parent.id == parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent not found")

    history = get_conversation_history(
        db,
        role_id=role_id,
        child_id=child_id,
        parent_id=parent_id,
        limit=10,
    )

    response_text = runner.run(
        role_id=role_id,
        message=message,
        db=db,
        child=child,
        parent=parent,
        conversation_history=history,
    )

    audio_url = None
    if voice:
        tts = get_tts_service()
        audio_url = tts.synthesize(response_text)

    conversation = Conversation(
        child_id=child_id,
        parent_id=parent_id,
        role_id=role_id,
        user_message=message,
        agent_response=response_text,
        audio_input_url=audio_input_url,
        audio_output_url=audio_url,
    )
    db.add(conversation)
    db.commit()

    return AgentMessageResponse(
        role_id=role_id,
        response_text=response_text,
        response_audio_url=audio_url,
    )


@router.get("/roles")
def list_roles():
    runner = get_agent_runner()
    return {"roles": runner.list_roles()}


@router.post("/chat", response_model=AgentMessageResponse)
def chat(request: AgentMessageRequest, db: Session = Depends(get_db)):
    return _run_agent_chat(
        db=db,
        role_id=request.role_id,
        message=request.message,
        child_id=request.child_id,
        parent_id=request.parent_id,
        voice=request.voice,
    )


@router.post("/chat-voice", response_model=AgentMessageResponse)
def chat_voice(
    role_id: str = Form(...),
    child_id: Optional[str] = Form(None),
    parent_id: Optional[str] = Form(None),
    voice: bool = Form(True),
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    stt = get_stt_service()

    suffix = os.path.splitext(audio_file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = audio_file.file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        transcribed_message = stt.transcribe(tmp_path)
    finally:
        os.unlink(tmp_path)

    return _run_agent_chat(
        db=db,
        role_id=role_id,
        message=transcribed_message,
        child_id=child_id,
        parent_id=parent_id,
        voice=voice,
        audio_input_url=None,
    )
