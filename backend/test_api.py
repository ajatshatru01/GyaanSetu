import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
from app.services.department_service import seed_default_departments
from app.services.tag_service import seed_default_tags

# Use in-memory SQLite for comprehensive API testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_default_tags(db)
    seed_default_departments(db)
    db.close()


def teardown_module():
    Base.metadata.drop_all(bind=engine)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_departments_crud():
    # 1. List default departments
    response = client.get("/api/departments/")
    assert response.status_code == 200
    depts = response.json()
    assert len(depts) >= 6
    names = [d["name"] for d in depts]
    assert "Rolling Stock" in names
    assert "Signaling" in names

    # 2. Create custom department
    create_res = client.post(
        "/api/departments/",
        json={"name": "Operations & Telecom", "description": "Station telecommunications and dispatch."},
    )
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["name"] == "Operations & Telecom"
    dept_id = created["id"]

    # 3. Edit department
    patch_res = client.patch(
        f"/api/departments/{dept_id}",
        json={"name": "Telecom & Dispatch", "description": "Updated description."},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Telecom & Dispatch"

    # 4. Delete department
    del_res = client.delete(f"/api/departments/{dept_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


def test_tags_crud_and_edit():
    # 1. Get default seeded tags
    response = client.get("/api/tags/")
    assert response.status_code == 200
    tags = response.json()
    assert len(tags) >= 5

    # 2. Create custom tag
    new_tag = {
        "id": "custom_audit_test",
        "label": "Audit 2026",
        "bgClass": "bg-transparent",
        "borderClass": "border-[#9333ea]",
        "textClass": "text-[#9333ea]",
        "hex": "#9333ea",
    }
    create_res = client.post("/api/tags/", json=new_tag)
    assert create_res.status_code == 200

    # 3. Edit global tag (PATCH)
    patch_res = client.patch(
        "/api/tags/custom_audit_test",
        json={"label": "Audit 2026 Revised", "hex": "#10b981"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["label"] == "Audit 2026 Revised"
    assert patch_res.json()["hex"] == "#10b981"

    # 4. Delete custom tag
    del_res = client.delete("/api/tags/custom_audit_test")
    assert del_res.status_code == 200


def test_document_lifecycle_and_reorder():
    # 1. Upload v1.0 document with custom timestamp
    file_content = b"# Pantograph Inspection SOP\n\nCant deficiency is 100mm on mainline tracks."
    file_obj = io.BytesIO(file_content)

    upload_res = client.post(
        "/api/documents/",
        files={"file": ("Pantograph_Inspection.pdf", file_obj, "application/pdf")},
        data={
            "title": "Pantograph Inspection SOP",
            "department": "Rolling Stock",
            "version": "v1.0",
            "docStatus": "Current",
            "uploadedAt": "2026-08-20T10:00:00Z",
        },
    )
    assert upload_res.status_code == 200
    doc1 = upload_res.json()
    assert doc1["name"] == "Pantograph_Inspection.pdf"
    assert doc1["version"] == "v1.0"
    assert doc1["docStatus"] == "Current"
    assert doc1["order_index"] == 0
    doc1_id = doc1["id"]
    doc1_lineage = doc1["lineageId"]

    # 2. Upload v2.0 document in same lineage (supersedes v1.0)
    file_content2 = b"# Pantograph Inspection SOP v2\n\nCant deficiency updated to 100mm."
    file_obj2 = io.BytesIO(file_content2)

    upload_res2 = client.post(
        "/api/documents/",
        files={"file": ("Pantograph_Inspection_v2.pdf", file_obj2, "application/pdf")},
        data={
            "title": "Pantograph Inspection SOP v2",
            "department": "Rolling Stock",
            "version": "v2.0",
            "lineageId": doc1_lineage,
            "docStatus": "Current",
        },
    )
    assert upload_res2.status_code == 200
    doc2 = upload_res2.json()
    assert doc2["version"] == "v2.0"
    assert doc2["docStatus"] == "Current"
    doc2_id = doc2["id"]

    # Check auto-demotion of doc1
    doc1_check = client.get(f"/api/documents/{doc1_id}").json()
    assert doc1_check["docStatus"] == "Older Version"

    # 3. Test bulk reordering
    reorder_res = client.patch(
        "/api/documents/reorder",
        json={"documents": [{"id": doc1_id, "order_index": 1}, {"id": doc2_id, "order_index": 0}]},
    )
    assert reorder_res.status_code == 200

    # 4. Test single doc order update
    order_res = client.put(f"/api/documents/{doc1_id}/order", json={"order_index": 5})
    assert order_res.status_code == 200
    assert order_res.json()["order_index"] == 5

    # 5. Test ZIP vault export
    export_res = client.get("/api/documents/export?department=Rolling+Stock")
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/zip"
    assert len(export_res.content) > 0

    # 6. Delete document
    del_res = client.delete(f"/api/documents/{doc1_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


def test_diagnostics():
    response = client.get("/api/diagnostics/")
    assert response.status_code == 200
    diag = response.json()
    assert "hardware" in diag
    assert "database" in diag
    assert "pipeline" in diag
    assert diag["database"]["engine"] == "PostgreSQL + pgvector"
    assert diag["database"]["vector_index_type"] == "HNSW (pgvector)"
    assert "avg_retrieval_latency_ms" in diag["database"]
    assert diag["pipeline"]["llm_context_window"] == 1000000


def test_query_endpoint():
    query_payload = {
        "query": "What is the permissible cant deficiency for 25kV OHE?",
        "includeOlderVersions": False,
        "department": "Rolling Stock",
    }
    response = client.post("/api/query/", json=query_payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data


if __name__ == "__main__":
    setup_module()
    test_health_check()
    test_departments_crud()
    test_tags_crud_and_edit()
    test_document_lifecycle_and_reorder()
    test_diagnostics()
    test_query_endpoint()
    print("ALL AUDIT & GAP TESTS PASSED SUCCESSFULLY!")
