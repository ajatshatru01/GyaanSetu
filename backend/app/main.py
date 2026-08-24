from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.departments import router as departments_router
from app.api.diagnostics import router as diagnostics_router
from app.api.documents import router as documents_router
from app.api.query import router as query_router
from app.api.tags import router as tags_router
from app.core.config import settings
from app.db import models  # noqa: F401
from app.db.database import Base, SessionLocal, engine
from app.services.department_service import seed_default_departments
from app.services.tag_service import seed_default_tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure pgvector extension and auto-add missing columns to existing tables
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            if engine.dialect.name == "postgresql":
                # Safe idempotent column additions for existing tables
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0 NOT NULL;"))
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS lineage_id VARCHAR(100);"))
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_status VARCHAR(50) DEFAULT 'Current' NOT NULL;"))
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);"))
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);"))
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS formatted_size VARCHAR(50);"))
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;"))
            conn.commit()
    except Exception:
        pass

    Base.metadata.create_all(bind=engine)

    # Seed default tags and departments
    try:
        db = SessionLocal()
        seed_default_tags(db)
        seed_default_departments(db)
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
app.include_router(departments_router)
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