"""
Feedback generator service.
Produces comprehensive session-end feedback with resume/JD context.
Ported and enhanced from the original aiAnalysisService.ts.
"""


import logging

from app.models.feedback import (
    SessionFeedback,
    CommunicationScores,
    ContentScores,
    ScoreDistribution,
    DifficultyProgression,
)
from app.models.interview import InterviewStatus
from app.services.openai_client import chat_completion_json, TokenUsage
from app.prompts.feedback import build_session_feedback_prompt
from app.db import firestore as db

logger = logging.getLogger(__name__)


async def generate_session_feedback(
    user_id: str,
    session_id: str,
) -> tuple[SessionFeedback, TokenUsage]:
    """
    Generate comprehensive feedback for a completed interview session.

    Returns:
        Tuple of (session_feedback, token_usage)
    """
    # Load session
    session_ref = db.sessions_col(user_id).document(session_id)
    session = await db.get_document(session_ref)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    # Load all messages
    messages = await db.list_documents(
        db.messages_col(user_id, session_id),
        order_by="timestamp",
        direction="ASCENDING",
        limit=200,
    )

    # Load resume/JD data if available
    resume_data = None
    jd_data = None
    match_analysis = session.get("match_analysis")

    config = session.get("config", {})
    resume_id = config.get("resume_id") or session.get("resume_id")
    jd_id = config.get("jd_id") or session.get("jd_id")

    if resume_id:
        resume_doc = await db.get_document(db.resumes_col(user_id).document(resume_id))
        if resume_doc:
            resume_data = resume_doc.get("parsed_data")

    if jd_id:
        jd_doc = await db.get_document(db.jds_col(user_id).document(jd_id))
        if jd_doc:
            jd_data = jd_doc.get("parsed_data")

    # Build message list for the prompt
    msg_dicts = [{"role": m.get("role", ""), "content": m.get("content", ""), "analysis": m.get("analysis")} for m in messages]

    # Generate feedback via LLM
    interview_mode = config.get("mode", "mixed")
    prompt_messages = build_session_feedback_prompt(
        messages=msg_dicts,
        resume_summary=resume_data,
        jd_summary=jd_data,
        match_analysis=match_analysis,
        interview_mode=interview_mode,
    )

    data, usage = await chat_completion_json(
        messages=prompt_messages,
        model="gpt-4o",  # Use advanced model for comprehensive feedback
        temperature=0.3,
        max_tokens=3000,
    )

    # Build difficulty progression from session scores
    scores = session.get("scores", [])
    questions_generated = session.get("questions_generated", [])
    difficulty_progression = []
    for i, score in enumerate(scores):
        diff = "medium"
        if i < len(questions_generated):
            diff = questions_generated[i].get("difficulty", "medium")
        difficulty_progression.append(DifficultyProgression(
            question_number=i + 1,
            difficulty=diff,
            score=score,
        ))

    # Calculate score distribution
    score_dist = ScoreDistribution(
        excellent=data.get("score_distribution", {}).get("excellent", sum(1 for s in scores if s >= 80)),
        good=data.get("score_distribution", {}).get("good", sum(1 for s in scores if 60 <= s < 80)),
        fair=data.get("score_distribution", {}).get("fair", sum(1 for s in scores if 40 <= s < 60)),
        needs_improvement=data.get("score_distribution", {}).get("needs_improvement", sum(1 for s in scores if s < 40)),
    )

    # Build the feedback object
    feedback = SessionFeedback(
        session_id=session_id,
        user_id=user_id,
        overall_score=_clamp(data.get("overall_score", 50)),
        communication_scores=CommunicationScores(
            clarity=_clamp(data.get("communication_scores", {}).get("clarity", 50)),
            structure=_clamp(data.get("communication_scores", {}).get("structure", 50)),
            conciseness=_clamp(data.get("communication_scores", {}).get("conciseness", 50)),
        ),
        content_scores=ContentScores(
            relevance=_clamp(data.get("content_scores", {}).get("relevance", 50)),
            depth=_clamp(data.get("content_scores", {}).get("depth", 50)),
            specificity=_clamp(data.get("content_scores", {}).get("specificity", 50)),
        ),
        score_distribution=score_dist,
        strengths=data.get("strengths", [])[:5],
        improvements=data.get("improvements", [])[:5],
        actionable_feedback=data.get("actionable_feedback", ""),
        role_specific_feedback=data.get("role_specific_feedback"),
        readiness_level=data.get("readiness_level", "needs_practice"),
        readiness_score=_clamp(data.get("readiness_score", 50)),
        next_steps=data.get("next_steps", [])[:5],
        total_questions=len(scores),
        questions_answered=len(scores),
        total_duration_seconds=session.get("total_duration_seconds", 0),
        average_time_per_question=(session.get("total_duration_seconds", 0) / max(len(scores), 1)),
        difficulty_progression=difficulty_progression,
        performance_trend=data.get("performance_trend", "consistent"),
        skill_gaps_addressed=data.get("skill_gaps_addressed", []),
        skill_gaps_remaining=data.get("skill_gaps_remaining", []),
        recommended_practice_areas=data.get("recommended_practice_areas", []),
        estimated_practice_time=data.get("estimated_practice_time"),
        total_tokens=session.get("total_tokens", 0) + usage.total_tokens,
        total_cost_cents=session.get("total_cost_cents", 0) + usage.cost_cents,
    )

    # Save feedback to session
    await db.update_document(session_ref, {
        "summary": feedback.model_dump(),
        "total_tokens": feedback.total_tokens,
        "total_cost_cents": feedback.total_cost_cents,
    })

    logger.info(
        f"Generated feedback for session {session_id}: "
        f"score={feedback.overall_score}, readiness={feedback.readiness_level}"
    )

    return feedback, usage


def _clamp(value, min_val: int = 0, max_val: int = 100) -> int:
    """Clamp and normalize a score."""
    if isinstance(value, str):
        try:
            value = float(value)
        except ValueError:
            return 50
    # Normalize 0-10 scale to 0-100
    if 0 <= value <= 10 and max_val == 100:
        value = value * 10
    return max(min_val, min(max_val, round(value)))
