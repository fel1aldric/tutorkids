"""Pont TutorKids -> n8n : résumé de session envoyé au parent par WhatsApp.

Emplacement conseillé : app/services/n8n.py

ADAPT : les imports ci-dessous et les attributs de modèle utilisés
(session.child, child.parents, session.messages[].role/content, parent.whatsapp_*)
sont à aligner sur tes modèles SQLAlchemy.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from app.config import get_settings
from contextlib import contextmanager
import httpx

from app.database import get_db

logger = logging.getLogger("tutorkids.n8n")
setting = get_settings()
db_session = contextmanager(get_db)
N8N_WEBHOOK_URL = setting.n8n_instance_webhook
INTERNAL_API_KEY = setting.app_secret_key


def utcnow() -> datetime:
    """Datetime UTC naïf (convention de stockage supposée : UTC sans tzinfo)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(dt: datetime) -> str:
    return dt.isoformat() + "Z" if dt.tzinfo is None else dt.isoformat()



async def send_event(event: str, data: dict[str, Any]) -> bool:
    """POST l'évènement vers le webhook n8n (3 essais, backoff 1s/2s/4s)."""
    if not N8N_WEBHOOK_URL:
        logger.warning("N8N_WEBHOOK_URL non défini, évènement %s ignoré", event)
        return False

    payload = {"event": event, **data}
    headers = {"X-API-Key": INTERNAL_API_KEY}
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(N8N_WEBHOOK_URL, json=payload, headers=headers)
                resp.raise_for_status()
                return True
        except httpx.HTTPError as exc:
            logger.warning("n8n %s échec (essai %d/3) : %s", event, attempt + 1, exc)
            await asyncio.sleep(2**attempt)
    return False

async def notify_event_created(event_id: str) -> None:
    """À lancer en BackgroundTask après la création d'un évènement d'agenda."""
    from app.models import Event, Parent
 
    with db_session() as db:
        event = db.get(Event, event_id)
        if event is None:
            return
        parent = db.get(Parent, event.parent_id)
        print(parent.whatsapp_number)
        if parent is None or not (parent.whatsapp_number):
            return
        await send_event(
            "event_created",
            {
                "event_id": event.id,
                "parent_name": parent.last_name,
                "parent_phone": parent.whatsapp_number,
                "title": event.title,
                "starts_at": iso(event.start_at),
                "end_at": iso(event.end_at),
            },
        )