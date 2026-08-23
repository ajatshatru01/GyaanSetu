from app.core.config import settings


print("Application:", settings.app_name)

print(
    "Database:",
    settings.database_url
)

print(
    "Gemini model:",
    settings.gemini_model
)

print(
    "Embedding model:",
    settings.embedding_model
)

print(
    "Embedding dimension:",
    settings.embedding_dimension
)

print(
    "Gemini key loaded:",
    bool(settings.gemini_api_key)
)