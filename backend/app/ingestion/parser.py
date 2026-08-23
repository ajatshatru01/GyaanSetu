import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_converter = None


def get_converter():
    global _converter
    if _converter is None:
        try:
            from docling.document_converter import DocumentConverter
            _converter = DocumentConverter()
        except Exception as e:
            logger.warning(f"Docling DocumentConverter init failed: {e}")
            _converter = None
    return _converter


def parse_document(file_path: str):
    """
    Convert a document into structured markdown / elements using Docling.
    Falls back gracefully if needed.
    """
    path = Path(file_path)
    converter = get_converter()

    if converter:
        try:
            result = converter.convert(path)
            return result.document
        except Exception as e:
            logger.error(f"Docling parsing error for {file_path}: {e}")

    # Fallback minimal mock document wrapper if Docling is unavailable
    class FallbackDoc:
        def __init__(self, text: str):
            self.text = text
            self.pages = [1]

        def export_to_markdown(self) -> str:
            return self.text

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            return FallbackDoc(content)
    except Exception:
        return FallbackDoc(f"# Document {path.name}\n\nContent could not be extracted.")