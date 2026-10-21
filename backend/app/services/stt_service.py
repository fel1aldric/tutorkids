"""
Speech-to-text service.
Priority:
  1. OpenAI Whisper local (if openai-whisper + torch are installed)
  2. OpenAI Whisper API (if OPENAI_API_KEY is set)
  3. Fallback placeholder text
"""

import os
import warnings
from typing import Optional

from app.config import get_settings


class STTService:
    def __init__(self):
        self.settings = get_settings()
        self._whisper_model = None
        self._model_name = "base"
        self._load_local_whisper()

    def _load_local_whisper(self):
        try:
            import whisper

            warnings.filterwarnings("ignore", category=UserWarning)
            self._whisper_model = whisper.load_model(self._model_name)
        except Exception as exc:
            print(f"[STT] Local Whisper not available: {exc}")
            self._whisper_model = None

    def _has_openai_key(self) -> bool:
        return bool(os.getenv("OPENAI_API_KEY"))

    def _transcribe_with_openai(self, audio_path: str) -> str:
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        with open(audio_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="fr",
            )
        return transcript.text.strip()

    def transcribe(self, audio_path: str) -> str:
        if self._whisper_model is not None:
            try:
                result = self._whisper_model.transcribe(audio_path, language="fr")
                return result.get("text", "").strip()
            except Exception as exc:
                print(f"[STT] Local Whisper failed: {exc}")

        if self._has_openai_key():
            try:
                return self._transcribe_with_openai(audio_path)
            except Exception as exc:
                print(f"[STT] OpenAI Whisper API failed: {exc}")

        return "[Transcription non disponible : Whisper local non installé et aucune clé OpenAI configurée.]"


def get_stt_service() -> STTService:
    return STTService()
