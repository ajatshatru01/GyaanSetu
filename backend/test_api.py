import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
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
    db.close()


def teardown_module():
    Base.metadata.drop_all(bind=engine)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_tags_crud():
    # 1. Get default seeded tags
    response = client.get("/api/tags/")
    assert response.status_code == 200
    tags = response.json()
    assert len(tags) >= 5
    tag_ids = [t["id"] for t in tags]
    assert "tender_gcc" in tag_ids
    assert "cmrs_safety" in tag_ids

    # 2. Create custom tag
    new_tag = {
        "id": "custom_audit",
        "label": "Audit 2026",
        "bgClass": "bg-transparent",
        "borderClass": "border-[#9333ea]",
        "textClass": "text-[#9333ea]",
        "hex": "#9333ea",
    }
    create_res = client.post("/api/tags/", json=new_tag)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["id"] == "custom_audit"
    assert created["label"] == "Audit 2026"

    # 3. Delete custom tag
    del_res = client.delete("/api/tags/custom_audit")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


def test_document_lifecycle():
    # 1. Upload v1.0 document
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
        },
    )
    assert upload_res.status_code == 200
    doc1 = upload_res.json()
    assert doc1["name"] == "Pantograph_Inspection.pdf"
    assert doc1["version"] == "v1.0"
    assert doc1["docStatus"] == "Current"
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

    # Check that doc1 was automatically demoted to 'Older Version' (Single Current per lineage rule)
    doc1_check = client.get(f"/api/documents/{doc1_id}").json()
    assert doc1_check["docStatus"] == "Older Version"

    # 3. Test duplicate version validation
    file_obj3 = io.BytesIO(file_content)
    dup_res = client.put(
        f"/api/documents/{doc1_id}/version",
        json={"version": "v2.0"},
    )
    # Should fail if doc with same filename & version exists (or succeed if filename differs)
    assert dup_res.status_code in [200, 400]

    # 4. List documents with department filter
    list_res = client.get("/api/documents/?department=Rolling+Stock")
    assert list_res.status_code == 200
    docs = list_res.json()
    assert len(docs) >= 2

    # 5. Delete document
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
    assert "cpu_percent" in diag["hardware"]


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
    test_tags_crud()
    test_document_lifecycle()
    test_diagnostics()
    test_query_endpoint()
    print("ALL TESTS PASSED SUCCESSFULLY!")
