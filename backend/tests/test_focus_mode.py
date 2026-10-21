from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app.models.parent import Parent
from app.models.child import Child
from app.auth import hash_password
from seed_data import seed


def setup_module():
    Base.metadata.create_all(bind=engine)
    seed()


client = TestClient(app)


def _register_and_login(email, password="secret"):
    client.post(
        "/auth/register-parent",
        json={"email": email, "first_name": "Test", "last_name": "Parent", "password": password},
    )
    res = client.post("/auth/login-parent", json={"email": email, "password": password})
    return res.json()["access_token"]


def _create_child(token, name="Léa"):
    res = client.post(
        "/children/",
        json={"first_name": name, "school_level_code": "cp", "language": "fr"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    return res.json()["id"]


def _login_child(parent_email, child_id, pin="1234"):
    res = client.post(
        "/auth/login-child-pin",
        json={"parent_email": parent_email, "child_id": child_id, "pin": pin},
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def test_default_focus_duration():
    token = _register_and_login("focus_default@example.com")
    child_id = _create_child(token)

    res = client.get(
        f"/children/{child_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["focus_duration_minutes"] == 15


def test_update_focus_duration():
    token = _register_and_login("focus_update@example.com")
    child_id = _create_child(token)

    res = client.put(
        f"/children/{child_id}",
        json={"focus_duration_minutes": 25},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["focus_duration_minutes"] == 25


def test_start_and_end_focus_session():
    parent_email = "focus_session@example.com"
    token = _register_and_login(parent_email)
    child_id = _create_child(token)

    res = client.put(
        f"/children/{child_id}",
        json={"pin": "1234"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200

    child_token = _login_child(parent_email, child_id)

    res = client.post(
        f"/focus/{child_id}/start",
        json={"duration_minutes": 10, "topic": "Mathématiques"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    session = res.json()
    assert session["child_id"] == child_id
    assert session["duration_minutes"] == 10
    assert session["status"] == "in_progress"

    # Active session visible for the child.
    res = client.get(
        "/focus/active",
        headers={"Authorization": f"Bearer {child_token}"},
    )
    assert res.status_code == 200
    assert res.json()["id"] == session["id"]

    # Cannot start a second session while one is active.
    res = client.post(
        f"/focus/{child_id}/start",
        json={"duration_minutes": 5},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400

    # End session.
    res = client.post(
        f"/focus/{session['id']}/end",
        json={"status": "completed", "summary": "Léa a travaillé ses tables"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "completed"
    assert res.json()["summary"] == "Léa a travaillé ses tables"


def test_list_child_sessions():
    token = _register_and_login("focus_list@example.com")
    child_id = _create_child(token)

    res = client.post(
        f"/focus/{child_id}/start",
        json={"duration_minutes": 10},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    session_id = res.json()["id"]

    client.post(
        f"/focus/{session_id}/end",
        json={"status": "completed"},
        headers={"Authorization": f"Bearer {token}"},
    )

    res = client.get(
        f"/focus/child/{child_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    sessions = res.json()
    assert len(sessions) == 1
    assert sessions[0]["status"] == "completed"


def test_focus_dashboard_summary():
    token = _register_and_login("focus_dash@example.com")
    child_id = _create_child(token, "Tom")

    res = client.post(
        f"/focus/{child_id}/start",
        json={"duration_minutes": 20},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    session_id = res.json()["id"]

    client.post(
        f"/focus/{session_id}/end",
        json={"status": "completed"},
        headers={"Authorization": f"Bearer {token}"},
    )

    res = client.get(
        "/focus/summary/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["children"]) == 1
    assert data["children"][0]["child_name"] == "Tom"
    assert data["children"][0]["total_minutes_7d"] == 20
    assert data["children"][0]["sessions_count_7d"] == 1
