from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.department import (
    DepartmentCreate,
    DepartmentItem,
    DepartmentUpdate,
)
from app.services.department_service import (
    create_department,
    delete_department,
    get_all_departments,
    get_department,
    update_department,
)

router = APIRouter(
    prefix="/api/departments",
    tags=["Departments"],
)


@router.get(
    "/",
    response_model=list[DepartmentItem],
)
def list_departments(
    db: Session = Depends(get_db),
):
    return get_all_departments(db)


@router.post(
    "/",
    response_model=DepartmentItem,
)
def add_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
):
    dept = create_department(db, payload.name, payload.description)
    return DepartmentItem(
        id=dept.id,
        name=dept.name,
        description=dept.description,
        document_count=0,
        created_at=dept.created_at,
    )


@router.get(
    "/{department_id}",
    response_model=DepartmentItem,
)
def get_department_by_id(
    department_id: int,
    db: Session = Depends(get_db),
):
    dept = get_department(db, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    return DepartmentItem(
        id=dept.id,
        name=dept.name,
        description=dept.description,
        document_count=0,
        created_at=dept.created_at,
    )


@router.patch(
    "/{department_id}",
    response_model=DepartmentItem,
)
def edit_department(
    department_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
):
    dept = update_department(db, department_id, payload.name, payload.description)
    return DepartmentItem(
        id=dept.id,
        name=dept.name,
        description=dept.description,
        document_count=0,
        created_at=dept.created_at,
    )


@router.delete(
    "/{department_id}",
)
def remove_department(
    department_id: int,
    force: bool = Query(default=False, description="Force deletion even if documents reference it"),
    db: Session = Depends(get_db),
):
    success = delete_department(db, department_id, force=force)
    return {"success": success, "message": f"Department {department_id} deleted successfully."}
