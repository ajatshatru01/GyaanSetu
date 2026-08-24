from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class DepartmentItem(BaseModel):
    id: int
    name: str
    description: str | None = None
    document_count: int = 0
    created_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
