from sqlalchemy.orm import Session

from app.rag.generator import generate_answer
from app.rag.retriever import retrieve_chunks
from app.services.document_service import get_file_type_info


def answer_query(
    db: Session,
    query: str,
    top_k: int | None = None,
    include_older_versions: bool = False,
    department: str | None = None,
    document_id: int | None = None,
) -> dict:
    results = retrieve_chunks(
        db=db,
        query=query,
        top_k=top_k,
        include_older_versions=include_older_versions,
        department=department,
        document_id=document_id,
    )

    if not results:
        version_scope = "across all document versions" if include_older_versions else "in current active documents"
        return {
            "answer": (
                f"I could not find relevant information {version_scope} in the MMRCL knowledge base for your query. "
                "Please verify if the relevant manual or circular has been uploaded to the Document Hub."
            ),
            "sources": [],
        }

    contexts = []
    sources = []

    for chunk, distance in results:
        doc = chunk.document
        sim_score = max(0.0, min(1.0, 1.0 - (distance / 2.0)))
        relevance_pct = f"{sim_score * 100:.1f}% Match"

        file_info = get_file_type_info(doc.filename if doc else "document.pdf")
        page_str = f"Page {chunk.page_number}" if chunk.page_number else "Page 1"
        chunk_label = f"Chunk #{chunk.chunk_index + 1} ({page_str})"

        # If docStatus is Older Version, style icon with amber color
        icon_color = "text-amber-700" if (doc and doc.doc_status == "Older Version") else file_info["color"]

        context_item = {
            "document_title": doc.title if doc else "Document",
            "document_name": doc.filename if doc else "document.pdf",
            "department": doc.department if doc else "General",
            "version": doc.version if doc else "v1.0",
            "doc_status": doc.doc_status if doc else "Current",
            "page_number": chunk.page_number,
            "section": chunk.section,
            "subsection": chunk.subsection,
            "content": chunk.content,
        }
        contexts.append(context_item)

        sources.append({
            "chunkId": chunk_label,
            "chunk_id": chunk_label,
            "document_id": doc.id if doc else chunk.document_id,
            "docName": doc.filename if doc else "document.pdf",
            "document_title": doc.title if doc else "Document",
            "department": doc.department if doc else "General",
            "version": doc.version if doc else "v1.0",
            "docStatus": doc.doc_status if doc else "Current",
            "doc_status": doc.doc_status if doc else "Current",
            "page_number": chunk.page_number,
            "section": chunk.section,
            "subsection": chunk.subsection,
            "element_type": chunk.element_type,
            "relevance": relevance_pct,
            "similarity_score": round(sim_score, 4),
            "snippet": chunk.content[:280] + ("..." if len(chunk.content) > 280 else ""),
            "content": chunk.content,
            "icon": file_info["icon"],
            "iconColor": icon_color,
        })

    answer = generate_answer(
        query=query,
        contexts=contexts,
        include_older_versions=include_older_versions,
    )

    return {
        "answer": answer,
        "sources": sources,
    }