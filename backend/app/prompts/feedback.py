from typing import Optional, List, Dict, Any, Tuple, AsyncIterator
"""
Prompt templates for end-of-session comprehensive feedback.
Ported and enhanced from the original aiAnalysisPrompts.ts.
"""


def build_session_feedback_prompt(
    messages: List[dict],
    resume_summary: Optional[dict],
    jd_summary: Optional[dict],
    match_analysis: Optional[dict],
    interview_mode: str,
) -> List[Dict[str, str]]:
    """Build prompt for comprehensive session-end feedback."""

    # Format the Q&A pairs
    qa_pairs = []
    for i, msg in enumerate(messages):
        if msg.get("role") == "interviewer":
            # Find the next candidate response
            candidate_response = ""
            analysis_score = None
            for j in range(i + 1, len(messages)):
                if messages[j].get("role") == "candidate":
                    candidate_response = messages[j].get("content", "")
                    analysis_score = messages[j].get("analysis", {}).get("score")
                    break
            if candidate_response:
                entry = f"Q{len(qa_pairs) + 1}: {msg.get('content', '')}\n"
                entry += f"A{len(qa_pairs) + 1}: {candidate_response}\n"
                if analysis_score is not None:
                    entry += f"Score: {analysis_score}/100\n"
                qa_pairs.append(entry)

    qa_text = "\n---\n".join(qa_pairs) if qa_pairs else "No Q&A pairs available."

    # Build context sections
    resume_context = ""
    if resume_summary:
        resume_context = f"""
CANDIDATE PROFILE:
- Name: {resume_summary.get('full_name', 'Unknown')}
- Experience: {resume_summary.get('total_years_experience', 'Unknown')} years
- Skills: {', '.join(resume_summary.get('technical_skills', [])[:10])}
- Recent Role: {resume_summary.get('work_experience', [{}])[0].get('title', 'Unknown') if resume_summary.get('work_experience') else 'Unknown'}
"""

    jd_context = ""
    if jd_summary:
        jd_context = f"""
TARGET ROLE:
- Title: {jd_summary.get('role_title', 'Unknown')}
- Company: {jd_summary.get('company', 'Unknown')}
- Required Skills: {', '.join(jd_summary.get('required_skills', [])[:8])}
"""

    match_context = ""
    if match_analysis:
        match_context = f"""
MATCH ANALYSIS:
- Overall Match: {match_analysis.get('overall_score', 'N/A')}%
- Skill Gaps: {', '.join(match_analysis.get('missing_skills', [])[:5])}
- Strengths: {', '.join(match_analysis.get('strengths', [])[:5])}
"""

    system_prompt = f"""You are an expert interview coach providing comprehensive session feedback.

Analyze the entire interview session and provide structured, actionable feedback.

Return a JSON object:
{{
  "overall_score": number (0-100, weighted average considering all responses),
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
  "score_distribution": {{
    "excellent": number (count of responses scoring 80+),
    "good": number (count scoring 60-79),
    "fair": number (count scoring 40-59),
    "needs_improvement": number (count scoring 0-39)
  }},
  "strengths": ["string (top 3-5 specific strengths observed across all answers)"],
  "improvements": ["string (top 3-5 specific areas for improvement)"],
  "actionable_feedback": "string (2-3 paragraph detailed feedback with specific advice)",
  "role_specific_feedback": "string or null (feedback specific to the target role, referencing JD requirements)",
  "readiness_level": "string ('ready', 'needs_practice', 'significant_improvement')",
  "readiness_score": number (0-100),
  "next_steps": ["string (3-5 concrete next steps for improvement)"],
  "performance_trend": "string ('improving', 'consistent', 'declining')",
  "skill_gaps_addressed": ["string (gaps from match analysis that were demonstrated)"],
  "skill_gaps_remaining": ["string (gaps that weren't adequately addressed)"],
  "recommended_practice_areas": ["string (specific topics to practice)"],
  "estimated_practice_time": "string (e.g., '2-3 hours focused practice')"
}}

Scoring calibration:
- 85-100: Interview-ready, strong candidate with few or no weaknesses
- 70-84: Good performance with specific areas to polish
- 55-69: Average, needs targeted practice on multiple areas
- 40-54: Below average, fundamental improvements needed
- 0-39: Significant preparation required"""

    user_prompt = f"""INTERVIEW SESSION ({interview_mode.upper()} mode)

{resume_context}{jd_context}{match_context}
INTERVIEW TRANSCRIPT:
{qa_text}

Provide comprehensive feedback for this interview session."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
