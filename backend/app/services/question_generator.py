from typing import Optional, List, Dict, Any, Tuple, AsyncIterator
"""
Question generator service.
Produces personalized interview questions from resume + JD + match analysis.
"""


import logging

from app.models.interview import InterviewMode, DifficultyLevel
from app.models.question import GeneratedQuestion
from app.services.openai_client import chat_completion_json, TokenUsage
from app.prompts.question_generation import build_question_generation_prompt

logger = logging.getLogger(__name__)


async def generate_questions(
    resume_data: dict,
    jd_data: dict,
    match_analysis: dict,
    mode: InterviewMode,
    difficulty: DifficultyLevel,
    count: int = 10,
    topics_covered: Optional[List[str]] = None,
) -> Tuple[List[GeneratedQuestion], TokenUsage]:
    """
    Generate personalized interview questions.

    Returns:
        Tuple of (list_of_questions, token_usage)
    """
    messages = build_question_generation_prompt(
        resume_summary=resume_data,
        jd_summary=jd_data,
        match_analysis=match_analysis,
        mode=mode,
        difficulty=difficulty.value,
        question_count=count,
        topics_covered=topics_covered,
    )

    data, usage = await chat_completion_json(
        messages=messages,
        temperature=0.7,
        max_tokens=3000,
    )

    raw_questions = data.get("questions", [])
    questions = []

    for q in raw_questions:
        try:
            questions.append(GeneratedQuestion(
                question_text=q["question_text"],
                category=q.get("category", "general"),
                difficulty=DifficultyLevel(q.get("difficulty", difficulty.value)),
                related_resume_section=q.get("related_resume_section"),
                related_jd_requirement=q.get("related_jd_requirement"),
                rationale=q.get("rationale"),
                expected_skills=q.get("expected_skills", []),
            ))
        except Exception as e:
            logger.warning(f"Skipping malformed question: {e}")
            continue

    logger.info(f"Generated {len(questions)} questions ({mode.value}, {difficulty.value})")

    return questions, usage


async def generate_single_question(
    resume_data: dict,
    jd_data: dict,
    match_analysis: dict,
    mode: InterviewMode,
    difficulty: DifficultyLevel,
    topics_covered: Optional[List[str]] = None,
) -> Tuple[GeneratedQuestion, TokenUsage]:
    """Generate a single new question (for adaptive mid-session generation)."""
    questions, usage = await generate_questions(
        resume_data=resume_data,
        jd_data=jd_data,
        match_analysis=match_analysis,
        mode=mode,
        difficulty=difficulty,
        count=1,
        topics_covered=topics_covered,
    )
    if not questions:
        raise ValueError("Failed to generate a question")
    return questions[0], usage
