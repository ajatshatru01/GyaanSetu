from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Department, Document

DEFAULT_DEPARTMENTS = [
    {"name": "Rolling Stock", "description": "Metro coaches, bogies, pantographs, and traction propulsion systems."},
    {"name": "Signaling", "description": "CBTC ATS, train control, interlocking, and telemetry systems."},
    {"name": "Civil", "description": "Track, tunnels, viaducts, drainage, and station structural works."},
    {"name": "Procurement", "description": "Tenders, contracts, GCC, vendor SLA, and supply chain documents."},
    {"name": "Safety & Compliance", "description": "CMRS clearances, hazard logs, audits, and safety SOPs."},
    {"name": "Power & Traction", "description": "25kV AC OHE, substations, third rail, and electrical distribution."},
]


def seed_default_departments(db: Session):
    for dept_data in DEFAULT_DEPARTMENTS:
        existing = db.execute(
            select(Department).where(Department.name.ilike(dept_data["name"]))
        ).scalars().first()
        if not existing:
            dept = Department(
                name=dept_data["name"],
                description=dept_data["description"],
            )
            db.add(dept)
    db.commit()


def get_all_departments(db: Session) -> list[dict]:
    statement = select(Department).order_by(Department.id.asc())
    depts = db.execute(statement).scalars().all()
    if not depts:
        seed_default_departments(db)
        depts = db.execute(statement).scalars().all()

    result = []
    for d in depts:
        doc_count = db.scalar(
            select(func.count(Document.id)).where(Document.department.ilike(d.name))
        ) or 0
        result.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "document_count": doc_count,
            "created_at": d.created_at,
        })
    return result


def get_department(db: Session, department_id: int) -> Department | None:
    return db.get(Department, department_id)


def create_department(db: Session, name: str, description: str | None = None) -> Department:
    clean_name = name.strip()
    existing = db.execute(
        select(Department).where(Department.name.ilike(clean_name))
    ).scalars().first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Department '{clean_name}' already exists.",
        )

    dept = Department(
        name=clean_name,
        description=description,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def update_department(
    db: Session,
    department_id: int,
    name: str | None = None,
    description: str | None = None,
) -> Department:
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    old_name = dept.name
    if name is not None and name.strip():
        new_name = name.strip()
        # Check duplicate name if changed
        if new_name.lower() != old_name.lower():
            existing = db.execute(
                select(Department).where(Department.name.ilike(new_name))
            ).scalars().first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Department '{new_name}' already exists.")

        dept.name = new_name

        # Cascade rename on documents
        docs = db.execute(
            select(Document).where(Document.department.ilike(old_name))
        ).scalars().all()
        for doc in docs:
            doc.department = new_name

    if description is not None:
        dept.description = description

    db.commit()
    db.refresh(dept)
    return dept


def delete_department(db: Session, department_id: int, force: bool = False) -> bool:
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    # Guard: check if any document is currently assigned to this department
    doc_count = db.scalar(
        select(func.count(Document.id)).where(Document.department.ilike(dept.name))
    ) or 0

    if doc_count > 0 and not force:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete department '{dept.name}' because {doc_count} document(s) are assigned to it. Reassign or delete those documents first, or use force=true.",
        )

    db.delete(dept)
    db.commit()
    return True
