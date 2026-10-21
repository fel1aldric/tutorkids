from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_secret_key: str = "change-me-in-production"
    app_env: str = "development"

    database_url: str = "sqlite:///./tutorkids_dev.db"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "gpt-oss:20b"

    tts_provider: str = "piper"
    tts_voice: str = "fr_FR-siwis-medium"

    stt_provider: str = "whisper"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
