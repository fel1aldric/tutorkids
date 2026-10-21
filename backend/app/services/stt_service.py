"""
Speech-to-text service using OpenAI Whisper locally.
Whisper is a free, open-source model from OpenAI that runs locally.
No OpenAI API key is used.
"""

import warnings
from typing import Dict, Optional, Any

from app.config import get_settings


WHISPER_INSTALL_HELP = (
    "Whisper n'est pas installé. Lancez le setup vocal : ./scripts/setup_voice.sh"
)


class STTService:
    def __init__(self):
        self.settings = get_settings()
        self._whisper_model = None
        self._model_name = "base"
        self._load_error: Optional[str] = None
        self._load_model()

    def _load_model(self):
        try:
            import whisper

            warnings.filterwarnings("ignore", category=UserWarning)
            self._whisper_model = whisper.load_model(self._model_name)
        except ImportError:
            self._load_error = WHISPER_INSTALL_HELP
            print(f"[STT] {self._load_error}")
        except Exception as exc:
            self._load_error = f"Whisper indisponible : {exc}"
            print(f"[STT] {self._load_error}")
            self._whisper_model = None

    def is_available(self) -> bool:
        return self._whisper_model is not None

    def status(self) -> Dict[str, Any]:
        return {
            "available": self.is_available(),
            "provider": "whisper_local",
            "model": self._model_name,
            "message": (
                "Prêt" if self.is_available() else (self._load_error or WHISPER_INSTALL_HELP)
            ),
        }

    def transcribe(self, audio_path: str) -> str:
        if self._whisper_model is None:
            return f"[{self._load_error or WHISPER_INSTALL_HELP}]"

        try:
            result = self._whisper_model.transcribe(audio_path, language="fr")
            return result.get("text", "").strip()
        except Exception as exc:
            return f"[Erreur de transcription locale : {exc}]"


def get_stt_service() -> STTService:
    return STTService()
