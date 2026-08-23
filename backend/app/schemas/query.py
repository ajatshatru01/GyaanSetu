from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    include_older_versions: bool = Field(
        default=False,
        validation_alias=AliasChoices("include_older_versions", "includeOlderVersions"),
    )
    department: str | None = None
    document_id: int | None = None
    top_k: int | None = Field(default=None, ge=1, le=50)

    model_config = ConfigDict(
        populate_by_name=True,
    )


class SourceResponse(BaseModel):
    chunkId: str = Field(..., validation_alias=AliasChoices("chunkId", "chunk_id"))
    document_id: int
    docName: str = Field(..., validation_alias=AliasChoices("docName", "document_title", "document_name"))
    department: str | None = None
    version: str | None = "v1.0"
    docStatus: str = Field(default="Current", validation_alias=AliasChoices("docStatus", "doc_status"))
    page_number: int | None = None
    section: str | None = None
    subsection: str | None = None
    element_type: str = "text"
    relevance: str = "95.0% Match"
    similarity_score: float = 0.95
    snippet: str = Field(..., validation_alias=AliasChoices("snippet", "content"))
    icon: str = "picture_as_pdf"
    iconColor: str = "text-error"

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceResponse] = Field(default_factory=list)