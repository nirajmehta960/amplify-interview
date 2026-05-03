"""
Pydantic models for resume and job description data.
Used for structured extraction from LLM and API request/response validation.
"""

from typing import Optional, List, Dict
from enum import Enum

from pydantic import BaseModel, Field


# ── Resume Models ────────────────────────────────────────


class WorkExperience(BaseModel):
    company: str
    title: str
    location: Optional[str] = None
    start_date: Optional[str] = None  # "Jan 2022" or "2022-01"
    end_date: Optional[str] = None  # "Present" or "Dec 2024"
    is_current: bool = False
    bullets: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)


class Education(BaseModel):
    institution: str
    degree: str  # "B.S. Computer Science"
    field_of_study: Optional[str] = None
    graduation_date: Optional[str] = None
    gpa: Optional[str] = None
    honors: List[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str
    description: str
    url: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    highlights: List[str] = Field(default_factory=list)


class Certification(BaseModel):
    name: str
    issuer: Optional[str] = None
    date: Optional[str] = None
    url: Optional[str] = None


class ParsedResume(BaseModel):
    """Structured representation of a parsed resume."""

    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None

    work_experience: List[WorkExperience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    certifications: List[Certification] = Field(default_factory=list)

    technical_skills: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    total_years_experience: Optional[float] = None


class ResumeUploadResponse(BaseModel):
    resume_id: str
    file_name: str
    parsed_data: ParsedResume
    uploaded_at: str


class ResumeListItem(BaseModel):
    resume_id: str
    file_name: str
    full_name: str
    uploaded_at: str
    total_years_experience: Optional[float] = None
    top_skills: List[str] = Field(default_factory=list)


# ── Job Description Models ───────────────────────────────


class ExperienceLevel(str, Enum):
    INTERN = "intern"
    ENTRY = "entry"
    MID = "mid"
    SENIOR = "senior"
    STAFF = "staff"
    PRINCIPAL = "principal"
    DIRECTOR = "director"
    VP = "vp"
    C_LEVEL = "c_level"


class ParsedJobDescription(BaseModel):
    """Structured representation of a parsed job description."""

    role_title: str
    company: Optional[str] = None
    location: Optional[str] = None
    remote_policy: Optional[str] = None  # "remote", "hybrid", "onsite"
    experience_level: Optional[ExperienceLevel] = None
    years_experience_required: Optional[int] = None

    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    qualifications: List[str] = Field(default_factory=list)

    salary_range: Optional[str] = None
    benefits: List[str] = Field(default_factory=list)
    team_info: Optional[str] = None
    company_description: Optional[str] = None


class JDCreateRequest(BaseModel):
    raw_text: str = Field(..., max_length=10000)
    company: Optional[str] = None
    role_title: Optional[str] = None


class JDResponse(BaseModel):
    jd_id: str
    raw_text: str
    parsed_data: ParsedJobDescription
    created_at: str


# ── Match Analysis Models ────────────────────────────────


class SkillMatch(BaseModel):
    skill: str
    found_in_resume: bool
    resume_evidence: Optional[str] = None
    importance: str = "required"  # "required" | "preferred"


class MatchAnalysis(BaseModel):
    """Resume ↔ JD comparison result."""

    overall_score: int = Field(ge=0, le=100)
    skill_matches: List[SkillMatch] = Field(default_factory=list)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    transferable_skills: List[str] = Field(default_factory=list)
    experience_alignment: str = ""  # narrative summary
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    interview_focus_areas: List[str] = Field(default_factory=list)


class MatchResponse(BaseModel):
    resume_id: str
    jd_id: str
    analysis: MatchAnalysis
