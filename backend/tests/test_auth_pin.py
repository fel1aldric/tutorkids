from app.database import engine, Base, SessionLocal
from app.models.parent import Parent
from app.models.child import Child
from app.auth import hash_password
from seed_data import seed


def setup_module():
    Base.metadata.create_all(bind=engine)
    seed()


def test_login_child_pin():
    db = SessionLocal()
    parent = Parent(
        email="pinparent@example.com",
        first_name="Pin",
        last_name="Parent",
        hashed_password=hash_password("secret"),
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)

    child = Child(
        first_name="Léa",
        school_level_code="cp",
        language="fr",
        pin_hash=hash_password("1234"),
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    parent.children.append(child)
    db.commit()
    db.refresh(child)

    from app.routers.auth import login_child_pin
    from app.schemas.auth import ChildPinLoginRequest

    payload = ChildPinLoginRequest(
        parent_email="pinparent@example.com",
        child_id=child.id,
        pin="1234",
    )
    result = login_child_pin(payload, db)
    assert "access_token" in result
    assert result["user"]["first_name"] == "Léa"

    # Wrong PIN
    bad_payload = ChildPinLoginRequest(
        parent_email="pinparent@example.com",
        child_id=child.id,
        pin="0000",
    )
    from fastapi import HTTPException
    try:
        login_child_pin(bad_payload, db)
        assert False, "Should have raised"
    except HTTPException as e:
        assert e.status_code == 401

    # PIN not set
    child.pin_hash = None
    db.commit()
    try:
        login_child_pin(payload, db)
        assert False, "Should have raised"
    except HTTPException as e:
        assert e.status_code == 401

    db.delete(child)
    db.delete(parent)
    db.commit()
    db.close()
