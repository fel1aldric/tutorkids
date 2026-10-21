"""
Text-to-speech service placeholder.

In production/local mode, use Piper TTS:
  from piper import PiperVoice
  voice = PiperVoice.load("fr_FR-siwis-medium.onnx")
  audio = voice.synthesize_speech(text)

For now, this returns an empty path. Integrate once Piper is installed.
"""

from app.config import get_settings


class TTSService:
    def __init__(self):
        self.settings = get_settings()

    def synthesize(self, text: str, voice: str = None) -> str:
        # Placeholder: returns no audio URL.
        # Replace with real Piper or pyttsx3 integration.
        return ""


def get_tts_service() -> TTSService:
    return TTSService()
