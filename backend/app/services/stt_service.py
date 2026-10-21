"""
Speech-to-text service placeholder.

In development, you can use openai-whisper locally:
  import whisper
  model = whisper.load_model("base")
  result = model.transcribe(audio_path)

Or connect to an external provider later.
"""


class STTService:
    def transcribe(self, audio_path: str) -> str:
        # Placeholder: return dummy text.
        # Replace with real whisper integration once audio files are handled.
        return "[Transcription vocale non activée en mode placeholder]"


def get_stt_service() -> STTService:
    return STTService()
