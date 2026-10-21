"""
Text-to-speech service.
Priority:
  1. Piper local (if piper-tts + voice model are installed)
  2. OpenAI TTS API (if OPENAI_API_KEY is set)
  3. pyttsx3 local synthesis (if installed)
  4. No audio returned
"""

import os
import uuid
from pathlib import Path
from typing import Optional

from app.config import get_settings


class TTSService:
    def __init__(self):
        self.settings = get_settings()
        self.audio_dir = Path("./audio_outputs")
        self.audio_dir.mkdir(exist_ok=True)
        self._piper = None
        self._load_piper()

    def _load_piper(self):
        try:
            from piper import PiperVoice

            voice_name = self.settings.tts_voice
            model_path = Path(f"{voice_name}.onnx")
            config_path = Path(f"{voice_name}.onnx.json")

            if not model_path.exists():
                model_path = Path("voices") / f"{voice_name}.onnx"
                config_path = Path("voices") / f"{voice_name}.onnx.json"

            if not model_path.exists():
                print(f"[TTS] Piper model not found: {voice_name}.onnx")
                return

            self._piper = PiperVoice.load(
                str(model_path),
                config_path=str(config_path) if config_path.exists() else None,
            )
        except Exception as exc:
            print(f"[TTS] Piper not available: {exc}")
            self._piper = None

    def _has_openai_key(self) -> bool:
        return bool(os.getenv("OPENAI_API_KEY"))

    def _synthesize_with_openai(self, text: str, output_path: Path) -> bool:
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text,
        )
        response.stream_to_file(str(output_path))
        return True

    def _synthesize_with_pyttsx3(self, text: str, output_path: Path) -> bool:
        try:
            import pyttsx3

            engine = pyttsx3.init()
            engine.save_to_file(text, str(output_path))
            engine.runAndWait()
            return True
        except Exception as exc:
            print(f"[TTS] pyttsx3 failed: {exc}")
            return False

    def synthesize(self, text: str, voice: Optional[str] = None) -> Optional[str]:
        if not text or not text.strip():
            return None

        filename = f"{uuid.uuid4()}.wav"
        output_path = self.audio_dir / filename

        # 1. Try Piper local
        if self._piper is not None:
            try:
                self._piper.synthesize(text, str(output_path))
                return f"/audio/{filename}"
            except Exception as exc:
                print(f"[TTS] Piper synthesis failed: {exc}")

        # 2. Try OpenAI TTS API
        if self._has_openai_key():
            try:
                self._synthesize_with_openai(text, output_path)
                return f"/audio/{filename}"
            except Exception as exc:
                print(f"[TTS] OpenAI TTS failed: {exc}")

        # 3. Try pyttsx3 fallback
        if self._synthesize_with_pyttsx3(text, output_path):
            return f"/audio/{filename}"

        print("[TTS] No TTS provider available.")
        return None


def get_tts_service() -> TTSService:
    return TTSService()
