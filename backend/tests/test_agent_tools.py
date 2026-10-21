from datetime import datetime
from app.agents.engine.agent_runner import AgentRunner, build_tools
from app.database import engine, Base, SessionLocal
from seed_data import seed


def setup_module():
    Base.metadata.create_all(bind=engine)
    seed()


def test_roles_loaded():
    runner = AgentRunner()
    roles = runner.list_roles()
    ids = {r["id"] for r in roles}
    assert "kids_tutor" in ids
    assert "mother_schedule" in ids


def test_mother_schedule_has_tools():
    runner = AgentRunner()
    role = runner.roles["mother_schedule"]
    assert "add_event" in role.allowed_tools
    assert "get_today_events" in role.allowed_tools


def test_build_parent_context():
    from app.models.parent import Parent

    db = SessionLocal()
    runner = AgentRunner()

    parent = Parent(
        email="ctxparent@example.com",
        first_name="Ctx",
        last_name="Parent",
        hashed_password="x",
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)

    ctx = runner._build_parent_context(parent, db)
    assert ctx["parent_id"] == parent.id
    assert ctx["children"] == []
    assert ctx["today_events"] == []

    db.query(Parent).filter(Parent.id == parent.id).delete()
    db.commit()
    db.close()


def test_tool_add_event():
    from app.models.parent import Parent
    from app.models.child import Child
    from app.models.event import Event

    db = SessionLocal()

    parent = Parent(
        email="addeventtool@example.com",
        first_name="Add",
        last_name="Event",
        hashed_password="x",
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)

    child = Child(
        first_name="Léa",
        school_level_code="cp",
        language="fr",
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    parent.children.append(child)
    db.commit()

    tools = build_tools(db, parent, child)
    add_event_tool = tools["add_event"]

    start = datetime.now().replace(hour=14, minute=0, second=0, microsecond=0)
    result = add_event_tool.invoke(
        {
            "title": "Rendez-vous médecin",
            "start_at": start.strftime("%Y-%m-%d %H:%M"),
            "child_id": child.id,
            "event_type": "appointment",
        }
    )
    assert "Rendez-vous médecin" in result
    assert "créé" in result

    created = db.query(Event).filter(Event.parent_id == parent.id).first()
    assert created is not None
    assert created.title == "Rendez-vous médecin"
    assert created.child_id == child.id

    db.query(Event).filter(Event.parent_id == parent.id).delete()
    db.delete(child)
    db.delete(parent)
    db.commit()
    db.close()


def test_tool_get_today_events():
    from app.models.parent import Parent
    from app.models.event import Event

    db = SessionLocal()

    parent = Parent(
        email="todayevents@example.com",
        first_name="Today",
        last_name="Events",
        hashed_password="x",
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)

    start = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
    event = Event(
        parent_id=parent.id,
        title="Cours de piano",
        start_at=start,
        event_type="activity",
    )
    db.add(event)
    db.commit()

    tools = build_tools(db, parent, None)
    result = tools["get_today_events"].invoke({})
    assert "Cours de piano" in result

    db.query(Event).filter(Event.parent_id == parent.id).delete()
    db.delete(parent)
    db.commit()
    db.close()
