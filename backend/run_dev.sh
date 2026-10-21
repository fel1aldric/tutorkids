#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -q -r requirements.txt

echo "Running migrations (SQLite dev mode)..."
alembic upgrade head

echo "Seeding data..."
python seed_data.py

echo "Starting server..."
export OLLAMA_MODEL=${OLLAMA_MODEL:-gpt-oss:20b-cloud}
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
