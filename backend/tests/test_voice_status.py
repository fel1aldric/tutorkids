from app.services.stt_service import STTService, WHISPER_INSTALL_HELP
from app.services.tts_service import TTSService, PIPER_INSTALL_HELP


def test_stt_status_reports_unavailable_without_whisper():
    service = STTService()
    # In CI/test environment Whisper is usually not installed.
    assert service.is_available() is False
    status = service.status()
    assert status["available"] is False
    assert status["provider"] == "whisper_local"
    assert WHISPER_INSTALL_HELP in status["message"]


def test_tts_status_reports_fallback_when_piper_missing():
    service = TTSService()
    status = service.status()
    # We do not assert availability because pyttsx3 may or may not be usable
    # in the test environment; we only check the status structure.
    assert "available" in status
    assert "provider" in status
    assert "voice" in status
    assert "message" in status
    if not service.is_piper_available():
        assert PIPER_INSTALL_HELP in status["message"]
