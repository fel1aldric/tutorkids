from pydantic import BaseModel
from typing import Optional


class AgentMessageRequest(BaseModel):
    role_id: str
    message: str
    child_id: Optional[str] = None
    parent_id: Optional[str] = None
    voice: bool = False


class AgentMessageResponse(BaseModel):
    role_id: str
    response_text: str
    response_audio_url: Optional[str] = None
