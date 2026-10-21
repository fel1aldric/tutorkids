import os
import json
import yaml
from typing import Dict, Any, Optional, List
from datetime import date, datetime
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import tool

from app.config import get_settings
from app.models.child import Child
from app.models.parent import Parent
from app.models.school_level import SchoolLevel
from app.agents.engine import tools as agent_tools


class AgentRole:
    def __init__(self, config_path: str):
        with open(config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f)

    @property
    def id(self) -> str:
        return self.config["id"]

    @property
    def persona(self) -> str:
        return self.config.get("persona", "")

    @property
    def allowed_tools(self) -> List[str]:
        return self.config.get("allowed_tools", []) or []

    def render_persona(self, context: Dict[str, Any]) -> str:
        try:
            return self.persona.format(**context)
        except KeyError:
            return self.persona


def _format_events(events: List[Any]) -> str:
    return json.dumps(
        [
            {
                "id": getattr(e, "id", None),
                "title": getattr(e, "title", None),
                "start_at": getattr(e, "start_at", None),
                "child_first_name": getattr(getattr(e, "child", None), "first_name", None),
            }
            for e in events
        ],
        default=str,
        ensure_ascii=False,
    )


def build_tools(db, parent: Optional[Parent], child: Optional[Child]):
    """Create LangChain tools bound to the current request context."""

    @tool
    def get_today_events(parent_id: Optional[str] = None) -> str:
        """Liste les événements d'aujourd'hui pour la famille."""
        pid = parent_id or (parent.id if parent else None)
        if not pid:
            return "parent_id manquant."
        return _format_events(agent_tools.get_today_events(db, pid))

    @tool
    def get_week_events(parent_id: Optional[str] = None) -> str:
        """Liste les événements des 7 prochains jours pour la famille."""
        pid = parent_id or (parent.id if parent else None)
        if not pid:
            return "parent_id manquant."
        return _format_events(agent_tools.get_week_events(db, pid))

    @tool
    def get_children_for_parent(parent_id: Optional[str] = None) -> str:
        """Liste les enfants du parent avec leurs identifiants et prénoms."""
        pid = parent_id or (parent.id if parent else None)
        if not pid:
            return "parent_id manquant."
        children = agent_tools.get_children_for_parent(db, pid)
        return json.dumps(
            [
                {"id": c.id, "first_name": c.first_name, "school_level_code": c.school_level_code}
                for c in children
            ],
            ensure_ascii=False,
        )

    @tool
    def get_child_profile(child_id: Optional[str] = None) -> str:
        """Détails d'un enfant (prénom, niveau scolaire, intérêts)."""
        cid = child_id or (child.id if child else None)
        if not cid:
            return "child_id manquant."
        profile = agent_tools.get_child_profile(db, cid)
        if not profile:
            return "Enfant non trouvé."
        return json.dumps(
            {
                "id": profile.id,
                "first_name": profile.first_name,
                "school_level_code": profile.school_level_code,
                "interests": profile.interests,
                "language": profile.language,
                "learning_style": profile.learning_style,
            },
            ensure_ascii=False,
        )

    @tool
    def get_curriculum_for_level(school_level_code: Optional[str] = None) -> str:
        """Liste les compétences et objectifs pour un niveau scolaire."""
        code = school_level_code or (child.school_level_code if child else None)
        if not code:
            return "school_level_code manquant."
        items = agent_tools.get_curriculum_for_level(db, code)
        return json.dumps(
            [
                {
                    "subject": item.subject,
                    "skill": item.skill,
                    "description": item.description,
                }
                for item in items
            ],
            ensure_ascii=False,
        )

    @tool
    def add_event(
        title: str,
        start_at: str,
        child_id: Optional[str] = None,
        event_type: str = "activity",
        end_at: Optional[str] = None,
        description: Optional[str] = None,
        parent_id: Optional[str] = None,
    ) -> str:
        """
        Ajoute un événement / devoir / rendez-vous / rappel.
        start_at et end_at doivent être au format 'YYYY-MM-DD HH:MM'.
        """
        pid = parent_id or (parent.id if parent else None)
        if not pid:
            return "parent_id manquant."
        try:
            start_dt = datetime.strptime(start_at, "%Y-%m-%d %H:%M")
        except ValueError:
            return "Format de start_at invalide. Utilisez YYYY-MM-DD HH:MM."

        end_dt = None
        if end_at:
            try:
                end_dt = datetime.strptime(end_at, "%Y-%m-%d %H:%M")
            except ValueError:
                return "Format de end_at invalide. Utilisez YYYY-MM-DD HH:MM."

        # If child_id is a name-like placeholder, try to resolve it against the parent's children.
        if child_id and child_id.lower() in ("null", "none", ""):
            child_id = None

        event = agent_tools.add_event(
            db=db,
            parent_id=pid,
            title=title,
            start_at=start_dt,
            end_at=end_dt,
            description=description,
            event_type=event_type,
            child_id=child_id,
        )
        return f"Événement créé : {event.title} le {event.start_at} (ID {event.id})."

    @tool
    def send_message_to_parents(
        content: str,
        child_id: Optional[str] = None,
        parent_id: Optional[str] = None,
    ) -> str:
        """
        Envoie un message à l'autre parent de la famille.
        Précise l'enfant concerné avec child_id si le message le concerne.
        Le contenu doit être clair et concis.
        """
        pid = parent_id or (parent.id if parent else None)
        if not pid:
            return "parent_id manquant."
        if not content or not content.strip():
            return "Le contenu du message est vide."

        try:
            result = agent_tools.send_message_to_parents(
                db=db,
                sender_parent_id=pid,
                child_id=child_id,
                content=content.strip(),
            )
            return result
        except Exception as e:
            return f"Erreur lors de l'envoi du message : {str(e)}"

    return {
        "get_today_events": get_today_events,
        "get_week_events": get_week_events,
        "get_children_for_parent": get_children_for_parent,
        "get_child_profile": get_child_profile,
        "get_curriculum_for_level": get_curriculum_for_level,
        "add_event": add_event,
        "send_message_to_parents": send_message_to_parents,
    }


