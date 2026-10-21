from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base, SessionLocal
from app.models.parent import Parent
from app.models.child import Child
from app.models.event import Event
from app.models.family_message import FamilyMessage
from app.auth import hash_password
from seed_data import seed


def setup_module():
    Base.metadata.create_all(bind=engine)
    seed()


client = TestClient(app)


def _register_and_login(email):
    client.post(
        "/auth/register-parent",
        json={"email": email, "first_name": "Dash", "last_name": "Parent", "password": "secret"},
    )
    res = client.post("/auth/login-parent", json={"email": email, "password": "secret"})
    return res.json()["access_token"]


def test_dashboard_returns_summary():
    token = _register_and_login("dashboard_a@example.com")

    res = client.post(
        "/children/",
        json={"first_name": "Léa", "school_level_code": "cp", "language": "fr"},
        headers={"Authorization": f"Bearer {token}"},
    )
    child_id = res.json()["id"]

    # Add a today's event.
    start = datetime.now().replace(hour=14, minute=0, second=0, microsecond=0)
    client.post(
        "/events/",
        json={"title": "Cours de piano", "start_at": start.isoformat(), "event_type": "activity", "child_id": child_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Add a homework for tomorrow.
    hw_start = start + timedelta(days=1)
    client.post(
        "/events/",
        json={"title": "Exercices de maths", "start_at": hw_start.isoformat(), "event_type": "homework"},
        headers={"Authorization": f"Bearer {token}"},
    )

    res = client.get("/parents/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["today_events"]) == 1
    assert data["today_events"][0]["title"] == "Cours de piano"
    assert len(data["upcoming_homework"]) == 1
    assert data["upcoming_homework"][0]["title"] == "Exercices de maths"
    assert len(data["children"]) == 1
    assert any("Devoir à venir" in a for a in data["recommended_actions"])


def test_dashboard_shows_recent_family_messages():
    token_a = _register_and_login("dashboard_msg_a@example.com")
    token_b = _register_and_login("dashboard_msg_b@example.com")

    res = client.post(
        "/children/",
        json={"first_name": "Tom", "school_level_code": "cp", "language": "fr"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    child_id = res.json()["id"]

    client.post(
        f"/children/{child_id}/link-parent",
        json={"parent_email": "dashboard_msg_b@example.com"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    # Get parent B id.
    me = client.get("/parents/me", headers={"Authorization": f"Bearer {token_b}"}).json()

    client.post(
        "/family-messages/",
        json={"recipient_parent_id": me["id"], "content": "Tu ramènes Tom ?", "child_id": child_id},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    res = client.get("/parents/dashboard", headers={"Authorization": f"Bearer {token_b}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["recent_messages"]) == 1
    assert data["recent_messages"][0]["content"] == "Tu ramènes Tom ?"
    assert any("nouveau(x) message(s)" in a for a in data["recommended_actions"])
