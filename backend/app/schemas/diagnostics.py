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
    db_port: int = 5432
    total_documents: int = 0
    total_chunks: int = 0
    vector_dimension: int = 384
    vector_index_type: str = "HNSW (pgvector)"
    avg_retrieval_latency_ms: float = 18.5
    active_connections: int = 1


class PipelineTelemetry(BaseModel):
    ocr_engine: str = "Docling Layout & Table Parser"
    ocr_throughput_pages_per_sec: str = "~4.5 pages/sec"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_batch_speed: str = "~120 docs/sec"
    llm_model: str = "gemini-2.5-flash"
    llm_context_window: int = 1000000
    llm_generation_speed_tps: str = "~65 tokens/sec"
    status: str = "Operational"


class DiagnosticsResponse(BaseModel):
    hardware: HardwareTelemetry
    database: DatabaseTelemetry
    pipeline: PipelineTelemetry
