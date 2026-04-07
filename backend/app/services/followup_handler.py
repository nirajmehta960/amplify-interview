from typing import Optional, List, Dict, Any, Tuple, AsyncIterator
"""
Follow-up handler service.
Analyzes responses and decides whether/how to follow up.
"""


import logging
from pydantic import BaseModel

from app.services.openai_client import chat_completion_json, TokenUsage
from app.prompts.followup import build_followup_prompt, build_response_analysis_prompt
from app.models.interview import ResponseAnalysis

logger = logging.getLogger(__name__)


class FollowupDecision(BaseModel):
    should_followup: bool
    reason: str
    followup_question: Optional[str] = None
    followup_type: Optional[str] = None  # clarify, deepen, verify, pivot


async def decide_followup(
    question: str,
    response: str,
    resume_context: Optional[dict] = None,
    difficulty: str = "medium",
) -> Tuple[FollowupDecision, TokenUsage]:
    """
    Analyze a response and decide whether to ask a follow-up.

    Returns:
        Tuple of (followup_decision, token_usage)
    """
    messages = build_followup_prompt(
        question=question,
        response=response,
        resume_context=resume_context,
        difficulty=difficulty,
    )

    data, usage = await chat_completion_json(
        messages=messages,
        temperature=0.3,
        max_tokens=500,
    )

    decision = FollowupDecision(
        should_followup=data.get("should_followup", False),
        reason=data.get("reason", ""),
        followup_question=data.get("followup_question"),
        followup_type=data.get("followup_type"),
    )

    logger.info(
        f"Follow-up decision: {'YES' if decision.should_followup else 'NO'} "
        f"({decision.followup_type or 'n/a'})"
    )

    return decision, usage


async def analyze_response(
    question: str,
    response: str,
    interview_type: str,
    question_category: str,
) -> Tuple[ResponseAnalysis, TokenUsage]:
    """
    Analyze a single response and return scoring & feedback.
    Used for real-time inline analysis during the interview.

    Returns:
        Tuple of (response_analysis, token_usage)
    """
    messages = build_response_analysis_prompt(
        question=question,
        response=response,
        interview_type=interview_type,
        question_category=question_category,
    )

    data, usage = await chat_completion_json(
        messages=messages,
        temperature=0.3,
        max_tokens=800,
    )

    analysis = ResponseAnalysis(
        score=_clamp(data.get("score", 50), 0, 100),
        communication_scores={
            "clarity": _clamp(data.get("communication_scores", {}).get("clarity", 50), 0, 100),
            "structure": _clamp(data.get("communication_scores", {}).get("structure", 50), 0, 100),
            "conciseness": _clamp(data.get("communication_scores", {}).get("conciseness", 50), 0, 100),
        },
        content_scores={
            "relevance": _clamp(data.get("content_scores", {}).get("relevance", 50), 0, 100),
            "depth": _clamp(data.get("content_scores", {}).get("depth", 50), 0, 100),
            "specificity": _clamp(data.get("content_scores", {}).get("specificity", 50), 0, 100),
        },
        strengths=data.get("strengths", [])[:3],
        improvements=data.get("improvements", [])[:3],
        brief_feedback=data.get("brief_feedback", ""),
    )

    return analysis, usage


def _clamp(value, min_val: int, max_val: int) -> int:
    """Clamp and round a value."""
    if isinstance(value, str):
        try:
            value = float(value)
        except ValueError:
            return min_val
    # Normalize scores on 0-10 scale to 0-100
    if 0 <= value <= 10 and max_val == 100:
        value = value * 10
    return max(min_val, min(max_val, round(value)))
