from functools import lru_cache
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "GyaanSetu MMRCL Document Intelligence"

    debug: bool = True

    database_url: str = "postgresql://postgres:postgres@localhost:5432/gyaansetu"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dimension: int = 384

    storage_path: str = "storage/documents"

    chunk_size: int = 1200
    chunk_overlap: int = 200

    top_k: int = 15

    max_file_size_mb: int = 100

    cors_origins: list[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        extra="ignore",
    )

    @property
    def resolved_storage_path(self) -> str:
        if os.path.isabs(self.storage_path):
            return self.storage_path
        return str(BACKEND_DIR / self.storage_path)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()