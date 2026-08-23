import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.db.models import Document, DocumentChunk
from app.ingestion.embedder import generate_embedding


def retrieve_chunks(
    db: Session,
    query: str,
    top_k: int | None = None,
    include_older_versions: bool = False,
    department: str | None = None,
    document_id: int | None = None,
) -> list[tuple[DocumentChunk, float]]:
    if top_k is None:
        top_k = settings.top_k

    # -------------------------------------
    # Generate query embedding
    # -------------------------------------
    query_embedding = generate_embedding(query)

    bind = db.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        # Cosine distance via pgvector <=> operator
        distance = DocumentChunk.embedding.cosine_distance(query_embedding)

        statement = (
            select(DocumentChunk, distance.label("distance"))
            .join(Document, DocumentChunk.document_id == Document.id)
            .options(joinedload(DocumentChunk.document))
            .where(DocumentChunk.embedding.is_not(None))
        )

        if not include_older_versions:
            statement = statement.where(Document.doc_status == "Current")

        if department and department.strip() and department.lower() != "all":
            statement = statement.where(Document.department.ilike(f"%{department.strip()}%"))

        if document_id is not None:
            statement = statement.where(DocumentChunk.document_id == document_id)

        statement = statement.order_by(distance).limit(top_k)
        results = db.execute(statement).all()
        return [(row[0], float(row[1]) if row[1] is not None else 0.0) for row in results]
    else:
        # Resilient fallback for non-PostgreSQL (e.g. SQLite test environments)
        statement = (
            select(DocumentChunk)
            .join(Document, DocumentChunk.document_id == Document.id)
            .options(joinedload(DocumentChunk.document))
        )

        if not include_older_versions:
            statement = statement.where(Document.doc_status == "Current")

        if department and department.strip() and department.lower() != "all":
            statement = statement.where(Document.department.ilike(f"%{department.strip()}%"))

        if document_id is not None:
            statement = statement.where(DocumentChunk.document_id == document_id)

        all_chunks = db.execute(statement).scalars().all()
        if not all_chunks:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        norm_q = np.linalg.norm(q_vec) or 1.0

        scored = []
        for chunk in all_chunks:
            if chunk.embedding:
                try:
                    c_vec = np.array(chunk.embedding, dtype=np.float32)
                    norm_c = np.linalg.norm(c_vec) or 1.0
                    cosine_sim = float(np.dot(q_vec, c_vec) / (norm_q * norm_c))
                    dist = 1.0 - cosine_sim
                except Exception:
                    dist = 1.0
            else:
                dist = 1.0
            scored.append((chunk, dist))

        scored.sort(key=lambda x: x[1])
        return scored[:top_k]