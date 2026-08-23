import hashlib
import logging
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Document, DocumentChunk
from app.ingestion.chunker import create_chunks
from app.ingestion.embedder import generate_embeddings
from app.ingestion.parser import parse_document
from app.llm.gemini import extract_document_metadata_ai

logger = logging.getLogger(__name__)


def process_document(
    db: Session,
    document: Document,
):
    document.status = "processing"
    db.commit()

    try:
        # ---------------------------------------
        # 1. Parse with Docling
        # ---------------------------------------
        docling_document = parse_document(
            document.file_path
        )

        # ---------------------------------------
        # 2. Convert to Markdown & Hash
        # ---------------------------------------
        markdown = docling_document.export_to_markdown()
        if not markdown or not markdown.strip():
            markdown = f"# {document.title}\n\nDocument file parsed with empty text."

        content_hash = hashlib.sha256(markdown.encode("utf-8")).hexdigest()
        document.content_hash = content_hash

        # Estimate page count if not set
        if not document.page_count:
            if hasattr(docling_document, 'pages') and docling_document.pages:
                document.page_count = len(docling_document.pages)
            else:
                # Estimate ~500 words per page
                document.page_count = max(1, len(markdown.split()) // 500)

        # ---------------------------------------
        # 3. Optional AI Metadata Enrichment
        # ---------------------------------------
        if not document.document_type or not document.department or document.department == "General Engineering":
            ai_meta = extract_document_metadata_ai(markdown[:3000], document.filename)
            if ai_meta:
                if not document.document_type and ai_meta.get("document_type"):
                    document.document_type = ai_meta.get("document_type")
                if (not document.department or document.department == "General Engineering") and ai_meta.get("department"):
                    document.department = ai_meta.get("department")
                if not document.project and ai_meta.get("project"):
                    document.project = ai_meta.get("project")
                if not document.revision_label and ai_meta.get("revision_label"):
                    document.revision_label = ai_meta.get("revision_label")

        # ---------------------------------------
        # 4. Chunking
        # ---------------------------------------
        chunks = create_chunks(
            markdown=markdown,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        if not chunks:
            raise ValueError("No text chunks could be extracted from document.")

        # ---------------------------------------
        # 5. Generate embeddings
        # ---------------------------------------
        texts = [chunk.content for chunk in chunks]
        embeddings = generate_embeddings(texts)

        # ---------------------------------------
        # 6. Clean existing chunks (if re-indexing) & store new chunks
        # ---------------------------------------
        db.execute(
            delete(DocumentChunk).where(DocumentChunk.document_id == document.id)
        )

        for chunk, embedding in zip(chunks, embeddings):
            db_chunk = DocumentChunk(
                document_id=document.id,
                chunk_index=chunk.chunk_index,
                page_number=chunk.page_number,
                section=chunk.section,
                subsection=chunk.subsection,
                element_type=chunk.element_type,
                content=chunk.content,
                metadata_json={
                    "document_title": document.title,
                    "document_name": document.filename,
                    "document_type": document.document_type,
                    "project": document.project,
                    "department": document.department,
                    "year": document.year,
                    "version": document.version,
                    "doc_status": document.doc_status,
                    "lineage_id": document.lineage_id,
                },
                embedding=embedding,
            )
            db.add(db_chunk)

        document.status = "processed"
        document.error_message = None
        db.commit()
        logger.info(f"Successfully processed document ID {document.id} ({len(chunks)} chunks).")

    except Exception as exc:
        logger.error(f"Failed processing document ID {document.id}: {exc}")
        document.status = "failed"
        document.error_message = str(exc)
        db.commit()