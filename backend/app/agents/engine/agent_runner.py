import os
import yaml
from typing import Dict, Any, Optional
from datetime import date
from langchain_ollama import OllamaLLM
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.config import get_settings
from app.models.child import Child
from app.models.parent import Parent
from app.models.school_level import SchoolLevel
from app.models.curriculum import CurriculumItem


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
    def allowed_tools(self) -> list:
        return self.config.get("allowed_tools", [])

    def render_persona(self, context: Dict[str, Any]) -> str:
        try:
            return self.persona.format(**context)
        except KeyError:
            return self.persona


class AgentRunner:
    def __init__(self):
        self.settings = get_settings()
        self.roles_dir = os.path.join(os.path.dirname(__file__), "..", "roles")
        self.roles: Dict[str, AgentRole] = self._load_roles()
        self.llm = OllamaLLM(
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
        if child.school_level:
            level_label = child.school_level.label

        return {
            "first_name": child.first_name,
            "age": str(age) if age is not None else "âge inconnu",
            "school_level": level_label,
            "language": child.language,
            "interests": child.interests or "",
            "learning_style": child.learning_style,
        }

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

        context = self._build_child_context(child, db)
        system_prompt = role.render_persona(context)

        messages = [SystemMessage(content=system_prompt)]

        if conversation_history:
            for turn in conversation_history:
                if turn.get("role") == "user":
                    messages.append(HumanMessage(content=turn["content"]))
                else:
                    messages.append(AIMessage(content=turn["content"]))

        messages.append(HumanMessage(content=message))

        response = self.llm.invoke(messages)
        return response
