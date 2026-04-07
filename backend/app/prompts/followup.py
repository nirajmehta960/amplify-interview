from typing import Optional, List, Dict, Any, Tuple, AsyncIterator
"""
Prompt templates for follow-up question generation and response analysis.
"""


def build_followup_prompt(
    question: str,
    response: str,
    resume_context: Optional[dict] = None,
    difficulty: str = "medium",
) -> List[Dict[str, str]]:
    """Build prompt to decide whether to follow up and generate follow-up question."""

    resume_clause = ""
    if resume_context:
        resume_clause = f"""
CANDIDATE CONTEXT:
- Current/Recent Role: {resume_context.get('recent_role', 'Unknown')}
- Key Skills: {', '.join(resume_context.get('technical_skills', [])[:8])}
"""

    system_prompt = f"""You are conducting an interview. Analyze the candidate's response and decide whether a follow-up question is warranted.

Follow up if:
1. The answer is vague or lacks specific examples
2. The candidate mentions something interesting that deserves deeper exploration
3. There's a technical claim that should be verified with more detail
4. The STAR method was attempted but incomplete (missing Result, for example)

Do NOT follow up if:
1. The answer was comprehensive and well-structured
2. The candidate already provided sufficient depth
3. Following up would feel repetitive

Return a JSON object:
{{
  "should_followup": boolean,
  "reason": "string (why or why not to follow up)",
  "followup_question": "string or null (the follow-up question if should_followup is true)",
  "followup_type": "string or null ('clarify', 'deepen', 'verify', 'pivot')"
}}

Current difficulty: {difficulty}
{resume_clause}"""

    user_prompt = f"""ORIGINAL QUESTION: {question}

CANDIDATE'S RESPONSE: {response}

Should we follow up? If so, what question?"""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def build_response_analysis_prompt(
    question: str,
    response: str,
    interview_type: str,
    question_category: str,
) -> List[Dict[str, str]]:
    """Build prompt for inline response analysis (quick scoring during interview)."""

    analysis_focus = {
        "behavioral": "Focus on STAR method, specific examples, ownership, and quantified results.",
        "technical": "Focus on technical accuracy, problem-solving approach, depth of understanding.",
        "system_design": "Focus on scalability, trade-offs, real-world considerations.",
        "leadership": "Focus on strategic thinking, team impact, decision-making framework.",
    }

    focus = analysis_focus.get(question_category, analysis_focus["behavioral"])

    system_prompt = f"""You are evaluating an interview response in real-time. Provide a brief, focused analysis.

{focus}

Return a JSON object:
{{
  "score": number (0-100),
  "communication_scores": {{
    "clarity": number (0-100),
    "structure": number (0-100),
    "conciseness": number (0-100)
  }},
  "content_scores": {{
    "relevance": number (0-100),
    "depth": number (0-100),
    "specificity": number (0-100)
  }},
  "strengths": ["string (1-3 specific strengths)"],
  "improvements": ["string (1-3 specific improvements)"],
  "brief_feedback": "string (2-3 sentence summary of performance)"
}}

Be calibrated: 80+ is genuinely excellent, 60-79 is good, 40-59 is fair, below 40 needs significant improvement.
Score based on what a real interviewer at a top tech company would think."""

    user_prompt = f"""Interview type: {interview_type}

QUESTION: {question}

CANDIDATE'S RESPONSE: {response}

Analyze this response."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
