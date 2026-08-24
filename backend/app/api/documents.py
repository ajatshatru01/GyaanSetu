from datetime import datetime
import json
import os
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.document import (
    DocumentOrderUpdate,
    DocumentResponse,
    DocumentStatusUpdate,
    DocumentTagsUpdate,
    DocumentUpdate,
    DocumentVersionUpdate,
    ReorderDocumentsRequest,
)
from app.services.document_service import (
    create_document,
    delete_document,
    export_documents_zip,
    get_document,
    get_documents,
    process_existing_document,
    reorder_documents,
    serialize_document,
    update_document,
    update_document_order,
    update_document_status,
    update_document_tags,
    update_document_version,
)

router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"],
)


@router.post(
    "/",
    response_model=DocumentResponse,
)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(None),
    document_type: str | None = Form(None),
    project: str | None = Form(None),
    department: str | None = Form(None),
    year: int | None = Form(None),
    version: str | None = Form(None),
    lineage_id: str | None = Form(None),
    lineageId: str | None = Form(None),
    doc_status: str | None = Form("Current"),
    docStatus: str | None = Form(None),
    docstatus: str | None = Form(None),
    order_index: int = Form(0),
    orderIndex: int | None = Form(None),
    tags: str | None = Form(None),
    uploaded_at: str | None = Form(None),
    uploadedAt: str | None = Form(None),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is required.",
        )

    extension = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = {
        ".pdf",
        ".docx",
        ".doc",
        ".pptx",
        ".xlsx",
        ".xls",
        ".csv",
        ".txt",
    }

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{extension}'. Supported formats: PDF, DOCX, XLSX, PPTX, CSV, TXT.",
        )

    # Parse tags JSON string if sent as Form data
    parsed_tags = []
    if tags:
        try:
            parsed_tags = json.loads(tags)
        except Exception:
            pass

    doc_title = title or file.filename
    effective_lineage = lineage_id or lineageId
    effective_status = docstatus or docStatus or doc_status or "Current"
    effective_order = orderIndex if orderIndex is not None else order_index
    effective_uploaded_at = uploadedAt or uploaded_at

    document = create_document(
        db=db,
        upload_file=file,
        title=doc_title,
        document_type=document_type,
        project=project,
        department=department or "General Engineering",
        year=year,
        version=version or "v1.0",
        lineage_id=effective_lineage,
        doc_status=effective_status,
        order_index=effective_order,
        tags=parsed_tags,
        uploaded_at=effective_uploaded_at,
    )

    # Background ingestion with Docling & Embedder
    background_tasks.add_task(
        process_existing_document,
        document.id,
    )

    return serialize_document(document)


@router.get(
    "/",
    response_model=list[DocumentResponse],
)
def list_documents(
    department: str | None = Query(None),
    search: str | None = Query(None),
    doc_status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    docs = get_documents(
        db=db,
        department=department,
        search=search,
        doc_status=doc_status,
    )
    return [serialize_document(d) for d in docs]


@router.get(
    "/export",
)
def export_vault_archive(
    department: str | None = Query(None),
    ids: str | None = Query(None, description="Comma-separated list of document IDs (e.g. 1,2,3)"),
    db: Session = Depends(get_db),
):
    doc_ids = None
    if ids:
        try:
            doc_ids = [int(i.strip()) for i in ids.split(",") if i.strip()]
        except Exception:
            pass

    zip_buffer = export_documents_zip(
        db=db,
        document_ids=doc_ids,
        department=department,
    )

    dept_prefix = f"_{department.replace(' ', '_')}" if department and department.lower() != "all" else ""
    filename = f"MMRCL_Document_Vault{dept_prefix}.zip"

    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch(
    "/reorder",
    response_model=list[DocumentResponse],
)
def bulk_reorder_documents(
    payload: ReorderDocumentsRequest,
    db: Session = Depends(get_db),
):
    raw_items = [item.model_dump() for item in payload.documents]
    updated_docs = reorder_documents(db, raw_items)
    return [serialize_document(d) for d in updated_docs]


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
def get_document_by_id(
    document_id: int,
    db: Session = Depends(get_db),
):
    document = get_document(db, document_id)
    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )
    return serialize_document(document)


@router.patch(
    "/{document_id}",
    response_model=DocumentResponse,
)
def patch_document(
    document_id: int,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
):
    updates = payload.model_dump(exclude_unset=True)
    if "tags" in updates and updates["tags"] is not None:
        updates["tags"] = [t if isinstance(t, dict) else t.model_dump() for t in updates["tags"]]

    doc = update_document(db, document_id, updates)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return serialize_document(doc)


@router.put(
    "/{document_id}/status",
    response_model=list[DocumentResponse],
)
def change_document_status(
    document_id: int,
    payload: DocumentStatusUpdate,
    db: Session = Depends(get_db),
):
    all_docs = update_document_status(db, document_id, payload.status)
    return [serialize_document(d) for d in all_docs]


@router.put(
    "/{document_id}/version",
    response_model=DocumentResponse,
)
def change_document_version(
    document_id: int,
    payload: DocumentVersionUpdate,
    db: Session = Depends(get_db),
):
    doc = update_document_version(db, document_id, payload.version)
    return serialize_document(doc)


@router.put(
    "/{document_id}/order",
    response_model=DocumentResponse,
)
def change_document_order(
    document_id: int,
    payload: DocumentOrderUpdate,
    db: Session = Depends(get_db),
):
    doc = update_document_order(db, document_id, payload.order_index)
    return serialize_document(doc)


@router.put(
    "/{document_id}/tags",
    response_model=DocumentResponse,
)
def change_document_tags(
    document_id: int,
    payload: DocumentTagsUpdate,
    db: Session = Depends(get_db),
):
    tag_dicts = [t.model_dump(by_alias=True) for t in payload.tags]
    doc = update_document_tags(db, document_id, tag_dicts)
    return serialize_document(doc)


@router.delete(
    "/{document_id}",
)
def remove_document(
    document_id: int,
    force: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    success = delete_document(db, document_id, force=force)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"success": True, "message": f"Document {document_id} deleted successfully."}


@router.get(
    "/{document_id}/file",
)
def download_document_file(
    document_id: int,
    db: Session = Depends(get_db),
):
    doc = get_document(db, document_id)
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk.")
    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type="application/octet-stream",
    )