from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.query import (
    QueryRequest,
    QueryResponse,
)
from app.services.query_service import (
    answer_query,
)

router = APIRouter(
    prefix="/api/query",
    tags=["RAG"],
)


@router.post(
    "/",
    response_model=QueryResponse,
)
def query_knowledge_base(
    request: QueryRequest,
    db: Session = Depends(get_db),
):
    result = answer_query(
        db=db,
        query=request.query,
        top_k=request.top_k,
        include_older_versions=request.include_older_versions,
        department=request.department,
        document_id=request.document_id,
    )

    return result