import logging
from functools import lru_cache
from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache
def get_embedding_model():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(settings.embedding_model)
    except Exception as e:
        logger.error(f"Failed to load embedding model {settings.embedding_model}: {e}")
        return None


def generate_embedding(
    text: str,
) -> list[float]:
    model = get_embedding_model()
    if not model or not text.strip():
        # Fallback zero vector
        return [0.0] * settings.embedding_dimension

    try:
        embedding = model.encode(
            text,
            normalize_embeddings=True,
        )
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Embedding encoding error: {e}")
        return [0.0] * settings.embedding_dimension


def generate_embeddings(
    texts: list[str],
) -> list[list[float]]:
    if not texts:
        return []

    model = get_embedding_model()
    if not model:
        return [[0.0] * settings.embedding_dimension for _ in texts]

    try:
        embeddings = model.encode(
            texts,
            batch_size=32,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return embeddings.tolist()
    except Exception as e:
        logger.error(f"Batch embedding error: {e}")
        return [[0.0] * settings.embedding_dimension for _ in texts]