from typing import Optional, List, Dict, Any, Tuple, AsyncIterator
"""
Interview engine — the core orchestrator for adaptive interview sessions.
Manages session state, question flow, difficulty adaptation, and follow-ups.
"""


import logging
from datetime import datetime, timezone

from app.models.interview import (
    SessionConfig,
    InterviewStatus,
    DifficultyLevel,
    MessageRole,
    ChatMessage,
    QuestionMetadata,
    ResponseAnalysis,
    SessionProgress,
)
from app.models.question import GeneratedQuestion
from app.services.question_generator import generate_questions, generate_single_question
from app.services.followup_handler import decide_followup, analyze_response
from app.services.openai_client import TokenUsage
from app.db import firestore as db

logger = logging.getLogger(__name__)


# ── Difficulty Adaptation ────────────────────────────────

DIFFICULTY_UP_THRESHOLD = 78    # score above this → harder questions
DIFFICULTY_DOWN_THRESHOLD = 45  # score below this → easier questions
DIFFICULTY_WINDOW = 3            # number of recent scores to consider


def _next_difficulty(current: DifficultyLevel, recent_scores: List[int]) -> DifficultyLevel:
    """Determine next difficulty based on recent performance."""
    if len(recent_scores) < 2:
        return current

    window = recent_scores[-DIFFICULTY_WINDOW:]
    avg = sum(window) / len(window)

    order = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD]
    idx = order.index(current)

    if avg >= DIFFICULTY_UP_THRESHOLD and idx < len(order) - 1:
        return order[idx + 1]
    elif avg <= DIFFICULTY_DOWN_THRESHOLD and idx > 0:
        return order[idx - 1]

    return current


# ── Session Initialization ───────────────────────────────


async def initialize_session(
    user_id: str,
    config: SessionConfig,
    resume_data: Optional[dict],
    jd_data: Optional[dict],
    match_analysis: Optional[dict],
) -> Tuple[str, ChatMessage, List[GeneratedQuestion], TokenUsage]:
    """
    Create a new interview session, generate initial questions,
    and return the first interviewer message.

    Returns:
        (session_id, first_message, generated_questions, total_usage)
    """
    total_usage = TokenUsage(model=config.mode.value)

    # Generate questions (or use generic if no resume/JD)
    if resume_data and jd_data and match_analysis:
        questions, q_usage = await generate_questions(
            resume_data=resume_data,
            jd_data=jd_data,
            match_analysis=match_analysis,
            mode=config.mode,
            difficulty=config.starting_difficulty,
            count=config.question_count,
        )
        total_usage = _merge_usage(total_usage, q_usage)
    else:
        # Fallback: generate generic questions without resume context
        questions, q_usage = await generate_questions(
            resume_data=resume_data or {"full_name": "Candidate", "technical_skills": [], "work_experience": []},
            jd_data=jd_data or {"role_title": "Software Engineer", "required_skills": [], "responsibilities": []},
            match_analysis=match_analysis or {"overall_score": 50, "missing_skills": [], "strengths": [], "interview_focus_areas": []},
            mode=config.mode,
            difficulty=config.starting_difficulty,
            count=config.question_count,
        )
        total_usage = _merge_usage(total_usage, q_usage)

    # Persist session to Firestore
    session_data = {
        "user_id": user_id,
        "config": config.model_dump(),
        "status": InterviewStatus.IN_PROGRESS.value,
        "resume_id": config.resume_id,
        "jd_id": config.jd_id,
        "match_analysis": match_analysis,
        "questions_generated": [q.model_dump() for q in questions],
        "current_question_index": 0,
        "current_difficulty": config.starting_difficulty.value,
        "scores": [],
        "topics_covered": [],
        "total_tokens": total_usage.total_tokens,
        "total_cost_cents": total_usage.cost_cents,
        "created_at": db.utc_now(),
        "completed_at": None,
    }

    session_id = await db.create_document(
        db.sessions_col(user_id),
        session_data,
    )

    # Build the first interviewer message
    first_q = questions[0]
    intro_text = _build_intro_message(first_q, config, resume_data)

    first_message = ChatMessage(
        role=MessageRole.INTERVIEWER,
        content=intro_text,
        question_metadata=QuestionMetadata(
            difficulty=first_q.difficulty,
            category=first_q.category,
            related_resume_section=first_q.related_resume_section,
            related_jd_requirement=first_q.related_jd_requirement,
            is_followup=False,
            question_number=1,
        ),
    )

    # Save first message
    msg_data = first_message.model_dump()
    msg_data["timestamp"] = db.utc_now()
    first_message.message_id = await db.create_document(
        db.messages_col(user_id, session_id),
        msg_data,
    )
    first_message.timestamp = msg_data["timestamp"]

    return session_id, first_message, questions, total_usage


