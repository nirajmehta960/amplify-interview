from typing import Optional, List, Tuple
"""
Matching engine service.
Compares parsed resume against parsed JD to generate gap analysis.
"""


import logging

from app.models.resume import ParsedResume, ParsedJobDescription, MatchAnalysis
from app.services.openai_client import chat_completion_structured, TokenUsage

logger = logging.getLogger(__name__)


MATCH_SYSTEM_PROMPT = """You are an expert recruiter performing a candidate-job fit analysis.

Compare the candidate's resume against the job description and provide a detailed match analysis.

Return a JSON object:
{
  "overall_score": number (0-100, overall fit percentage),
  "skill_matches": [
    {
      "skill": "string (skill from JD)",
      "found_in_resume": boolean,
      "resume_evidence": "string or null (specific evidence from resume)",
      "importance": "string ('required' or 'preferred')"
    }
  ],
  "matched_skills": ["string (skills found in both resume and JD)"],
  "missing_skills": ["string (JD required skills not found in resume)"],
  "transferable_skills": ["string (resume skills that could transfer to fill gaps)"],
  "experience_alignment": "string (narrative about how their experience aligns)",
  "strengths": ["string (3-5 areas where candidate excels for this role)"],
  "gaps": ["string (3-5 areas where candidate needs improvement)"],
  "interview_focus_areas": ["string (3-5 areas an interviewer should probe)"]
}

Scoring guide:
- 90-100: Exceptional match, candidate exceeds requirements
- 75-89: Strong match, meets most requirements
- 60-74: Good match with some notable gaps
- 40-59: Partial match, significant gaps to address
- 0-39: Weak match, major requirements unmet"""


async def analyze_match(
    resume: ParsedResume,
    jd: ParsedJobDescription,
) -> tuple[MatchAnalysis, TokenUsage]:
    """
    Compare resume against JD and return structured analysis.

    Returns:
        Tuple of (match_analysis, token_usage)
    """
    user_prompt = f"""CANDIDATE RESUME:
Name: {resume.full_name}
Total Experience: {resume.total_years_experience or 'Unknown'} years
Technical Skills: {', '.join(resume.technical_skills[:20])}
Soft Skills: {', '.join(resume.soft_skills[:10])}

Work Experience:
{_format_experience(resume)}

Education:
{_format_education(resume)}

Projects:
{_format_projects(resume)}

---

JOB DESCRIPTION:
Title: {jd.role_title}
Company: {jd.company or 'Unknown'}
Experience Level: {jd.experience_level or 'Unknown'}
Years Required: {jd.years_experience_required or 'Not specified'}

Required Skills: {', '.join(jd.required_skills)}
Preferred Skills: {', '.join(jd.preferred_skills)}

Responsibilities:
{chr(10).join(f'- {r}' for r in jd.responsibilities[:8])}

Qualifications:
{chr(10).join(f'- {q}' for q in jd.qualifications[:8])}

---

Perform a detailed match analysis."""

    messages = [
        {"role": "system", "content": MATCH_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    analysis, usage = await chat_completion_structured(
        messages=messages,
        response_model=MatchAnalysis,
        temperature=0.2,
        max_tokens=2500,
    )

    logger.info(
        f"Match analysis: {analysis.overall_score}% — "
        f"{len(analysis.matched_skills)} matched, {len(analysis.missing_skills)} missing"
    )

    return analysis, usage


def _format_experience(resume: ParsedResume) -> str:
    if not resume.work_experience:
        return "No work experience listed"
    entries = []
    for exp in resume.work_experience[:5]:
        dates = f"{exp.start_date or '?'} - {exp.end_date or '?'}"
        bullets = "\n".join(f"  • {b}" for b in exp.bullets[:4])
        techs = f"  Technologies: {', '.join(exp.technologies)}" if exp.technologies else ""
        entries.append(f"• {exp.title} at {exp.company} ({dates})\n{bullets}\n{techs}")
    return "\n".join(entries)


def _format_education(resume: ParsedResume) -> str:
    if not resume.education:
        return "No education listed"
    return "\n".join(
        f"• {e.degree} from {e.institution} ({e.graduation_date or 'N/A'})"
        for e in resume.education[:3]
    )


def _format_projects(resume: ParsedResume) -> str:
    if not resume.projects:
        return "No projects listed"
    return "\n".join(
        f"• {p.name}: {p.description[:100]}"
        for p in resume.projects[:3]
    )
