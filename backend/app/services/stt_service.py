"""
Speech-to-text service using OpenAI Whisper locally.
Whisper is a free, open-source model from OpenAI that runs locally.
No OpenAI API key is used.
"""

import warnings
from typing import Optional

from app.config import get_settings


class STTService:
    def __init__(self):
        self.settings = get_settings()
        self._whisper_model = None
        self._model_name = "base"
        self._load_model()

    def _load_model(self):
        try:
            import whisper

            warnings.filterwarnings("ignore", category=UserWarning)
            self._whisper_model = whisper.load_model(self._model_name)
        except Exception as exc:
            print(f"[STT] Local Whisper not available: {exc}")
            self._whisper_model = None

    def transcribe(self, audio_path: str) -> str:
        if self._whisper_model is None:
            return (
                "[Transcription locale non disponible. "
                "Installez Whisper gratuitement avec : pip install openai-whisper]"
            )

        try:
            result = self._whisper_model.transcribe(audio_path, language="fr")
            return result.get("text", "").strip()
        except Exception as exc:
            return f"[Erreur de transcription locale : {exc}]"


def get_stt_service() -> STTService:
    return STTService()
