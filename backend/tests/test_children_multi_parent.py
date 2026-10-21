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


def test_link_parent_to_child():
    token_a = _register_and_login("link_parent_a@example.com")
    token_b = _register_and_login("link_parent_b@example.com")

    # Parent A creates a child.
    res = client.post(
        "/children/",
        json={"first_name": "Léa", "school_level_code": "cp", "language": "fr"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 200
    child_id = res.json()["id"]

    # Parent A links parent B to the child.
    res = client.post(
        f"/children/{child_id}/link-parent",
        json={"parent_email": "link_parent_b@example.com"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 200
    assert res.json()["email"] == "link_parent_b@example.com"

    # Parent B can now list the child.
    res = client.get("/children/", headers={"Authorization": f"Bearer {token_b}"})
    assert res.status_code == 200
    ids = [c["id"] for c in res.json()]
    assert child_id in ids

    # Parent A cannot link parent B twice.
    res = client.post(
        f"/children/{child_id}/link-parent",
        json={"parent_email": "link_parent_b@example.com"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 400


def test_login_child_pin_with_multi_parent():
    token_a = _register_and_login("pin_multi_a@example.com")
    token_b = _register_and_login("pin_multi_b@example.com")

    res = client.post(
        "/children/",
        json={"first_name": "Tom", "school_level_code": "cp", "language": "fr"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    child_id = res.json()["id"]

    client.post(
        f"/children/{child_id}/link-parent",
        json={"parent_email": "pin_multi_b@example.com"},
        headers={"Authorization": f"Bearer {token_a}"},
    )

    # Parent A sets PIN.
    res = client.put(
        f"/children/{child_id}",
        json={"pin": "1234"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 200

    # Child can log in with parent B email too.
    res = client.post(
        "/auth/login-child-pin",
        json={"parent_email": "pin_multi_b@example.com", "child_id": child_id, "pin": "1234"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()
