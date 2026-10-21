"""
Push notification service.

Uses the Expo Push Notification service for React Native Expo clients.
Only the notification signal travels through Expo's servers; message content
and user data remain stored locally in the TutorKids backend.
"""

from typing import Dict, List, Optional

import requests


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class PushService:
    def __init__(self):
        self.enabled = True

    def send_push(
        self,
        push_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
    ) -> None:
        """Send a push notification to the given Expo push tokens."""
        if not push_tokens:
            return

        messages = [
            {
                "to": token,
                "title": title,
                "body": body,
                "data": data or {},
                "sound": "default",
            }
            for token in push_tokens
            if token and token.startswith("ExponentPushToken[")
        ]

        if not messages:
            return

        try:
            response = requests.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            response.raise_for_status()
        except Exception as exc:
            print(f"[push] Failed to send push notification: {exc}")


def get_push_service() -> PushService:
    return PushService()
