from unittest.mock import patch, MagicMock

from app.services.push_service import get_push_service
from app.models.parent import Parent


def test_push_service_sends_valid_tokens():
    service = get_push_service()
    with patch("app.services.push_service.requests.post") as mock_post:
        mock_post.return_value = MagicMock(ok=True)
        mock_post.return_value.raise_for_status = MagicMock()
        mock_post.return_value.status_code = 200

        service.send_push(
            push_tokens=["ExponentPushToken[valid_token]"],
            title="Test",
            body="Hello",
            data={"type": "family_message"},
        )

        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args.kwargs["json"][0]["to"] == "ExponentPushToken[valid_token]"
        assert call_args.kwargs["json"][0]["title"] == "Test"


def test_push_service_ignores_invalid_tokens():
    service = get_push_service()
    with patch("app.services.push_service.requests.post") as mock_post:
        service.send_push(
            push_tokens=["invalid-token", "", None],
            title="Test",
            body="Hello",
        )
        mock_post.assert_not_called()


def test_push_token_registration_endpoint():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    # Register a parent
    client.post(
        "/auth/register-parent",
        json={"email": "push_parent@example.com", "first_name": "Push", "last_name": "Parent", "password": "secret"},
    )
    login = client.post("/auth/login-parent", json={"email": "push_parent@example.com", "password": "secret"})
    token = login.json()["access_token"]

    res = client.post(
        "/parents/push-token",
        json={"push_token": "ExponentPushToken[abc123]", "push_provider": "expo"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["registered"] is True

    res = client.get("/parents/me", headers={"Authorization": f"Bearer {token}"})
    assert res.json()["push_token"] == "ExponentPushToken[abc123]"
