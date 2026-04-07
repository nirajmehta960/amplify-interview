from typing import Optional, List, Dict
"""
Resume and Job Description API router.
Handles file uploads, parsing, matching, and retrieval.
"""


import logging

from fastapi import APIRouter, File, UploadFile, HTTPException, status

from app.middleware.auth import CurrentUser
from app.models.resume import (
    ResumeUploadResponse,
    ResumeListItem,
    JDCreateRequest,
    JDResponse,
    MatchResponse,
)
from app.services import resume_parser, jd_parser, matching_engine
from app.db import firestore as db, storage as gcs
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/resume", tags=["Resume & JD"])


# ── Resume Endpoints ─────────────────────────────────────


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    user: CurrentUser,
    file: UploadFile = File(...),
):
    """Upload and parse a resume (PDF or DOCX)."""
    settings = get_settings()

    # Validate file
    if not file.filename:
        raise HTTPException(400, "No file provided")

    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Use PDF, DOCX, or TXT.")

    content = await file.read()
    if len(content) > settings.max_resume_size_bytes:
        raise HTTPException(400, f"File too large. Maximum size is {settings.max_resume_size_mb}MB.")

    try:
        # Upload to GCS
        gcs_uri = await gcs.upload_file(
            file_content=content,
            file_name=file.filename,
            content_type=file.content_type,
            user_id=user.uid,
            subfolder="resumes",
        )

        # Parse resume
        parsed, raw_text, usage = await resume_parser.parse_resume(content, file.content_type)

        # Save to Firestore
        resume_data = {
            "raw_file_url": gcs_uri,
            "raw_text": raw_text[:50000],  # cap stored text
            "parsed_data": parsed.model_dump(),
            "file_name": file.filename,
            "file_type": file.content_type,
            "tokens_used": usage.total_tokens,
            "cost_cents": usage.cost_cents,
        }

        resume_id = await db.create_document(db.resumes_col(user.uid), resume_data)

        return ResumeUploadResponse(
            resume_id=resume_id,
            file_name=file.filename,
            parsed_data=parsed,
            uploaded_at=resume_data["created_at"],
        )

    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"Resume upload failed: {e}")
        raise HTTPException(500, "Failed to process resume. Please try again.")


@router.get("/list", response_model=list[ResumeListItem])
async def list_resumes(user: CurrentUser):
    """List all uploaded resumes for the current user."""
    docs = await db.list_documents(db.resumes_col(user.uid), limit=20)
    items = []
    for doc in docs:
        parsed = doc.get("parsed_data", {})
        items.append(ResumeListItem(
            resume_id=doc["id"],
            file_name=doc.get("file_name", "Unknown"),
            full_name=parsed.get("full_name", "Unknown"),
            uploaded_at=doc.get("created_at", ""),
            total_years_experience=parsed.get("total_years_experience"),
            top_skills=parsed.get("technical_skills", [])[:5],
        ))
    return items


@router.get("/{resume_id}")
async def get_resume(user: CurrentUser, resume_id: str):
    """Get a specific parsed resume."""
    doc = await db.get_document(db.resumes_col(user.uid).document(resume_id))
    if not doc:
        raise HTTPException(404, "Resume not found")
    return doc


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(user: CurrentUser, resume_id: str):
    """Delete a resume and its GCS file."""
    doc = await db.get_document(db.resumes_col(user.uid).document(resume_id))
    if not doc:
        raise HTTPException(404, "Resume not found")

    # Delete GCS file
    if doc.get("raw_file_url"):
        try:
            await gcs.delete_file(doc["raw_file_url"])
        except Exception as e:
            logger.warning(f"Failed to delete GCS file: {e}")

    await db.delete_document(db.resumes_col(user.uid).document(resume_id))


# ── Job Description Endpoints ────────────────────────────


@router.post("/jd", response_model=JDResponse, status_code=status.HTTP_201_CREATED)
async def create_job_description(user: CurrentUser, request: JDCreateRequest):
    """Parse and save a job description."""
    settings = get_settings()

    if len(request.raw_text) > settings.max_jd_length:
        raise HTTPException(400, f"JD text too long. Maximum {settings.max_jd_length} characters.")

    try:
        parsed, usage = await jd_parser.parse_job_description(request.raw_text)

        # Override with user-provided fields if available
        if request.company:
            parsed.company = request.company
        if request.role_title:
            parsed.role_title = request.role_title

        jd_data = {
            "raw_text": request.raw_text,
            "parsed_data": parsed.model_dump(),
            "company": parsed.company,
            "role_title": parsed.role_title,
            "tokens_used": usage.total_tokens,
            "cost_cents": usage.cost_cents,
        }

        jd_id = await db.create_document(db.jds_col(user.uid), jd_data)

        return JDResponse(
            jd_id=jd_id,
            raw_text=request.raw_text,
            parsed_data=parsed,
            created_at=jd_data["created_at"],
        )

    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"JD parsing failed: {e}")
        raise HTTPException(500, "Failed to process job description.")


@router.get("/jd/list")
async def list_job_descriptions(user: CurrentUser):
    """List all saved job descriptions."""
    docs = await db.list_documents(db.jds_col(user.uid), limit=20)
    return [
        {
            "jd_id": doc["id"],
            "role_title": doc.get("role_title", "Unknown"),
            "company": doc.get("company", "Unknown"),
            "created_at": doc.get("created_at", ""),
        }
        for doc in docs
    ]


@router.get("/jd/{jd_id}")
async def get_job_description(user: CurrentUser, jd_id: str):
    """Get a specific parsed job description."""
    doc = await db.get_document(db.jds_col(user.uid).document(jd_id))
    if not doc:
        raise HTTPException(404, "Job description not found")
    return doc


# ── Match Analysis Endpoint ──────────────────────────────


@router.post("/match", response_model=MatchResponse)
async def analyze_match(user: CurrentUser, resume_id: str, jd_id: str):
    """Compare a resume against a JD and return match analysis."""
    from app.models.resume import ParsedResume, ParsedJobDescription

    # Load resume
    resume_doc = await db.get_document(db.resumes_col(user.uid).document(resume_id))
    if not resume_doc:
        raise HTTPException(404, "Resume not found")

    # Load JD
    jd_doc = await db.get_document(db.jds_col(user.uid).document(jd_id))
    if not jd_doc:
        raise HTTPException(404, "Job description not found")

    try:
        resume = ParsedResume(**resume_doc["parsed_data"])
        jd = ParsedJobDescription(**jd_doc["parsed_data"])

        analysis, usage = await matching_engine.analyze_match(resume, jd)

        return MatchResponse(
            resume_id=resume_id,
            jd_id=jd_id,
            analysis=analysis,
        )

    except Exception as e:
        logger.error(f"Match analysis failed: {e}")
        raise HTTPException(500, "Failed to analyze match.")
