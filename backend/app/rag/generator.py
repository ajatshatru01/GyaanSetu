from app.llm.gemini import generate_text
from app.rag.prompt import (
    SYSTEM_PROMPT,
    build_prompt,
)


def generate_answer(
    query: str,
    contexts: list[dict],
    include_older_versions: bool = False,
) -> str:
    prompt = build_prompt(
        query=query,
        contexts=contexts,
        include_older_versions=include_older_versions,
    )

    return generate_text(
        prompt=prompt,
        system_instruction=SYSTEM_PROMPT,
    )