from app.agents.engine.agent_runner import AgentRunner

_agent_runner: AgentRunner = None


def get_agent_runner() -> AgentRunner:
    global _agent_runner
    if _agent_runner is None:
        _agent_runner = AgentRunner()
    return _agent_runner
