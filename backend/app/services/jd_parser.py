"""
Job description parser service.
Extracts structured requirements from JD text using OpenAI.
"""


import logging

from app.models.resume import ParsedJobDescription
from app.services.openai_client import chat_completion_structured, TokenUsage
from app.prompts.jd_extraction import build_jd_extraction_prompt

logger = logging.getLogger(__name__)


async def parse_job_description(raw_text: str) -> tuple[ParsedJobDescription, TokenUsage]:
    """
    Parse a job description text into structured data.

    Returns:
        Tuple of (parsed_jd, token_usage)
    """
    if len(raw_text.strip()) < 50:
        raise ValueError("Job description text is too short. Please provide a more detailed description.")

    messages = build_jd_extraction_prompt(raw_text)
    parsed, usage = await chat_completion_structured(
        messages=messages,
        response_model=ParsedJobDescription,
        temperature=0.1,
        max_tokens=2000,
    )

    logger.info(
        f"Parsed JD for {parsed.role_title} at {parsed.company or 'Unknown'} — "
        f"{len(parsed.required_skills)} required skills"
    )

    return parsed, usage
