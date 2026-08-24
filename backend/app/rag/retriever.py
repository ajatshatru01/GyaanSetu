from collections import defaultdict
import re
import time
import numpy as np
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.db.models import Document, DocumentChunk
from app.ingestion.embedder import generate_embedding

_last_latency_ms: float = 18.5


def get_last_retrieval_latency() -> float:
    global _last_latency_ms
    return _last_latency_ms


def retrieve_chunks(
    db: Session,
    query: str,
    top_k: int | None = None,
    include_older_versions: bool = False,
    department: str | None = None,
    document_id: int | None = None,
    max_top_documents: int = 4,
    chunks_per_document: int = 3,
) -> list[tuple[DocumentChunk, float]]:
    """
    Two-Stage Hierarchical Document-First Retrieval Engine:
    
    Flow:
        1. Query Embedding
            ↓
        2. Stage 1: Compare Query with Documents to find Top K Documents (Top 4-5)
            ↓
        3. Stage 2: Retrieve the Most Relevant Chunks from within those Top K Documents
            ↓
        4. Return clean, ranked chunks ready for Gemini LLM context & citations
    """
    global _last_latency_ms
    start_time = time.perf_counter()

    effective_total_k = top_k if top_k is not None else getattr(settings, "top_k", 15)

    # ----------------------------------------------------
    # 1. Generate Context-Enriched Query Embedding
    # ----------------------------------------------------
    enriched_query = query
    if department and department.lower() != "all":
        enriched_query = f"[Department: {department}] {query}"
    query_embedding = generate_embedding(enriched_query)

    bind = db.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # Extract clean alphanumeric keywords for hybrid scoring (e.g. part IDs, SOP numbers)
    query_terms = [re.escape(term.lower()) for term in re.findall(r"\w+", query) if len(term) >= 3]

    if is_postgres:
        distance_col = DocumentChunk.embedding.cosine_distance(query_embedding)

        # ----------------------------------------------------
        # Scope Pre-Filtering (Status, Department, Document ID)
        # ----------------------------------------------------
        base_query = (
            select(DocumentChunk, distance_col.label("distance"))
            .join(Document, DocumentChunk.document_id == Document.id)
            .options(joinedload(DocumentChunk.document))
            .where(DocumentChunk.embedding.is_not(None))
        )

        if not include_older_versions:
            base_query = base_query.where(Document.doc_status == "Current")

        if department and department.strip() and department.lower() != "all":
            base_query = base_query.where(Document.department.ilike(f"%{department.strip()}%"))

        if document_id is not None:
            base_query = base_query.where(DocumentChunk.document_id == document_id)

        # Retrieve a broad candidate pool of chunks
        raw_candidates = db.execute(base_query.order_by(distance_col).limit(60)).all()

        if not raw_candidates:
            _last_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return []

        # ----------------------------------------------------
        # Stage 1: Rank and Select Top K Documents (Top 4-5)
        # ----------------------------------------------------
        # Group chunks by document and compute each document's best relevance score
        doc_chunks_map: dict[int, list[tuple[DocumentChunk, float]]] = defaultdict(list)
        doc_best_score: dict[int, float] = {}

        for row in raw_candidates:
            chunk: DocumentChunk = row[0]
            raw_dist = float(row[1]) if row[1] is not None else 0.5
            content_lower = chunk.content.lower()

            # Exact keyword match bonus (Full-Text bonus for model codes & SOPs)
            keyword_hits = sum(1 for term in query_terms if term in content_lower)
            keyword_bonus = min(0.20, keyword_hits * 0.04)

            # Combined distance (lower is more relevant)
            hybrid_dist = max(0.0, raw_dist - keyword_bonus)
            d_id = chunk.document_id

            doc_chunks_map[d_id].append((chunk, hybrid_dist))

            if d_id not in doc_best_score or hybrid_dist < doc_best_score[d_id]:
                doc_best_score[d_id] = hybrid_dist

        # Sort documents by their best matching chunk
        sorted_doc_ids = sorted(doc_best_score.keys(), key=lambda did: doc_best_score[did])
        top_selected_doc_ids = sorted_doc_ids[:max_top_documents]

        # ----------------------------------------------------
        # Stage 2: Extract Relevant Chunks from Top Selected Documents
        # ----------------------------------------------------
        final_selected_chunks: list[tuple[DocumentChunk, float]] = []
        seen_chunk_ids: set[int] = set()

        # Step 2a: Pick top N chunks from each selected top document
        for doc_id in top_selected_doc_ids:
            chunks_for_doc = doc_chunks_map[doc_id]
            chunks_for_doc.sort(key=lambda x: x[1])

            for chunk, score in chunks_for_doc[:chunks_per_document]:
                if chunk.id not in seen_chunk_ids and len(final_selected_chunks) < effective_total_k:
                    final_selected_chunks.append((chunk, score))
                    seen_chunk_ids.add(chunk.id)

        # Step 2b: If quota remains, backfill with next best chunks from the top documents
        if len(final_selected_chunks) < effective_total_k:
            for doc_id in top_selected_doc_ids:
                for chunk, score in doc_chunks_map[doc_id]:
                    if chunk.id not in seen_chunk_ids and len(final_selected_chunks) < effective_total_k:
                        final_selected_chunks.append((chunk, score))
                        seen_chunk_ids.add(chunk.id)

        # Sort final selection by relevance
        final_selected_chunks.sort(key=lambda x: x[1])

        _last_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return final_selected_chunks

    else:
        # Resilient SQLite test environment implementation
        base_query = (
            select(DocumentChunk)
            .join(Document, DocumentChunk.document_id == Document.id)
            .options(joinedload(DocumentChunk.document))
        )

        if not include_older_versions:
            base_query = base_query.where(Document.doc_status == "Current")

        if department and department.strip() and department.lower() != "all":
            base_query = base_query.where(Document.department.ilike(f"%{department.strip()}%"))

        if document_id is not None:
            base_query = base_query.where(DocumentChunk.document_id == document_id)

        all_chunks = db.execute(base_query).scalars().all()
        if not all_chunks:
            _last_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        norm_q = np.linalg.norm(q_vec) or 1.0

        doc_chunks_map: dict[int, list[tuple[DocumentChunk, float]]] = defaultdict(list)
        doc_best_score: dict[int, float] = {}

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

            content_lower = chunk.content.lower()
            keyword_hits = sum(1 for term in query_terms if term in content_lower)
            keyword_bonus = min(0.20, keyword_hits * 0.04)
            hybrid_dist = max(0.0, dist - keyword_bonus)

            d_id = chunk.document_id
            doc_chunks_map[d_id].append((chunk, hybrid_dist))

            if d_id not in doc_best_score or hybrid_dist < doc_best_score[d_id]:
                doc_best_score[d_id] = hybrid_dist

        sorted_doc_ids = sorted(doc_best_score.keys(), key=lambda did: doc_best_score[did])
        top_selected_doc_ids = sorted_doc_ids[:max_top_documents]

        final_selected_chunks = []
        seen_chunk_ids = set()

        for doc_id in top_selected_doc_ids:
            chunks_for_doc = doc_chunks_map[doc_id]
            chunks_for_doc.sort(key=lambda x: x[1])

            for chunk, score in chunks_for_doc[:chunks_per_document]:
                if chunk.id not in seen_chunk_ids and len(final_selected_chunks) < effective_total_k:
                    final_selected_chunks.append((chunk, score))
                    seen_chunk_ids.add(chunk.id)

        final_selected_chunks.sort(key=lambda x: x[1])
        _last_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return final_selected_chunks