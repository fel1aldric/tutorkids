"""
Text-to-speech service using free local engines.
Priority:
  1. Piper TTS local (if piper-tts + voice model are installed)
  2. pyttsx3 local fallback (free, uses espeak)
  3. No audio returned
No paid API is used.
"""

import re
import uuid
import wave
from pathlib import Path
from typing import Dict, Optional, Any

from app.config import get_settings


PIPER_INSTALL_HELP = (
    "Piper n'est pas installé ou la voix est manquante. "
    "Lancez le setup vocal : ./scripts/setup_voice.sh"
)


def clean_for_speech(text: str) -> str:
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[\U00010000-\U0010ffff\u2600-\u27BF\uFE0F]", "", text)  # emojis
    text = re.sub(r"^\s*#+\s*", "", text, flags=re.M)                       # titres
    text = re.sub(r"^\s*[-*•]\s+", "", text, flags=re.M)                    # puces
    text = re.sub(r"[*_`>~|]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


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
        except ImportError as exc:
            self._piper_error = f"{PIPER_INSTALL_HELP} ({exc})"
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
            print(f"[TTS] Piper chargé : {model_path}")
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
            "message": "Prêt" if piper_ok else (self._piper_error or PIPER_INSTALL_HELP),
        }

    def _pyttsx3_available(self) -> bool:
        try:
            import pyttsx3

            pyttsx3.init()
            return True
        except Exception:
            return False

    def _synthesize_with_piper(self, text: str, output_path: Path) -> None:
        with wave.open(str(output_path), "wb") as wav_file:
            if hasattr(self._piper, "synthesize_wav"):  # piper-tts >= 1.3
                self._piper.synthesize_wav(text, wav_file)
            else:  # piper-tts 1.2
                self._piper.synthesize(text, wav_file)

    def _synthesize_with_pyttsx3(self, text: str, output_path: Path) -> bool:
        try:
            import pyttsx3

            engine = pyttsx3.init()
            for v in engine.getProperty("voices"):
                ident = f"{v.id} {v.name}".lower()
                if "french" in ident or "/fr" in ident or ident.endswith("fr"):
                    engine.setProperty("voice", v.id)
                    break
            engine.setProperty("rate", 150)
            engine.save_to_file(text, str(output_path))
            engine.runAndWait()
            return output_path.exists() and output_path.stat().st_size > 0
        except Exception as exc:
            print(f"[TTS] pyttsx3 failed: {exc}")
            return False

    def synthesize(self, text: str, voice: Optional[str] = None) -> Optional[str]:
        text = clean_for_speech(text or "")
        if not text:
            return None

        filename = f"{uuid.uuid4()}.wav"
        output_path = self.audio_dir / filename

        # 1. Piper local
        if self._piper is not None:
            try:
                self._synthesize_with_piper(text, output_path)
                return f"/audio/{filename}"
            except Exception as exc:
                print(f"[TTS] Piper synthesis failed: {exc}")

        # 2. pyttsx3 (fallback)
        if self._synthesize_with_pyttsx3(text, output_path):
            return f"/audio/{filename}"

        print("[TTS] No local TTS provider available.")
        return None


def get_tts_service() -> TTSService:
    return TTSService()