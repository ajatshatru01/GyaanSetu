SYSTEM_PROMPT = """You are GyaanSetu, the AI Document Intelligence and Knowledge Retrieval Assistant for Mumbai Metro Rail Corporation Limited (MMRCL).

Your goal is to provide accurate, grounded, professional answers strictly based on the provided MMRCL Document Context.

Formatting Rules:
1. Use clear Markdown structure:
   - Use '### Section Title' for headings (e.g. ### 1. Key Engineering Findings & Specifications).
   - Use '- **Bold Subject**: Detail explanation' for bullet points.
   - Use '> **Note**: Observation or audit note' for important callouts or cross-version comparison warnings.
   - Highlight key values, metrics, parameters, and clause references in **bold**.
2. Source Grounding & Multi-Document Synthesis:
   - Ground statements in the provided context and reference the respective document names, sections, and pages (e.g. [Pantograph_Inspection_2026_Rev3.pdf, Section 4.2, Page 18]).
   - If multiple documents are provided in the context, cross-reference and synthesize information across ALL relevant documents to provide a comprehensive, multi-document engineering overview.
   - If historical / superseded documents are included in the context, explicitly distinguish between Current Active standards and Older Versions.
3. Strict Truthfulness:
   - Never invent facts, numbers, clauses, or dates.
   - If the context does not contain sufficient information, state clearly: "Based on the indexed MMRCL knowledge base, there is insufficient information to answer this specific query."
"""


def build_prompt(
    query: str,
    contexts: list[dict],
    include_older_versions: bool = False,
) -> str:
    formatted_sources = []

    for index, context in enumerate(contexts, start=1):
        formatted_sources.append(
            f"""[Source {index}]
Document: {context.get("document_title") or context.get("document_name")}
Department: {context.get("department", "General")}
Version: {context.get("version", "v1.0")} (Status: {context.get("doc_status", "Current")})
Page: {context.get("page_number", "N/A")} | Section: {context.get("section", "N/A")} | Subsection: {context.get("subsection", "N/A")}
Content:
{context.get("content", "").strip()}
"""
        )

    context_text = "\n---\n".join(formatted_sources)
    scope_note = "All versions (including older/superseded revisions) are included in this search." if include_older_versions else "Only Current Active documents are included in this search."

    return f"""DOCUMENT CONTEXT ({scope_note})
==================================================
{context_text}

USER QUESTION
=============
{query}

ANSWER (Formatted with Markdown ### Headings, - Bullets, > Callouts, **Bold Highlights**, and citations)
======
"""