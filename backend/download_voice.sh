#!/usr/bin/env bash
# Download a French Piper voice model for local TTS.
set -e

VOICE="fr_FR-siwis-medium"
mkdir -p voices
cd voices

echo "Downloading Piper voice: $VOICE"
curl -L -o "${VOICE}.onnx" "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/siwis/medium/${VOICE}.onnx"
curl -L -o "${VOICE}.onnx.json" "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/siwis/medium/${VOICE}.onnx.json"

echo "Voice model downloaded to voices/"
