"""
Pydantic models for interview sessions, questions, and responses.
"""

from typing import Optional, List, Dict
from enum import Enum
from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────


class InterviewMode(str, Enum):
    BEHAVIORAL = "behavioral"
    TECHNICAL = "technical"
    MIXED = "mixed"


class InterviewStatus(str, Enum):
    SETUP = "setup"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class MessageRole(str, Enum):
    INTERVIEWER = "interviewer"
    CANDIDATE = "candidate"
    SYSTEM = "system"


# ── Session Models ───────────────────────────────────────


class SessionConfig(BaseModel):
    """Configuration for an interview session."""

    mode: InterviewMode = InterviewMode.MIXED
    question_count: int = Field(default=10, ge=3, le=20)
    duration_minutes: int = Field(default=30, ge=10, le=90)
    starting_difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    adaptive_difficulty: bool = True
    enable_followups: bool = True
    resume_id: Optional[str] = None
    jd_id: Optional[str] = None


class CreateSessionRequest(BaseModel):
    config: SessionConfig


class SessionResponse(BaseModel):
    session_id: str
    status: InterviewStatus
    config: SessionConfig
    match_analysis: Optional[dict] = None
    created_at: str
    total_messages: int = 0


class SessionListItem(BaseModel):
    session_id: str
    status: str
    mode: str
    created_at: str
    completed_at: Optional[str] = None
    overall_score: Optional[int] = None
    question_count: int = 0
    readiness_level: Optional[str] = None


# ── Message Models ───────────────────────────────────────


class QuestionMetadata(BaseModel):
    """Metadata attached to interviewer question messages."""

    difficulty: DifficultyLevel
    category: str  # "behavioral", "technical", "system_design", etc.
    related_resume_section: Optional[str] = None
    related_jd_requirement: Optional[str] = None
    is_followup: bool = False
    question_number: int = 0


class ResponseAnalysis(BaseModel):
    """AI analysis of a candidate response, embedded in the message."""

    score: int = Field(ge=0, le=100)
    communication_scores: Dict[str, int] = Field(default_factory=lambda: {
        "clarity": 0, "structure": 0, "conciseness": 0
    })
    content_scores: Dict[str, int] = Field(default_factory=lambda: {
        "relevance": 0, "depth": 0, "specificity": 0
    })
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)
    brief_feedback: str = ""


class ChatMessage(BaseModel):
    """A single message in the interview chat."""

    message_id: Optional[str] = None
    role: MessageRole
    content: str
    timestamp: Optional[str] = None
    question_metadata: Optional[QuestionMetadata] = None  # for interviewer msgs
    analysis: Optional[ResponseAnalysis] = None  # for candidate msgs


class SendMessageRequest(BaseModel):
    """Request to send a candidate response."""

    content: str = Field(..., min_length=1, max_length=10000)
    duration_seconds: Optional[int] = None  # how long they took to respond


class SendMessageResponse(BaseModel):
    """Response after sending a candidate message."""

    candidate_message: ChatMessage
    interviewer_message: ChatMessage
    session_progress: "SessionProgress"


class SessionProgress(BaseModel):
    """Current progress state of the interview session."""

    questions_asked: int
    questions_total: int
    current_difficulty: DifficultyLevel
    topics_covered: List[str] = Field(default_factory=list)
    average_score: float = 0.0
    is_complete: bool = False
    time_elapsed_seconds: int = 0


# ── Start Session Models ─────────────────────────────────


class StartSessionResponse(BaseModel):
    """Response when starting/resuming an interview session."""

    session_id: str
    first_message: ChatMessage
    progress: SessionProgress


# Update forward refs
SendMessageResponse.model_rebuild()
