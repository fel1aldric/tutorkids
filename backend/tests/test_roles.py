from app.agents.engine.agent_runner import AgentRunner


def test_roles_loaded():
    runner = AgentRunner()
    roles = runner.list_roles()
    ids = {r["id"] for r in roles}
    assert "kids_tutor" in ids
    assert "mother_schedule" in ids


def test_child_context():
    from app.database import SessionLocal
    from app.models.child import Child
    from app.models.school_level import SchoolLevel

    db = SessionLocal()
    level = db.query(SchoolLevel).filter(SchoolLevel.code == "cp").first()
    child = Child(
        first_name="Test",
        birth_date=None,
        school_level=level,
        language="fr",
        interests="football",
    )
    runner = AgentRunner()
    ctx = runner._build_child_context(child, db)
    assert ctx["first_name"] == "Test"
    assert ctx["school_level"] == "CP"
    db.close()
