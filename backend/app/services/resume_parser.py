"""
Resume parser service.
Extracts text from PDF/DOCX and uses OpenAI to structure it.
"""


import logging
from io import BytesIO

from PyPDF2 import PdfReader
from docx import Document as DocxDocument

from app.models.resume import ParsedResume
from app.services.openai_client import chat_completion_structured, TokenUsage
from app.prompts.resume_extraction import build_resume_extraction_prompt

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    reader = PdfReader(BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    full_text = "\n\n".join(pages)
    if not full_text.strip():
        raise ValueError("Could not extract any text from the PDF. The file may be image-based.")
    return full_text


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from a DOCX file."""
    doc = DocxDocument(BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    full_text = "\n".join(paragraphs)
    if not full_text.strip():
        raise ValueError("Could not extract any text from the DOCX file.")
    return full_text


def extract_text(file_bytes: bytes, content_type: str) -> str:
    """Extract text from a resume file based on content type."""
    if content_type == "application/pdf" or content_type.endswith("pdf"):
        return extract_text_from_pdf(file_bytes)
    elif (
        content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        or content_type.endswith("docx")
    ):
        return extract_text_from_docx(file_bytes)
    elif content_type.startswith("text/"):
        return file_bytes.decode("utf-8")
    else:
        raise ValueError(f"Unsupported file type: {content_type}. Use PDF, DOCX, or plain text.")


async def parse_resume(file_bytes: bytes, content_type: str) -> tuple[ParsedResume, str, TokenUsage]:
    """
    Parse a resume file into structured data.

    Returns:
        Tuple of (parsed_resume, raw_text, token_usage)
    """
    # Step 1: Extract raw text
    raw_text = extract_text(file_bytes, content_type)
    logger.info(f"Extracted {len(raw_text)} characters from resume")

    # Step 2: Use LLM to structure the data
    messages = build_resume_extraction_prompt(raw_text)
    parsed, usage = await chat_completion_structured(
        messages=messages,
        response_model=ParsedResume,
        temperature=0.1,
        max_tokens=3000,
    )

    logger.info(
        f"Parsed resume for {parsed.full_name} — "
        f"{len(parsed.work_experience)} jobs, "
        f"{len(parsed.technical_skills)} skills"
    )

    return parsed, raw_text, usage