# ── Process Candidate Response ───────────────────────────


async def process_response(
    user_id: str,
    session_id: str,
    response_text: str,
    duration_seconds: Optional[int] = None,
) -> Tuple[ChatMessage, ChatMessage, SessionProgress, TokenUsage]:
    """
    Process a candidate's response:
    1. Save the candidate message
    2. Analyze the response
    3. Decide whether to follow up or ask the next question
    4. Adapt difficulty if needed
    5. Return the next interviewer message

    Returns:
        (candidate_msg, interviewer_msg, progress, usage)
    """
    total_usage = TokenUsage()

    # Load session data
    session_ref = db.sessions_col(user_id).document(session_id)
    session = await db.get_document(session_ref)
    if not session:
        raise ValueError(f"Session {session_id} not found")

    if session["status"] != InterviewStatus.IN_PROGRESS.value:
        raise ValueError(f"Session is not in progress (status: {session['status']})")

    config = SessionConfig(**session["config"])
    questions = [GeneratedQuestion(**q) for q in session.get("questions_generated", [])]
    current_idx = session.get("current_question_index", 0)
    current_difficulty = DifficultyLevel(session.get("current_difficulty", "medium"))
    scores: List[int] = session.get("scores", [])
    topics_covered: List[str] = session.get("topics_covered", [])

    # Get current question
    if current_idx >= len(questions):
        raise ValueError("No more questions available")

    current_question = questions[current_idx]

    # Step 1: Analyze the response
    analysis, a_usage = await analyze_response(
        question=current_question.question_text,
        response=response_text,
        interview_type=config.mode.value,
        question_category=current_question.category,
    )
    total_usage = _merge_usage(total_usage, a_usage)

    # Save candidate message
    candidate_msg = ChatMessage(
        role=MessageRole.CANDIDATE,
        content=response_text,
        analysis=analysis,
    )
    msg_data = candidate_msg.model_dump()
    msg_data["timestamp"] = db.utc_now()
    msg_data["duration_seconds"] = duration_seconds
    candidate_msg.message_id = await db.create_document(
        db.messages_col(user_id, session_id),
        msg_data,
    )
    candidate_msg.timestamp = msg_data["timestamp"]

    # Update scores
    scores.append(analysis.score)
    topics_covered.append(current_question.category)

    # Step 2: Decide follow-up or next question
    next_interviewer_msg: ChatMessage
    new_question_index = current_idx

    # Check if session is complete
    questions_asked = current_idx + 1
    is_complete = questions_asked >= config.question_count

    if is_complete:
        # Session complete
        next_interviewer_msg = ChatMessage(
            role=MessageRole.SYSTEM,
            content=(
                "That wraps up our interview session. Thank you for your responses! "
                "I'm now generating your detailed feedback and analysis. "
                "You'll be able to see your results shortly."
            ),
        )
        await db.update_document(session_ref, {
            "status": InterviewStatus.COMPLETED.value,
            "completed_at": db.utc_now(),
            "scores": scores,
            "topics_covered": topics_covered,
            "current_question_index": current_idx + 1,
            "total_tokens": session.get("total_tokens", 0) + total_usage.total_tokens,
            "total_cost_cents": session.get("total_cost_cents", 0) + total_usage.cost_cents,
        })
    else:
        # Check for follow-up
        should_follow_up = False
        if config.enable_followups:
            resume_context = None
            if session.get("match_analysis"):
                resume_context = {
                    "recent_role": "Unknown",
                    "technical_skills": [],
                }
            followup_decision, f_usage = await decide_followup(
                question=current_question.question_text,
                response=response_text,
                resume_context=resume_context,
                difficulty=current_difficulty.value,
            )
            total_usage = _merge_usage(total_usage, f_usage)
            should_follow_up = followup_decision.should_followup

            if should_follow_up and followup_decision.followup_question:
                next_interviewer_msg = ChatMessage(
                    role=MessageRole.INTERVIEWER,
                    content=followup_decision.followup_question,
                    question_metadata=QuestionMetadata(
                        difficulty=current_difficulty,
                        category=current_question.category,
                        related_resume_section=current_question.related_resume_section,
                        related_jd_requirement=current_question.related_jd_requirement,
                        is_followup=True,
                        question_number=questions_asked,
                    ),
                )
            else:
                should_follow_up = False

        if not should_follow_up:
            # Adapt difficulty
            new_difficulty = current_difficulty
            if config.adaptive_difficulty:
                new_difficulty = _next_difficulty(current_difficulty, scores)

            # Move to next question
            new_question_index = current_idx + 1

            if new_question_index < len(questions):
                next_q = questions[new_question_index]
            else:
                # Generate a new question on the fly
                resume_data = session.get("match_analysis", {})
                next_q_gen, gen_usage = await generate_single_question(
                    resume_data=resume_data,
                    jd_data={},
                    match_analysis=resume_data,
                    mode=config.mode,
                    difficulty=new_difficulty,
                    topics_covered=topics_covered,
                )
                total_usage = _merge_usage(total_usage, gen_usage)
                next_q = next_q_gen
                questions.append(next_q)

            next_interviewer_msg = ChatMessage(
                role=MessageRole.INTERVIEWER,
                content=next_q.question_text,
                question_metadata=QuestionMetadata(
                    difficulty=next_q.difficulty,
                    category=next_q.category,
                    related_resume_section=next_q.related_resume_section,
                    related_jd_requirement=next_q.related_jd_requirement,
                    is_followup=False,
                    question_number=questions_asked + 1,
                ),
            )
            current_difficulty = new_difficulty

        # Update session state
        await db.update_document(session_ref, {
            "current_question_index": new_question_index,
            "current_difficulty": current_difficulty.value,
            "scores": scores,
            "topics_covered": topics_covered,
            "questions_generated": [q.model_dump() for q in questions],
            "total_tokens": session.get("total_tokens", 0) + total_usage.total_tokens,
            "total_cost_cents": session.get("total_cost_cents", 0) + total_usage.cost_cents,
        })

    # Save interviewer message
    interviewer_data = next_interviewer_msg.model_dump()
    interviewer_data["timestamp"] = db.utc_now()
    next_interviewer_msg.message_id = await db.create_document(
        db.messages_col(user_id, session_id),
        interviewer_data,
    )
    next_interviewer_msg.timestamp = interviewer_data["timestamp"]

    # Build progress
    progress = SessionProgress(
        questions_asked=new_question_index + 1 if not is_complete else config.question_count,
        questions_total=config.question_count,
        current_difficulty=current_difficulty,
        topics_covered=list(set(topics_covered)),
        average_score=sum(scores) / len(scores) if scores else 0.0,
        is_complete=is_complete,
    )

    return candidate_msg, next_interviewer_msg, progress, total_usage


# ── Helpers ──────────────────────────────────────────────


def _build_intro_message(
    first_question: GeneratedQuestion,
    config: SessionConfig,
    resume_data: Optional[dict],
) -> str:
    """Build the opening interviewer message with context."""
    name = resume_data.get("full_name", "there") if resume_data else "there"

    intro = (
        f"Hello {name}! Welcome to your {config.mode.value} interview session. "
        f"I'll be asking you {config.question_count} questions today. "
    )

    if config.adaptive_difficulty:
        intro += "The difficulty will adapt based on your responses. "

    intro += (
        f"Take your time to think through each answer.\n\n"
        f"Let's begin.\n\n{first_question.question_text}"
    )

    return intro


def _merge_usage(base: TokenUsage, add: TokenUsage) -> TokenUsage:
    """Merge two TokenUsage objects."""
    return TokenUsage(
        input_tokens=base.input_tokens + add.input_tokens,
        output_tokens=base.output_tokens + add.output_tokens,
        total_tokens=base.total_tokens + add.total_tokens,
        cost_cents=base.cost_cents + add.cost_cents,
        model=base.model or add.model,
    )
