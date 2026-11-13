from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_secret_key: str = "change-me-in-production"
    app_env: str = "development"

    database_url: str = "sqlite:///./tutorkids_dev.db"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "gpt-oss:20b-cloud"

    tts_provider: str = "piper"
    tts_voice: str = "fr_FR-siwis-medium"

    stt_provider: str = "whisper"

    # Audio outputs retention in hours. Files older than this are deleted locally.
    # Set to 0 to disable cleanup, None to keep forever (not recommended).
    tts_retention_hours: int = 24

    n8n_instance_webhook: str = "https://tutorkids.app.n8n.cloud/webhook-test/81bc0def-9ad7-4980-aed5-8a51a55a0fc6"
@lru_cache()
def get_settings() -> Settings:
    return Settings()
