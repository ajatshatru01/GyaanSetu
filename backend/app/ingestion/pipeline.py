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
    document.status = "processing:parsing"
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

        # Sanitize null bytes for PostgreSQL
        markdown = markdown.replace("\x00", "")

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
                    document.document_type = str(ai_meta.get("document_type")).replace("\x00", "")
                if (not document.department or document.department == "General Engineering") and ai_meta.get("department"):
                    document.department = str(ai_meta.get("department")).replace("\x00", "")
                if not document.project and ai_meta.get("project"):
                    document.project = str(ai_meta.get("project")).replace("\x00", "")
                if not document.revision_label and ai_meta.get("revision_label"):
                    document.revision_label = str(ai_meta.get("revision_label")).replace("\x00", "")

        # ---------------------------------------
        # 4. Chunking
        # ---------------------------------------
        document.status = "processing:chunking"
        db.commit()

        chunks = create_chunks(
            markdown=markdown,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )

        if not chunks:
            raise ValueError("No text chunks could be extracted from document.")

        # ---------------------------------------
        # 5. Context-Enriched Chunks for Embeddings
        # ---------------------------------------
        document.status = "processing:embedding"
        db.commit()

        enriched_texts = []
        for chunk in chunks:
            clean_text = chunk.content.replace("\x00", "")
            section_info = f" | Section: {chunk.section}" if chunk.section else ""
            enriched_input = (
                f"[Document: {document.title} | Department: {document.department or 'General'}{section_info}]\n"
                f"{clean_text}"
            )
            enriched_texts.append(enriched_input)

        embeddings = generate_embeddings(enriched_texts)

        # ---------------------------------------
        # 6. Clean existing chunks (if re-indexing) & store new chunks
        # ---------------------------------------
        document.status = "processing:indexing"
        db.commit()

        db.execute(
            delete(DocumentChunk).where(DocumentChunk.document_id == document.id)
        )

        for chunk, embedding in zip(chunks, embeddings):
            clean_content = chunk.content.replace("\x00", "")
            db_chunk = DocumentChunk(
                document_id=document.id,
                chunk_index=chunk.chunk_index,
                page_number=chunk.page_number,
                section=chunk.section.replace("\x00", "") if chunk.section else None,
                subsection=chunk.subsection.replace("\x00", "") if chunk.subsection else None,
                element_type=chunk.element_type,
                content=clean_content,
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
        db.rollback()
        logger.error(f"Failed processing document ID {document.id}: {exc}")
        try:
            document = db.get(Document, document.id)
            if document:
                document.status = "failed"
                document.error_message = str(exc)
                db.commit()
        except Exception:
            pass