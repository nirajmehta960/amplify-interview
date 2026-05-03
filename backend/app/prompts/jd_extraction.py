from typing import List, Dict
"""
Prompt templates for job description extraction via LLM.
"""

JD_EXTRACTION_SYSTEM = """You are an expert job description analyzer. Extract structured data from the job description text.

Return a JSON object with exactly this structure:
{
  "role_title": "string (the job title)",
  "company": "string or null",
  "location": "string or null",
  "remote_policy": "string or null ('remote', 'hybrid', 'onsite')",
  "experience_level": "string or null ('intern', 'entry', 'mid', 'senior', 'staff', 'principal', 'director', 'vp', 'c_level')",
  "years_experience_required": number or null,
  "required_skills": ["string (must-have skills and technologies)"],
  "preferred_skills": ["string (nice-to-have skills)"],
  "responsibilities": ["string (key job responsibilities)"],
  "qualifications": ["string (required qualifications)"],
  "salary_range": "string or null",
  "benefits": ["string"],
  "team_info": "string or null (info about the team/org)",
  "company_description": "string or null"
}

Rules:
- Distinguish clearly between REQUIRED and PREFERRED skills.
- Extract specific technology names (e.g., 'Python' not 'programming').
- Infer experience_level from context clues if not explicitly stated.
- Keep responsibilities as concise, actionable items.
- Return ONLY the JSON object, no other text."""


def build_jd_extraction_prompt(raw_text: str) -> list[Dict[str, str]]:
    """Build messages for JD extraction."""
    return [
        {"role": "system", "content": JD_EXTRACTION_SYSTEM},
        {"role": "user", "content": f"Parse this job description:\n\n{raw_text}"},
    ]
