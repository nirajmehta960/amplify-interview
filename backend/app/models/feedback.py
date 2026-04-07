"""
Pydantic models for session feedback and analysis results.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class CommunicationScores(BaseModel):
    clarity: int = Field(ge=0, le=100)
    structure: int = Field(ge=0, le=100)
    conciseness: int = Field(ge=0, le=100)


class ContentScores(BaseModel):
    relevance: int = Field(ge=0, le=100)
    depth: int = Field(ge=0, le=100)
    specificity: int = Field(ge=0, le=100)


class ScoreDistribution(BaseModel):
    excellent: int = 0  # 80-100
    good: int = 0  # 60-79
    fair: int = 0  # 40-59
    needs_improvement: int = 0  # 0-39


class DifficultyProgression(BaseModel):
    question_number: int
    difficulty: str
    score: int


class SessionFeedback(BaseModel):
    """Comprehensive feedback for a completed interview session."""

    session_id: str
    user_id: str

    # ── Overall Metrics ──
    overall_score: int = Field(ge=0, le=100)
    communication_scores: CommunicationScores
    content_scores: ContentScores
    score_distribution: ScoreDistribution

    # ── Qualitative Feedback ──
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)
    actionable_feedback: str = ""
    role_specific_feedback: Optional[str] = None

    # ── Readiness ──
    readiness_level: str = "needs_practice"
    readiness_score: int = 0
    next_steps: List[str] = Field(default_factory=list)

    # ── Session Stats ──
    total_questions: int = 0
    questions_answered: int = 0
    total_duration_seconds: int = 0
    average_time_per_question: float = 0.0
    difficulty_progression: List[DifficultyProgression] = Field(default_factory=list)
    performance_trend: str = "consistent"

    # ── Resume/JD Context ──
    skill_gaps_addressed: List[str] = Field(default_factory=list)
    skill_gaps_remaining: List[str] = Field(default_factory=list)
    recommended_practice_areas: List[str] = Field(default_factory=list)
    estimated_practice_time: Optional[str] = None

    # ── Cost Tracking ──
    total_tokens: int = 0
    total_cost_cents: int = 0


class QuestionFeedback(BaseModel):
    """Detailed feedback for a single question response."""

    question_text: str
    response_text: str
    score: int = Field(ge=0, le=100)
    communication_scores: CommunicationScores
    content_scores: ContentScores
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)
    actionable_feedback: str = ""
    improved_example: Optional[str] = None
    difficulty: str = "medium"
    category: str = "general"
