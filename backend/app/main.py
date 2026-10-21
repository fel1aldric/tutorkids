from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.database import engine, Base
from app.routers import agents, auth, children, events, parents, family_messages
from app.services.audio_cleanup import cleanup_audio_outputs, start_audio_cleanup_task
from app.services.stt_service import get_stt_service
from app.services.tts_service import get_tts_service

# Create all tables at startup for dev convenience.
# Use Alembic for real migrations in production.
Base.metadata.create_all(bind=engine)

# Ensure audio output directory exists for TTS files.
Path("./audio_outputs").mkdir(exist_ok=True)

_cleanup_stop_event = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _cleanup_stop_event
    # Clean old TTS files at startup (default retention: 24h).
    cleanup_audio_outputs()
    # Start periodic cleanup every hour in a background thread.
    _cleanup_stop_event = start_audio_cleanup_task()
    yield
    # Stop background cleanup on shutdown.
    if _cleanup_stop_event is not None:
        _cleanup_stop_event.set()


app = FastAPI(
    title="TutorKids AI",
    description="Agents IA configurables pour l'education des enfants.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(children.router)
app.include_router(events.router)
app.include_router(parents.router)
app.include_router(family_messages.router)

app.mount("/audio", StaticFiles(directory="audio_outputs"), name="audio")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/health/voice")
def voice_health_check():
    stt = get_stt_service()
    tts = get_tts_service()
    return {
        "stt": stt.status(),
        "tts": tts.status(),
        "local_only": True,
        "cloud": False,
    }
