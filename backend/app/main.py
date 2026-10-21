from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import agents, children, parents

# Create all tables at startup for dev convenience.
# Use Alembic for real migrations in production.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TutorKids AI",
    description="Agents IA configurables pour l'education des enfants.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(children.router)
app.include_router(parents.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
