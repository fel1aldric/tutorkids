#!/usr/bin/env bash
# One-command setup for the free, local voice stack (STT + TTS).
# No cloud service, no API key, everything runs on this machine.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

VOICE="${TTS_VOICE:-fr_FR-siwis-medium}"
WHISPER_MODEL="${WHISPER_MODEL:-base}"

cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing Python voice packages (this may take a few minutes)..."
pip install -q --upgrade pip
pip install -q openai-whisper piper-tts

echo "Downloading Piper voice: $VOICE"
if [ ! -f "voices/${VOICE}.onnx" ]; then
    bash "$SCRIPT_DIR/../download_voice.sh"
else
    echo "Piper voice already present: voices/${VOICE}.onnx"
fi

echo ""
echo "Voice stack ready."
echo "  STT: Whisper (model '$WHISPER_MODEL', downloaded on first use)"
echo "  TTS: Piper ($VOICE, fallback to pyttsx3 if needed)"
echo ""
echo "Start the backend with:"
echo "  ./run_dev.sh"
