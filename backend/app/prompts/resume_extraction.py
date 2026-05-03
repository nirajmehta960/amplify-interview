from typing import List, Dict
"""
Prompt templates for resume extraction via LLM.
"""

RESUME_EXTRACTION_SYSTEM = """You are an expert resume parser. Extract structured data from the resume text provided.

Return a JSON object with exactly this structure:
{
  "full_name": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "linkedin_url": "string or null",
  "github_url": "string or null",
  "portfolio_url": "string or null",
  "summary": "string or null (professional summary/objective)",
  "work_experience": [
    {
      "company": "string",
      "title": "string",
      "location": "string or null",
      "start_date": "string (e.g. 'Jan 2022')",
      "end_date": "string (e.g. 'Present' or 'Dec 2024')",
      "is_current": boolean,
      "bullets": ["string (each achievement/responsibility)"],
      "technologies": ["string (technologies mentioned in this role)"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string (e.g. 'B.S. Computer Science')",
      "field_of_study": "string or null",
      "graduation_date": "string or null",
      "gpa": "string or null",
      "honors": ["string"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "url": "string or null",
      "technologies": ["string"],
      "highlights": ["string"]
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string or null",
      "date": "string or null",
      "url": "string or null"
    }
  ],
  "technical_skills": ["string (programming languages, frameworks, tools)"],
  "soft_skills": ["string (communication, leadership, etc.)"],
  "languages": ["string (spoken languages)"],
  "total_years_experience": number or null
}

Rules:
- Extract ALL information present. Do not summarize or omit details.
- For work experience bullets, preserve the original phrasing. Include metrics and numbers.
- Infer technologies from context if not explicitly listed in a skills section.
- Calculate total_years_experience by approximating from work history dates.
- If a field is not present in the resume, use null or empty array.
- Return ONLY the JSON object, no other text."""


def build_resume_extraction_prompt(raw_text: str) -> list[Dict[str, str]]:
    """Build messages for resume extraction."""
    return [
        {"role": "system", "content": RESUME_EXTRACTION_SYSTEM},
        {"role": "user", "content": f"Parse this resume:\n\n{raw_text}"},
    ]
