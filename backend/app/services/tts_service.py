"""
Text-to-speech service using free local engines.
Priority:
  1. Piper TTS local (if piper-tts + voice model are installed)
  2. pyttsx3 local fallback (free, uses espeak)
  3. No audio returned
No paid API is used.
"""

import os
import uuid
from pathlib import Path
from typing import Dict, Optional, Any

from app.config import get_settings


PIPER_INSTALL_HELP = (
    "Piper n'est pas installé ou la voix est manquante. "
    "Lancez le setup vocal : ./scripts/setup_voice.sh"
)


class TTSService:
    def __init__(self):
        self.settings = get_settings()
        self.audio_dir = Path("./audio_outputs")
        self.audio_dir.mkdir(exist_ok=True)
        self._piper = None
        self._piper_error: Optional[str] = None
        self._load_piper()

    def _load_piper(self):
        voice_name = self.settings.tts_voice
        model_path = Path(f"{voice_name}.onnx")
        config_path = Path(f"{voice_name}.onnx.json")

        if not model_path.exists():
            model_path = Path("voices") / f"{voice_name}.onnx"
            config_path = Path("voices") / f"{voice_name}.onnx.json"

        try:
            from piper import PiperVoice
        except ImportError:
            self._piper_error = PIPER_INSTALL_HELP
            print(f"[TTS] {self._piper_error}")
            return

        if not model_path.exists():
            self._piper_error = f"Voix Piper introuvable : {voice_name}.onnx. {PIPER_INSTALL_HELP}"
            print(f"[TTS] {self._piper_error}")
            return

        try:
            self._piper = PiperVoice.load(
                str(model_path),
                config_path=str(config_path) if config_path.exists() else None,
            )
        except Exception as exc:
            self._piper_error = f"Piper indisponible : {exc}"
            print(f"[TTS] {self._piper_error}")
            self._piper = None

    def is_piper_available(self) -> bool:
        return self._piper is not None

    def status(self) -> Dict[str, Any]:
        piper_ok = self.is_piper_available()
        active_provider = "piper" if piper_ok else ("pyttsx3" if self._pyttsx3_available() else "none")
        return {
            "available": piper_ok or self._pyttsx3_available(),
            "provider": active_provider,
            "voice": self.settings.tts_voice,
            "message": (
                "Prêt" if piper_ok else (self._piper_error or PIPER_INSTALL_HELP)
            ),
        }

    def _pyttsx3_available(self) -> bool:
        try:
            import pyttsx3

            pyttsx3.init()
            return True
        except Exception:
            return False

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

        # 2. Try pyttsx3 free local fallback
        if self._synthesize_with_pyttsx3(text, output_path):
            return f"/audio/{filename}"

        print("[TTS] No local TTS provider available.")
        return None


def get_tts_service() -> TTSService:
    return TTSService()
