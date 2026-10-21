import os
import time
from pathlib import Path

from app.services.audio_cleanup import cleanup_audio_outputs


def test_cleanup_removes_only_old_files(tmp_path, monkeypatch):
    # Override the default audio directory for the test.
    old_file = tmp_path / "old.wav"
    recent_file = tmp_path / "recent.wav"
    untouched_dir = tmp_path / "subdir"
    untouched_dir.mkdir()

    old_file.write_text("old audio")
    recent_file.write_text("recent audio")

    # Simulate ages: old = 25h ago, recent = 1h ago.
    now = time.time()
    os.utime(old_file, (now - 25 * 3600, now - 25 * 3600))
    os.utime(recent_file, (now - 1 * 3600, now - 1 * 3600))

    removed = cleanup_audio_outputs(audio_dir=tmp_path, retention_hours=24)

    assert removed == 1
    assert not old_file.exists()
    assert recent_file.exists()


def test_cleanup_disabled_when_retention_zero(tmp_path):
    old_file = tmp_path / "old.wav"
    old_file.write_text("old audio")
    os.utime(old_file, (time.time() - 25 * 3600, time.time() - 25 * 3600))

    removed = cleanup_audio_outputs(audio_dir=tmp_path, retention_hours=0)

    assert removed == 0
    assert old_file.exists()


def test_cleanup_handles_missing_directory(tmp_path):
    missing_dir = tmp_path / "does_not_exist"
    removed = cleanup_audio_outputs(audio_dir=missing_dir, retention_hours=24)
    assert removed == 0
