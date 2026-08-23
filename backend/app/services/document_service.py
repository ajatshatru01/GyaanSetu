import hashlib
import math
import os
import uuid
from typing import Any

from fastapi import HTTPException, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Document
from app.ingestion.pipeline import process_document


def format_file_size(bytes_val: int) -> str:
    if not bytes_val or bytes_val <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    i = int(math.floor(math.log(bytes_val, 1024)))
    p = math.pow(1024, i)
    s = round(bytes_val / p, 1)
    return f"{s} {units[i]}"


def get_file_type_info(filename: str) -> dict:
    ext = os.path.splitext(filename)[1].lower().replace(".", "")
    if ext == "pdf":
        return {
            "type": "pdf",
            "icon": "picture_as_pdf",
            "color": "text-error",
            "defaultIndex": "Indexed (OCR)",
        }
    elif ext in ["xlsx", "xls", "csv"]:
        return {
            "type": "excel",
            "icon": "table",
            "color": "text-[#107C41]",
            "defaultIndex": "Indexed (Tables)",
        }
    elif ext in ["docx", "doc"]:
        return {
            "type": "word",
            "icon": "description",
            "color": "text-[#2B579A]",
            "defaultIndex": "Indexed (Docs)",
        }
    return {
        "type": "other",
        "icon": "draft",
        "color": "text-primary",
        "defaultIndex": "Indexed",
    }


def serialize_document(doc: Document) -> dict:
    file_info = get_file_type_info(doc.filename)
    formatted_size = doc.formatted_size or format_file_size(doc.file_size)

    status_label = "Indexed (OCR)" if doc.status == "processed" else ("Processing..." if doc.status == "processing" else ("Failed" if doc.status == "failed" else file_info["defaultIndex"]))
    status_type = "secondary" if doc.status in ["processed", "uploaded"] else ("error" if doc.status == "failed" else "secondary")

    return {
        "id": doc.id,
        "lineageId": doc.lineage_id or f"doc_{doc.id}",
        "lineage_id": doc.lineage_id or f"doc_{doc.id}",
        "name": doc.filename,
        "title": doc.title,
        "filename": doc.filename,
        "department": doc.department or "General Engineering",
        "project": doc.project or "Mumbai Metro Line 3",
        "document_type": doc.document_type,
        "year": doc.year,
        "version": doc.version or "v1.0",
        "revision_label": doc.revision_label,
        "docStatus": doc.doc_status or "Current",
        "doc_status": doc.doc_status or "Current",
        "tags": doc.tags or [],
        "status": {
            "label": status_label,
            "type": status_type,
        },
        "action": "Re-index",
        "actionColor": "text-secondary hover:text-primary",
        "icon": {
            "name": file_info["icon"],
            "color": file_info["color"],
        },
        "uploadedAt": doc.created_at.isoformat() if doc.created_at else None,
        "created_at": doc.created_at,
        "size": formatted_size,
        "file_size": doc.file_size,
        "file_path": doc.file_path,
        "page_count": doc.page_count,
        "error_message": doc.error_message,
    }


def save_uploaded_file(upload_file: UploadFile) -> tuple[str, int, str]:
    os.makedirs(settings.storage_path, exist_ok=True)
    original_filename = upload_file.filename or "unknown.pdf"
    extension = os.path.splitext(original_filename)[1].lower()
    unique_filename = f"{uuid.uuid4()}{extension}"
    file_path = os.path.join(settings.storage_path, unique_filename)

    sha256 = hashlib.sha256()
    total_size = 0

    with open(file_path, "wb") as output:
        while True:
            chunk = upload_file.file.read(1024 * 1024)
            if not chunk:
                break
            sha256.update(chunk)
            total_size += len(chunk)
            output.write(chunk)

    file_hash = sha256.hexdigest()
    return file_path, total_size, file_hash


