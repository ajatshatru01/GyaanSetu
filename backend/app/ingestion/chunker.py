import re
from dataclasses import dataclass


@dataclass
class TextChunk:
    content: str
    page_number: int | None
    section: str | None
    subsection: str | None
    element_type: str
    chunk_index: int


def split_text(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[str]:
    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = end - chunk_overlap

    return chunks


def create_chunks(
    markdown: str,
    chunk_size: int = 1200,
    chunk_overlap: int = 200,
) -> list[TextChunk]:
    """
    Structure-aware chunker.
    Docling exports the document into Markdown, preserving heading hierarchy,
    table elements, and page breaks.
    """
    lines = markdown.splitlines()
    chunks: list[TextChunk] = []

    current_section = None
    current_subsection = None
    current_page = 1

    buffer = []
    chunk_index = 0

    def flush_buffer(element_type="text"):
        nonlocal chunk_index
        if not buffer:
            return

        text = "\n".join(buffer).strip()
        if not text:
            return

        parts = split_text(
            text,
            chunk_size,
            chunk_overlap,
        )

        for part in parts:
            chunks.append(
                TextChunk(
                    content=part,
                    page_number=current_page,
                    section=current_section,
                    subsection=current_subsection,
                    element_type=element_type,
                    chunk_index=chunk_index,
                )
            )
            chunk_index += 1

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Page detection (e.g. Docling <!-- page 2 --> or Page 2)
        page_match = re.search(r'<!--\s*(?:page|Page)\s*(\d+)\s*-->', stripped)
        if page_match:
            flush_buffer()
            buffer.clear()
            current_page = int(page_match.group(1))
            continue

        # H1/H2
        if stripped.startswith("# "):
            flush_buffer()
            buffer.clear()
            current_section = stripped[2:].strip()
            current_subsection = None
            continue

        # H3/H4/etc.
        if stripped.startswith("##"):
            flush_buffer()
            buffer.clear()
            current_subsection = stripped.lstrip("#").strip()
            continue

        # Markdown table
        if stripped.startswith("|"):
            buffer.append(stripped)
        else:
            buffer.append(stripped)

    flush_buffer()
    return chunks