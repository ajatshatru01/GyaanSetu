from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


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

    top_k: int = 8

    max_file_size_mb: int = 100

    cors_origins: list[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()