class AgentRunner:
    def __init__(self):
        self.settings = get_settings()
        self.roles_dir = os.path.join(os.path.dirname(__file__), "..", "roles")
        self.roles: Dict[str, AgentRole] = self._load_roles()
        self.llm = ChatOllama(
            base_url=self.settings.ollama_base_url,
            model=self.settings.ollama_model,
            temperature=0.7,
        )

    def _load_roles(self) -> Dict[str, AgentRole]:
        roles = {}
        if not os.path.isdir(self.roles_dir):
            return roles
        for filename in os.listdir(self.roles_dir):
            if filename.endswith(".yaml") or filename.endswith(".yml"):
                path = os.path.join(self.roles_dir, filename)
                role = AgentRole(path)
                roles[role.id] = role
        return roles

    def list_roles(self) -> list:
        return [
            {
                "id": role.id,
                "name": role.config.get("name"),
                "description": role.config.get("description"),
                "target_audience": role.config.get("target_audience"),
            }
            for role in self.roles.values()
        ]

    def _build_child_context(self, child: Optional[Child], db) -> Dict[str, Any]:
        if child is None:
            return {
                "first_name": "l'enfant",
                "age": "âge inconnu",
                "school_level": "niveau inconnu",
                "language": "fr",
                "interests": "",
                "learning_style": "mixed",
            }

        age = None
        if child.birth_date:
            today = date.today()
            age = today.year - child.birth_date.year - (
                (today.month, today.day) < (child.birth_date.month, child.birth_date.day)
            )

        level_label = "niveau inconnu"
        if child.school_level_code:
            from app.models.school_level import SchoolLevel
            level = db.query(SchoolLevel).filter(SchoolLevel.code == child.school_level_code).first()
            if level:
                level_label = level.label

        return {
            "first_name": child.first_name,
            "age": str(age) if age is not None else "âge inconnu",
            "school_level": level_label,
            "language": child.language,
            "interests": child.interests or "",
            "learning_style": child.learning_style,
        }

    def _build_parent_context(
        self, parent: Optional[Parent], db
    ) -> Dict[str, Any]:
        if parent is None:
            return {
                "parent_id": "",
                "children": [],
                "today_events": [],
                "week_events": [],
            }

        children = agent_tools.get_children_for_parent(db, parent.id)
        today_events = agent_tools.get_today_events(db, parent.id)
        week_events = agent_tools.get_week_events(db, parent.id)

        return {
            "parent_id": parent.id,
            "children": [
                {
                    "id": c.id,
                    "first_name": c.first_name,
                    "school_level_code": c.school_level_code,
                }
                for c in children
            ],
            "today_events": [agent_tools.format_event(e) for e in today_events],
            "week_events": [agent_tools.format_event(e) for e in week_events],
        }

    def _build_system_prompt(
        self,
        role: AgentRole,
        child: Optional[Child],
        parent: Optional[Parent],
        db,
    ) -> str:
        context = self._build_child_context(child, db)
        parent_context = self._build_parent_context(parent, db)

        system_prompt = role.render_persona(context)

        if role.id == "mother_schedule":
            schedule_context = f"""
Informations actuelles du parent :
- ID parent : {parent_context['parent_id']}
- Enfants : {json.dumps(parent_context['children'], ensure_ascii=False)}
- Emploi du temps d'aujourd'hui : {chr(10).join(parent_context['today_events']) or "Aucun événement"}
- Emploi du temps de la semaine : {chr(10).join(parent_context['week_events']) or "Aucun événement"}
""".strip()
            tool_hint = """
Tu peux utiliser les outils à ta disposition pour consulter l'emploi du temps ou ajouter des événements.
Quand tu ajoutes un événement, utilise le format YYYY-MM-DD HH:MM pour l'heure de début.
Si l'enfant n'est pas précisé ou que c'est pour toute la famille, ne renseigne pas child_id.
""".strip()
            system_prompt = f"{system_prompt}\n\n{schedule_context}\n\n{tool_hint}"

        return system_prompt

    def _select_tools(
        self, role: AgentRole, db, parent: Optional[Parent], child: Optional[Child]
    ) -> List[Any]:
        available = build_tools(db, parent, child)
        return [available[name] for name in role.allowed_tools if name in available]

    def run(
        self,
        role_id: str,
        message: str,
        db,
        child: Optional[Child] = None,
        parent: Optional[Parent] = None,
        conversation_history: Optional[list] = None,
    ) -> str:
        role = self.roles.get(role_id)
        if role is None:
            return f"Rôle '{role_id}' non trouvé."

        system_prompt = self._build_system_prompt(role, child, parent, db)

        messages = [SystemMessage(content=system_prompt)]

        if conversation_history:
            for turn in conversation_history:
                if turn.get("role") == "user":
                    messages.append(HumanMessage(content=turn["content"]))
                else:
                    messages.append(AIMessage(content=turn["content"]))

        messages.append(HumanMessage(content=message))

        selected_tools = self._select_tools(role, db, parent, child)
        llm = self.llm.bind_tools(selected_tools) if selected_tools else self.llm

        # Allow up to 3 tool turns before returning a final text answer.
        for _ in range(3):
            response = llm.invoke(messages)
            messages.append(response)

            tool_calls = getattr(response, "tool_calls", None)
            if not tool_calls:
                return response.content or ""

            for tc in tool_calls:
                tool_name = tc.get("name")
                tool_args = tc.get("args", {})
                tool_fn = next(
                    (t for t in selected_tools if t.name == tool_name), None
                )
                if tool_fn is None:
                    tool_result = f"Outil '{tool_name}' non disponible."
                else:
                    try:
                        tool_result = tool_fn.invoke(tool_args)
                    except Exception as e:
                        tool_result = f"Erreur lors de l'appel de {tool_name}: {str(e)}"
                messages.append(
                    ToolMessage(content=str(tool_result), tool_call_id=tc.get("id", ""))
                )

        # Final fallback after max turns: ask model to produce a text answer.
        response = llm.invoke(messages)
        return response.content or ""
