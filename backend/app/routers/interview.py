from typing import Optional, List, Dict
"""
Interview session API router.
Handles session creation, message flow, and session management.
"""


import logging

from fastapi import APIRouter, HTTPException, status

from app.middleware.auth import CurrentUser
from app.models.interview import (
    CreateSessionRequest,
    SessionConfig,
    SessionResponse,
    SessionListItem,
    StartSessionResponse,
    SendMessageRequest,
    SendMessageResponse,
    InterviewStatus,
    SessionProgress,
    DifficultyLevel,
)
from app.models.resume import ParsedResume, ParsedJobDescription
from app.services import interview_engine, matching_engine
from app.db import firestore as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/interview", tags=["Interview"])


# ── Session Lifecycle ────────────────────────────────────


@router.post("/session", response_model=StartSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(user: CurrentUser, request: CreateSessionRequest):
    """
    Create a new interview session.
    Optionally accepts resume_id and jd_id for personalized questions.
    Returns the session and the first interviewer message.
    """
    config = request.config

    # Load resume and JD if provided
    resume_data = None
    jd_data = None
    match_analysis_data = None

    if config.resume_id:
        resume_doc = await db.get_document(db.resumes_col(user.uid).document(config.resume_id))
        if not resume_doc:
            raise HTTPException(404, "Resume not found")
        resume_data = resume_doc.get("parsed_data")

    if config.jd_id:
        jd_doc = await db.get_document(db.jds_col(user.uid).document(config.jd_id))
        if not jd_doc:
            raise HTTPException(404, "Job description not found")
        jd_data = jd_doc.get("parsed_data")

    # Run match analysis if both are available
    if resume_data and jd_data:
        try:
            resume_parsed = ParsedResume(**resume_data)
            jd_parsed = ParsedJobDescription(**jd_data)
            analysis, _ = await matching_engine.analyze_match(resume_parsed, jd_parsed)
            match_analysis_data = analysis.model_dump()
        except Exception as e:
            logger.warning(f"Match analysis failed, continuing without: {e}")

    try:
        session_id, first_message, questions, usage = await interview_engine.initialize_session(
            user_id=user.uid,
            config=config,
            resume_data=resume_data,
            jd_data=jd_data,
            match_analysis=match_analysis_data,
        )

        progress = SessionProgress(
            questions_asked=1,
            questions_total=config.question_count,
            current_difficulty=config.starting_difficulty,
            topics_covered=[questions[0].category] if questions else [],
            average_score=0.0,
            is_complete=False,
        )

        return StartSessionResponse(
            session_id=session_id,
            first_message=first_message,
            progress=progress,
        )

    except Exception as e:
        logger.error(f"Session creation failed: {e}")
        raise HTTPException(500, f"Failed to create interview session: {str(e)}")


@router.post("/session/{session_id}/message", response_model=SendMessageResponse)
async def send_message(user: CurrentUser, session_id: str, request: SendMessageRequest):
    """
    Send a candidate response and receive the next interviewer message.
    This is the main interview loop endpoint.
    """
    try:
        candidate_msg, interviewer_msg, progress, usage = await interview_engine.process_response(
            user_id=user.uid,
            session_id=session_id,
            response_text=request.content,
            duration_seconds=request.duration_seconds,
        )

        return SendMessageResponse(
            candidate_message=candidate_msg,
            interviewer_message=interviewer_msg,
            session_progress=progress,
        )

    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"Message processing failed: {e}")
        raise HTTPException(500, f"Failed to process response: {str(e)}")


# ── Session Management ───────────────────────────────────


@router.get("/sessions", response_model=list[SessionListItem])
async def list_sessions(user: CurrentUser, limit: int = 20):
    """List all interview sessions for the current user."""
    docs = await db.list_documents(db.sessions_col(user.uid), limit=limit)
    items = []
    for doc in docs:
        config = doc.get("config", {})
        summary = doc.get("summary", {})
        items.append(SessionListItem(
            session_id=doc["id"],
            status=doc.get("status", "unknown"),
            mode=config.get("mode", "mixed"),
            created_at=doc.get("created_at", ""),
            completed_at=doc.get("completed_at"),
            overall_score=summary.get("overall_score"),
            question_count=config.get("question_count", 0),
            readiness_level=summary.get("readiness_level"),
        ))
    return items


@router.get("/session/{session_id}", response_model=SessionResponse)
async def get_session(user: CurrentUser, session_id: str):
    """Get session details including config and match analysis."""
    doc = await db.get_document(db.sessions_col(user.uid).document(session_id))
    if not doc:
        raise HTTPException(404, "Session not found")

    config_data = doc.get("config", {})
    messages = await db.list_documents(
        db.messages_col(user.uid, session_id),
        order_by="timestamp",
        direction="ASCENDING",
        limit=200,
    )

    return SessionResponse(
        session_id=doc["id"],
        status=InterviewStatus(doc.get("status", "setup")),
        config=SessionConfig(**config_data),
        match_analysis=doc.get("match_analysis"),
        created_at=doc.get("created_at", ""),
        total_messages=len(messages),
    )


@router.get("/session/{session_id}/messages")
async def get_session_messages(user: CurrentUser, session_id: str):
    """Get all messages for a session (chat history)."""
    # Verify session belongs to user
    session = await db.get_document(db.sessions_col(user.uid).document(session_id))
    if not session:
        raise HTTPException(404, "Session not found")

    messages = await db.list_documents(
        db.messages_col(user.uid, session_id),
        order_by="timestamp",
        direction="ASCENDING",
        limit=200,
    )

    return {"session_id": session_id, "messages": messages}


@router.post("/session/{session_id}/end")
async def end_session(user: CurrentUser, session_id: str):
    """Manually end an in-progress session."""
    session_ref = db.sessions_col(user.uid).document(session_id)
    session = await db.get_document(session_ref)
    if not session:
        raise HTTPException(404, "Session not found")

    if session.get("status") == InterviewStatus.COMPLETED.value:
        raise HTTPException(400, "Session is already completed")

    await db.update_document(session_ref, {
        "status": InterviewStatus.COMPLETED.value,
        "completed_at": db.utc_now(),
    })

    return {"status": "completed", "session_id": session_id}


@router.delete("/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(user: CurrentUser, session_id: str):
    """Delete a session and all its messages."""
    session = await db.get_document(db.sessions_col(user.uid).document(session_id))
    if not session:
        raise HTTPException(404, "Session not found")

    # Delete all messages
    messages = await db.list_documents(
        db.messages_col(user.uid, session_id),
        limit=500,
    )
    for msg in messages:
        await db.delete_document(
            db.messages_col(user.uid, session_id).document(msg["id"])
        )

    # Delete session
    await db.delete_document(db.sessions_col(user.uid).document(session_id))
