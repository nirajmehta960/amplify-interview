from typing import Optional, List, Dict, Any, Tuple, AsyncIterator
"""
Prompt templates for personalized interview question generation.
"""

from app.models.interview import InterviewMode


def build_question_generation_prompt(
    resume_summary: dict,
    jd_summary: dict,
    match_analysis: dict,
    mode: InterviewMode,
    difficulty: str,
    question_count: int,
    topics_covered: Optional[List[str]] = None,
) -> List[Dict[str, str]]:
    """Build prompt for generating personalized interview questions."""

    mode_instructions = {
        InterviewMode.BEHAVIORAL: (
            "Generate BEHAVIORAL interview questions that probe the candidate's past "
            "experiences, decision-making, teamwork, and leadership using the STAR method. "
            "Reference specific items from their resume where possible."
        ),
        InterviewMode.TECHNICAL: (
            "Generate TECHNICAL interview questions that test the candidate's knowledge "
            "of their stated skills, system design ability, and problem-solving approach. "
            "Questions should be relevant to the target role's requirements."
        ),
        InterviewMode.MIXED: (
            "Generate a MIX of behavioral and technical questions. Alternate between "
            "behavioral questions about their experiences and technical questions about "
            "their skills. Reference specific resume items and JD requirements."
        ),
    }

    exclude_clause = ""
    if topics_covered:
        exclude_clause = (
            f"\n\nAVOID these topics already covered: {', '.join(topics_covered)}"
        )

    system_prompt = f"""You are an expert interviewer preparing personalized questions for a candidate.

{mode_instructions[mode]}

Difficulty level: {difficulty.upper()}
- easy: conversational, high-level questions about their background
- medium: probing questions that require specific examples and detail
- hard: challenging questions that test deep knowledge, edge cases, and complex scenarios

Return a JSON object with this structure:
{{
  "questions": [
    {{
      "question_text": "string (the actual question to ask)",
      "category": "string ('behavioral', 'technical', 'system_design', 'leadership')",
      "difficulty": "string ('easy', 'medium', 'hard')",
      "related_resume_section": "string or null (which resume item this targets)",
      "related_jd_requirement": "string or null (which JD requirement this probes)",
      "rationale": "string (why this question is relevant for this candidate)",
      "expected_skills": ["string (what skills a good answer would demonstrate)"]
    }}
  ]
}}

Rules:
- Generate exactly {question_count} questions.
- Questions MUST be personalized to this specific candidate and role.
- Reference their actual projects, companies, and skills when relevant.
- Do not ask generic questions that could apply to anyone.
- Vary question types and topics for broad coverage.
- Each question should test a different skill or experience area.{exclude_clause}"""

    user_prompt = f"""CANDIDATE PROFILE (from resume):
Name: {resume_summary.get('full_name', 'Unknown')}
Experience: {resume_summary.get('total_years_experience', 'Unknown')} years
Technical Skills: {', '.join(resume_summary.get('technical_skills', [])[:15])}
Recent Role: {_format_recent_role(resume_summary)}
Key Projects: {_format_projects(resume_summary)}

TARGET ROLE (from job description):
Title: {jd_summary.get('role_title', 'Unknown')}
Company: {jd_summary.get('company', 'Unknown')}
Required Skills: {', '.join(jd_summary.get('required_skills', [])[:10])}
Key Responsibilities: {_format_list(jd_summary.get('responsibilities', [])[:5])}

MATCH ANALYSIS:
Overall Match: {match_analysis.get('overall_score', 'N/A')}%
Skill Gaps: {', '.join(match_analysis.get('missing_skills', [])[:5])}
Strengths: {', '.join(match_analysis.get('strengths', [])[:5])}
Focus Areas: {', '.join(match_analysis.get('interview_focus_areas', [])[:5])}

Generate {question_count} personalized {mode.value} interview questions at {difficulty} difficulty."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _format_recent_role(resume: dict) -> str:
    exp = resume.get("work_experience", [])
    if not exp:
        return "No work experience listed"
    latest = exp[0]
    return f"{latest.get('title', 'Unknown')} at {latest.get('company', 'Unknown')}"


def _format_projects(resume: dict) -> str:
    projects = resume.get("projects", [])
    if not projects:
        return "No projects listed"
    return "; ".join(
        f"{p.get('name', 'Unnamed')}: {p.get('description', '')[:80]}"
        for p in projects[:3]
    )


def _format_list(items: List[str]) -> str:
    if not items:
        return "None listed"
    return "; ".join(items[:5])
