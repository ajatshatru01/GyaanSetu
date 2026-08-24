from datetime import datetime
from typing import Any
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from app.schemas.tag import TagItem


class DocumentStatusUpdate(BaseModel):
    status: str = Field(..., description="'Current' or 'Older Version'")


class DocumentVersionUpdate(BaseModel):
    version: str = Field(..., description="Document version e.g. 'v1.1'")


class DocumentTagsUpdate(BaseModel):
    tags: list[TagItem] = Field(default_factory=list)


class DocumentOrderUpdate(BaseModel):
    order_index: int = Field(..., description="Sort order index")


class ReorderItem(BaseModel):
    id: int | str
    order_index: int = Field(default=0, validation_alias=AliasChoices("order_index", "orderIndex"))


class ReorderDocumentsRequest(BaseModel):
    documents: list[ReorderItem] = Field(default_factory=list)


class DocumentUpdate(BaseModel):
    title: str | None = None
    department: str | None = None
    project: str | None = None
    document_type: str | None = None
    year: int | None = None
    version: str | None = None
    doc_status: str | None = None
    lineage_id: str | None = None
    order_index: int | None = None
    tags: list[TagItem] | None = None


class DocumentResponse(BaseModel):
    id: str | int
    lineageId: str | None = Field(default=None, validation_alias=AliasChoices("lineageId", "lineage_id"))
    name: str = Field(default="", description="Filename or display name")
    title: str
    filename: str
    document_type: str | None = None
    project: str | None = None
    department: str | None = None
    year: int | None = None
    version: str = "v1.0"
    revision_label: str | None = None
    docStatus: str = Field(default="Current", validation_alias=AliasChoices("docStatus", "doc_status"))
    order_index: int = 0
    file_path: str
    file_hash: str | None = None
    file_size: int = 0
    size: str = Field(default="0 B", validation_alias=AliasChoices("size", "formatted_size"))
    page_count: int | None = None
    status: Any = Field(default_factory=lambda: {"label": "Indexed", "type": "secondary"})
    action: str = "Re-index"
    actionColor: str = "text-secondary hover:text-primary"
    icon: dict = Field(default_factory=lambda: {"name": "picture_as_pdf", "color": "text-error"})
    tags: list[dict] = Field(default_factory=list)
    uploadedAt: datetime | str | None = Field(default=None, validation_alias=AliasChoices("uploadedAt", "created_at"))
    error_message: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )