from pydantic import BaseModel, Field


class HardwareTelemetry(BaseModel):
    cpu_percent: float = Field(..., description="CPU Load Percentage")
    ram_used_gb: float = Field(..., description="RAM Used in GB")
    ram_total_gb: float = Field(..., description="RAM Total in GB")
    ram_percent: float = Field(..., description="RAM Usage Percentage")
    disk_used_gb: float = Field(..., description="Disk Used in GB")
    disk_total_gb: float = Field(..., description="Disk Total in GB")
    disk_percent: float = Field(..., description="Disk Storage Percentage")


class DatabaseTelemetry(BaseModel):
    status: str = "Connected"
    engine: str = "PostgreSQL + pgvector"
    total_documents: int = 0
    total_chunks: int = 0
    vector_dimension: int = 384
    active_connections: int = 1


class PipelineTelemetry(BaseModel):
    ocr_engine: str = "Docling Layout & Table Parser"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    llm_model: str = "gemini-2.5-flash"
    status: str = "Operational"


class DiagnosticsResponse(BaseModel):
    hardware: HardwareTelemetry
    database: DatabaseTelemetry
    pipeline: PipelineTelemetry
