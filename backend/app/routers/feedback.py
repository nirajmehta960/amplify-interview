from typing import Optional, List, Dict
"""
Feedback API router.
Generates and retrieves session feedback/analysis.
"""


import logging

from fastapi import APIRouter, HTTPException

from app.middleware.auth import CurrentUser
from app.models.feedback import SessionFeedback, QuestionFeedback
from app.services import feedback_generator
from app.db import firestore as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


@router.post("/session/{session_id}", response_model=SessionFeedback)
async def generate_feedback(user: CurrentUser, session_id: str):
    """
    Generate comprehensive feedback for a completed session.
    This triggers the LLM to analyze the full session and produce
    detailed feedback with resume/JD context.
    """
    # Verify session exists and belongs to user
    session = await db.get_document(db.sessions_col(user.uid).document(session_id))
    if not session:
        raise HTTPException(404, "Session not found")

    # Check if feedback already exists
    existing_summary = session.get("summary")
    if existing_summary and existing_summary.get("overall_score"):
        logger.info(f"Returning existing feedback for session {session_id}")
        return SessionFeedback(**existing_summary)

    try:
        feedback, usage = await feedback_generator.generate_session_feedback(
            user_id=user.uid,
            session_id=session_id,
        )
        return feedback

    except Exception as e:
        logger.error(f"Feedback generation failed: {e}")
        raise HTTPException(500, f"Failed to generate feedback: {str(e)}")


@router.get("/session/{session_id}", response_model=SessionFeedback)
async def get_feedback(user: CurrentUser, session_id: str):
    """
    Get existing feedback for a session.
    Returns 404 if feedback hasn't been generated yet.
    """
    session = await db.get_document(db.sessions_col(user.uid).document(session_id))
    if not session:
        raise HTTPException(404, "Session not found")

    summary = session.get("summary")
    if not summary or not summary.get("overall_score"):
        raise HTTPException(404, "Feedback not yet generated. POST to /api/feedback/session/{session_id} first.")

    return SessionFeedback(**summary)


@router.get("/session/{session_id}/questions", response_model=list[QuestionFeedback])
async def get_question_feedback(user: CurrentUser, session_id: str):
    """
    Get per-question feedback for a session.
    Extracts analysis from each candidate message in the chat.
    """
    session = await db.get_document(db.sessions_col(user.uid).document(session_id))
    if not session:
        raise HTTPException(404, "Session not found")

    messages = await db.list_documents(
        db.messages_col(user.uid, session_id),
        order_by="timestamp",
        direction="ASCENDING",
        limit=200,
    )

    # Pair interviewer questions with candidate responses
    results = []
    current_question = None

    for msg in messages:
        if msg.get("role") == "interviewer":
            current_question = msg
        elif msg.get("role") == "candidate" and current_question:
            analysis = msg.get("analysis", {})
            metadata = current_question.get("question_metadata", {})

            results.append(QuestionFeedback(
                question_text=current_question.get("content", ""),
                response_text=msg.get("content", ""),
                score=analysis.get("score", 0),
                communication_scores=analysis.get("communication_scores", {"clarity": 0, "structure": 0, "conciseness": 0}),
                content_scores=analysis.get("content_scores", {"relevance": 0, "depth": 0, "specificity": 0}),
                strengths=analysis.get("strengths", []),
                improvements=analysis.get("improvements", []),
                actionable_feedback=analysis.get("brief_feedback", ""),
                difficulty=metadata.get("difficulty", "medium"),
                category=metadata.get("category", "general"),
            ))
            # Only reset if this wasn't a follow-up
            if not metadata.get("is_followup"):
                current_question = None

    return results
