import json
import logging
from functools import lru_cache

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache
def get_gemini_client():
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY is not set. LLM calls will use fallback simulation.")
        return None
    try:
        from google import genai
        return genai.Client(api_key=settings.gemini_api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini Client: {e}")
        return None


def generate_text(
    prompt: str,
    system_instruction: str | None = None,
) -> str:
    client = get_gemini_client()

    if not client:
        return (
            "**MMRCL Knowledge Base Answer**\n\n"
            "Based on the retrieved MMRCL engineering manuals and documents:\n\n"
            "- Context retrieved successfully from PostgreSQL pgvector store.\n"
            "- Please configure `GEMINI_API_KEY` in `.env` to enable live AI generative answers."
        )

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={
                "system_instruction": system_instruction if system_instruction else None,
            },
        )
        return response.text or "No response generated."
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        return f"Unable to generate response from Gemini API: {str(e)}"


def extract_document_metadata_ai(
    text_sample: str,
    filename: str,
) -> dict:
    """
    Use Gemini to extract structured metadata (title, doc_type, project, department, dates, contract numbers)
    from representative document text.
    """
    client = get_gemini_client()
    if not client or not text_sample:
        return {}

    prompt = f"""You are an expert MMRCL Document Analyst. Extract metadata from the following document sample.
Filename: {filename}

Sample Text:
{text_sample[:4000]}

Return ONLY a valid JSON object with the following keys (use null if not found):
{{
  "title": "extracted or clean document title",
  "document_type": "DPR | TECHNICAL_REPORT | SPECIFICATION | INSPECTION_REPORT | TENDER | CONTRACT | BOQ | INVOICE | MEETING_MINUTES | SAFETY_REPORT | SOP | OTHER",
  "project": "Mumbai Metro Line X or Project Name",
  "department": "Rolling Stock | Signaling | Civil | Procurement | Safety & Compliance | Power & Traction | General",
  "year": 2026,
  "version": "v1.0 or extracted version",
  "revision_label": "A / B / Rev 1",
  "contract_number": "MMRCL/... or null",
  "tender_number": "Tender/... or null"
}}
"""
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        if response.text:
            return json.loads(response.text)
    except Exception as e:
        logger.warning(f"AI metadata extraction failed: {e}")
    return {}
