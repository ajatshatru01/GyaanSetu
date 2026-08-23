from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.diagnostics import DiagnosticsResponse
from app.services.diagnostics_service import get_system_diagnostics

router = APIRouter(
    prefix="/api/diagnostics",
    tags=["Diagnostics"],
)


@router.get(
    "/",
    response_model=DiagnosticsResponse,
)
def fetch_system_diagnostics(
    db: Session = Depends(get_db),
):
    data = get_system_diagnostics(db)
    return data