def create_document(
    db: Session,
    upload_file: UploadFile,
    title: str,
    document_type: str | None = None,
    project: str | None = None,
    department: str | None = None,
    year: int | None = None,
    version: str | None = "v1.0",
    lineage_id: str | None = None,
    doc_status: str = "Current",
    tags: list[dict] | None = None,
) -> Document:
    file_path, file_size, file_hash = save_uploaded_file(upload_file)
    formatted_size = format_file_size(file_size)

    # Check for exact duplicate file hash
    existing_duplicate = db.execute(
        select(Document).where(Document.file_hash == file_hash)
    ).scalars().first()

    effective_version = version if version else "v1.0"
    if not effective_version.startswith("v"):
        effective_version = f"v{effective_version}"

    # Document Family / Lineage handling
    clean_name = (upload_file.filename or "").strip().lower()
    if not lineage_id:
        # Check if another document exists with the same filename to share lineage
        same_name_doc = db.execute(
            select(Document).where(Document.filename.ilike(clean_name))
        ).scalars().first()
        if same_name_doc:
            lineage_id = same_name_doc.lineage_id or f"doc_{same_name_doc.id}"
        else:
            lineage_id = f"doc_{int(uuid.uuid4().int % 100000000)}"

    # If new doc is Current, demote other documents in the same lineage to 'Older Version'
    if doc_status == "Current" and lineage_id:
        other_lineage_docs = db.execute(
            select(Document).where(
                or_(
                    Document.lineage_id == lineage_id,
                    Document.filename.ilike(clean_name),
                )
            )
        ).scalars().all()
        for d in other_lineage_docs:
            d.doc_status = "Older Version"

    document = Document(
        title=title,
        filename=upload_file.filename or "unknown.pdf",
        document_type=document_type,
        project=project,
        department=department or "General Engineering",
        year=year,
        version=effective_version,
        lineage_id=lineage_id,
        doc_status=doc_status,
        file_path=file_path,
        file_hash=file_hash,
        file_size=file_size,
        formatted_size=formatted_size,
        status="uploaded",
        tags=tags or [],
    )

    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def get_documents(
    db: Session,
    department: str | None = None,
    search: str | None = None,
    doc_status: str | None = None,
) -> list[Document]:
    statement = select(Document).order_by(Document.created_at.desc())

    if department and department.lower() != "all":
        statement = statement.where(Document.department.ilike(f"%{department.strip()}%"))

    if doc_status:
        statement = statement.where(Document.doc_status == doc_status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Document.title.ilike(term),
                Document.filename.ilike(term),
                Document.department.ilike(term),
                Document.project.ilike(term),
            )
        )

    return list(db.execute(statement).scalars().all())


def get_document(db: Session, document_id: int) -> Document | None:
    return db.get(Document, document_id)


def update_document(
    db: Session,
    document_id: int,
    updates: dict[str, Any],
) -> Document | None:
    document = db.get(Document, document_id)
    if not document:
        return None

    for key, value in updates.items():
        if value is not None and hasattr(document, key):
            setattr(document, key, value)

    db.commit()
    db.refresh(document)
    return document


def update_document_status(
    db: Session,
    document_id: int,
    status: str,
) -> list[Document]:
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    target_status = "Current" if status in ["Current", "Active"] else "Older Version"
    lineage_id = document.lineage_id or f"doc_{document.id}"
    document.lineage_id = lineage_id
    document.doc_status = target_status

    if target_status == "Current":
        # Enforce single Current in lineage
        clean_name = document.filename.strip().lower()
        other_docs = db.execute(
            select(Document).where(
                Document.id != document_id,
                or_(
                    Document.lineage_id == lineage_id,
                    Document.filename.ilike(clean_name),
                ),
            )
        ).scalars().all()
        for d in other_docs:
            d.doc_status = "Older Version"
            d.lineage_id = lineage_id

    db.commit()
    return get_documents(db)


def update_document_version(
    db: Session,
    document_id: int,
    version: str,
) -> Document:
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    formatted_version = version if version.startswith("v") else f"v{version}"

    # Duplicate version check within the same filename / lineage
    clean_name = document.filename.strip().lower()
    duplicate = db.execute(
        select(Document).where(
            Document.id != document_id,
            Document.filename.ilike(clean_name),
            Document.version == formatted_version,
        )
    ).scalars().first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail=f'A document named "{document.filename}" with version "{formatted_version}" already exists.',
        )

    document.version = formatted_version
    db.commit()
    db.refresh(document)
    return document


def update_document_tags(
    db: Session,
    document_id: int,
    tags: list[dict],
) -> Document:
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.tags = tags
    db.commit()
    db.refresh(document)
    return document


def delete_document(db: Session, document_id: int) -> bool:
    document = db.get(Document, document_id)
    if not document:
        return False

    # Remove file from disk
    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
    except Exception:
        pass

    db.delete(document)
    db.commit()
    return True


def process_existing_document(document_id: int, db: Session | None = None):
    if db is not None:
        document = db.get(Document, document_id)
        if document:
            process_document(db=db, document=document)
        return

    try:
        from app.db.database import SessionLocal
        db_session = SessionLocal()
        try:
            document = db_session.get(Document, document_id)
            if not document:
                return
            process_document(db=db_session, document=document)
        finally:
            db_session.close()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Background task could not connect to database for doc {document_id}: {e}")