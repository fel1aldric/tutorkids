"""
Local audio output cleanup.

TTS files are kept only for a configurable number of hours (default 24).
No file is ever uploaded to cloud storage; cleanup runs locally and removes
old files from the configured audio_outputs directory.
"""

import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from app.config import get_settings


DEFAULT_RETENTION_HOURS = 24
CLEANUP_INTERVAL_SECONDS = 3600  # run every hour


def cleanup_audio_outputs(
    audio_dir: Optional[Path] = None,
    retention_hours: Optional[int] = None,
) -> int:
    """Delete audio files older than retention_hours. Returns removed count."""
    settings = get_settings()

    if retention_hours is None:
        retention_hours = settings.tts_retention_hours

    if retention_hours <= 0:
        # 0 or negative means "disable cleanup"
        return 0

    directory = Path(audio_dir) if audio_dir else Path("./audio_outputs")
    if not directory.exists():
        return 0

    cutoff = time.time() - (retention_hours * 3600)
    removed = 0

    for path in directory.iterdir():
        if not path.is_file():
            continue
        try:
            mtime = path.stat().st_mtime
            if mtime < cutoff:
                path.unlink()
                removed += 1
        except OSError as exc:
            print(f"[audio_cleanup] Failed to remove {path}: {exc}")

    if removed:
        print(
            f"[audio_cleanup] {removed} file(s) removed from {directory} "
            f"(older than {retention_hours}h)"
        )

    return removed


def start_audio_cleanup_task(interval_seconds: int = CLEANUP_INTERVAL_SECONDS):
    """Start a background thread that cleans old audio files periodically."""
    import threading

    def _loop():
        while not _stop_event.is_set():
            _stop_event.wait(interval_seconds)
            if _stop_event.is_set():
                break
            try:
                cleanup_audio_outputs()
            except Exception as exc:
                print(f"[audio_cleanup] Periodic cleanup error: {exc}")

    _stop_event = threading.Event()
    thread = threading.Thread(target=_loop, daemon=True, name="audio-cleanup")
    thread.start()
    return _stop_event
