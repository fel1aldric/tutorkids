from app.agents.engine.agent_runner import AgentRunner
from app.agents.engine import tools as agent_tools
from app.database import engine, Base, SessionLocal
from seed_data import seed
from app.models.parent import Parent
from app.models.child import Child
from app.models.family_message import FamilyMessage


def setup_module():
    Base.metadata.create_all(bind=engine)
    seed()


def test_roles_loaded():
    runner = AgentRunner()
    assert "family_messenger" in runner.roles


def test_send_message_to_linked_parent():
    db = SessionLocal()

    parent_a = Parent(
        email="parent_a_msg@example.com",
        first_name="Parent",
        last_name="A",
        hashed_password="x",
    )
    parent_b = Parent(
        email="parent_b_msg@example.com",
        first_name="Parent",
        last_name="B",
        hashed_password="x",
    )
    db.add(parent_a)
    db.add(parent_b)
    db.commit()
    db.refresh(parent_a)
    db.refresh(parent_b)

    child = Child(
        first_name="Enfant",
        school_level_code="cp",
        language="fr",
    )
    db.add(child)
    db.commit()
    db.refresh(child)

    # Shared custody: same child linked to both parents.
    parent_a.children.append(child)
    parent_b.children.append(child)
    db.commit()

    result = agent_tools.send_message_to_parents(
        db=db,
        sender_parent_id=parent_a.id,
        content="On emmène Léa chez le médecin demain à 14h.",
        child_id=child.id,
    )
    assert "1 parent" in result
    assert "envoyé" in result

    messages = db.query(FamilyMessage).filter(FamilyMessage.sender_parent_id == parent_a.id).all()
    assert len(messages) == 1
    assert messages[0].recipient_parent_id == parent_b.id
    assert "médecin" in messages[0].content
    assert messages[0].child_id == child.id

    db.query(FamilyMessage).filter(FamilyMessage.sender_parent_id == parent_a.id).delete()
    db.delete(child)
    db.delete(parent_b)
    db.delete(parent_a)
    db.commit()
    db.close()


def test_no_linked_parent():
    db = SessionLocal()

    parent = Parent(
        email="lonely_parent@example.com",
        first_name="Lonely",
        last_name="Parent",
        hashed_password="x",
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)

    result = agent_tools.send_message_to_parents(
        db=db,
        sender_parent_id=parent.id,
        content="Test sans parent lié.",
    )
    assert "Aucun autre parent" in result

    db.delete(parent)
    db.commit()
    db.close()


def test_agent_tool_send_message():
    db = SessionLocal()
    runner = AgentRunner()

    parent_a = Parent(
        email="tool_a@example.com",
        first_name="Tool",
        last_name="A",
        hashed_password="x",
    )
    parent_b = Parent(
        email="tool_b@example.com",
        first_name="Tool",
        last_name="B",
        hashed_password="x",
    )
    db.add(parent_a)
    db.add(parent_b)
    db.commit()
    db.refresh(parent_a)
    db.refresh(parent_b)

    child = Child(
        first_name="Enfant",
        school_level_code="cp",
        language="fr",
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    parent_a.children.append(child)
    parent_b.children.append(child)
    db.commit()

    tools = runner._select_tools(runner.roles["family_messenger"], db, parent_a, None)
    tool_names = [t.name for t in tools]
    assert "send_message_to_parents" in tool_names

    db.query(FamilyMessage).filter(
        FamilyMessage.sender_parent_id.in_([parent_a.id, parent_b.id])
    ).delete()
    db.delete(child)
    db.delete(parent_a)
    db.delete(parent_b)
    db.commit()
    db.close()
