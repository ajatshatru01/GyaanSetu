import logging
import os
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


def extract_fallback_pdf_pages(file_path: str) -> list[str]:
    pages = []
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text)
    except Exception:
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(file_path)
            for page in reader.pages:
                text = page.extract_text() or ""
                pages.append(text)
        except Exception:
            pass
    return pages


class FallbackDoc:
    def __init__(self, text: str, page_texts: list[str] | None = None):
        self.text = text
        self.page_texts = page_texts or []
        self.pages = list(range(1, max(2, len(self.page_texts) + 1))) if self.page_texts else [1]

    def export_to_markdown(self) -> str:
        if self.page_texts:
            parts = []
            for idx, pt in enumerate(self.page_texts, 1):
                clean_pt = pt.strip()
                if clean_pt:
                    parts.append(f"<!-- page {idx} -->\n{clean_pt}")
            if parts:
                return "\n\n".join(parts)
        return self.text


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

    # Fallback for PDF or plain text
    ext = path.suffix.lower()
    if ext == ".pdf":
        pdf_pages = extract_fallback_pdf_pages(file_path)
        if pdf_pages:
            return FallbackDoc(text="\n\n".join(pdf_pages), page_texts=pdf_pages)

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            return FallbackDoc(content)
    except Exception:
        return FallbackDoc(f"# Document {path.name}\n\nContent could not be extracted.")


def extract_markdown_with_pages(docling_doc, file_path: str = "") -> str:
    """
    Extract structured markdown with explicit <!-- page N --> comment markers
    from a Docling Document or fallback document.
    """
    if docling_doc is None:
        return ""

    # 1. If it's a FallbackDoc, use its export_to_markdown
    if isinstance(docling_doc, FallbackDoc):
        return docling_doc.export_to_markdown()

    # 2. If it's a DoclingDocument, iterate over items and track page provenance
    if hasattr(docling_doc, "iterate_items"):
        try:
            lines = []
            current_page = None

            for item, level in docling_doc.iterate_items():
                # Extract page number from provenance
                page_no = 1
                if hasattr(item, "prov") and item.prov:
                    for p in item.prov:
                        if hasattr(p, "page_no") and p.page_no:
                            page_no = p.page_no
                            break

                # When encountering a new page, emit page boundary comment
                if page_no != current_page:
                    current_page = page_no
                    lines.append(f"\n<!-- page {current_page} -->\n")

                # Export element content
                item_rendered = False
                if hasattr(item, "export_to_markdown"):
                    try:
                        md = item.export_to_markdown()
                        if md and md.strip():
                            lines.append(md.strip())
                            item_rendered = True
                    except Exception:
                        pass

                if not item_rendered:
                    text = getattr(item, "text", "")
                    if text and text.strip():
                        cls_name = item.__class__.__name__
                        if "Header" in cls_name or "Heading" in cls_name or "Title" in cls_name:
                            prefix = "#" * min(6, max(1, level + 1))
                            lines.append(f"{prefix} {text.strip()}")
                        else:
                            lines.append(text.strip())

            result_md = "\n\n".join(lines).strip()
            if result_md:
                return result_md
        except Exception as e:
            logger.warning(f"iterate_items page extraction error: {e}")

    # 3. If standard export_to_markdown exists, check for page breaks
    if hasattr(docling_doc, "export_to_markdown"):
        try:
            std_md = docling_doc.export_to_markdown()
            if std_md and std_md.strip():
                if "\f" in std_md:
                    pages = std_md.split("\f")
                    parts = []
                    for idx, p in enumerate(pages, 1):
                        clean_p = p.strip()
                        if clean_p:
                            parts.append(f"<!-- page {idx} -->\n{clean_p}")
                    return "\n\n".join(parts)
                return std_md
        except Exception as e:
            logger.warning(f"Standard export_to_markdown error: {e}")

    # 4. Fallback reading from file if available
    if file_path and os.path.exists(file_path):
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            pdf_pages = extract_fallback_pdf_pages(file_path)
            if pdf_pages:
                parts = []
                for idx, pt in enumerate(pdf_pages, 1):
                    clean_pt = pt.strip()
                    if clean_pt:
                        parts.append(f"<!-- page {idx} -->\n{clean_pt}")
                if parts:
                    return "\n\n".join(parts)

    return f"# Document\n\nContent could not be extracted."