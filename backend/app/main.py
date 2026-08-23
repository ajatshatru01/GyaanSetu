from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.diagnostics import router as diagnostics_router
from app.api.documents import router as documents_router
from app.api.query import router as query_router
from app.api.tags import router as tags_router
from app.core.config import settings
from app.db import models  # noqa: F401
from app.db.database import Base, SessionLocal, engine
from app.services.tag_service import seed_default_tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure pgvector extension if PostgreSQL is active
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
    except Exception:
        pass

    Base.metadata.create_all(bind=engine)

    # Seed default tags
    try:
        db = SessionLocal()
        seed_default_tags(db)
        db.close()
    except Exception:
        pass

    yield


app = FastAPI(
    title=settings.app_name,
    description="AI-powered document intelligence and RAG retrieval system for Mumbai Metro Rail Corporation Limited (MMRCL).",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for React frontend (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(tags_router)
app.include_router(query_router)
app.include_router(diagnostics_router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": "1.0.0",
    }