from typing import Optional, List, Dict
"""
Analytics API router.
Provides aggregated performance data and progress tracking.
"""


import logging
from collections import defaultdict

from fastapi import APIRouter, HTTPException

from app.middleware.auth import CurrentUser
from app.db import firestore as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(user: CurrentUser):
    """
    Get high-level analytics overview for the user.
    Returns total sessions, average scores, readiness trend, etc.
    """
    sessions = await db.list_documents(db.sessions_col(user.uid), limit=100)

    completed = [s for s in sessions if s.get("status") == "completed"]
    summaries = [s.get("summary", {}) for s in completed if s.get("summary")]

    total_sessions = len(sessions)
    completed_sessions = len(completed)
    scores = [s.get("overall_score", 0) for s in summaries if s.get("overall_score")]

    # Calculate trends
    avg_score = sum(scores) / len(scores) if scores else 0
    recent_scores = scores[:5]
    older_scores = scores[5:10]
    trend = "consistent"
    if recent_scores and older_scores:
        recent_avg = sum(recent_scores) / len(recent_scores)
        older_avg = sum(older_scores) / len(older_scores)
        if recent_avg > older_avg + 5:
            trend = "improving"
        elif recent_avg < older_avg - 5:
            trend = "declining"

    # Readiness distribution
    readiness_counts = defaultdict(int)
    for s in summaries:
        level = s.get("readiness_level", "unknown")
        readiness_counts[level] += 1

    # Mode distribution
    mode_counts = defaultdict(int)
    for s in completed:
        mode = s.get("config", {}).get("mode", "unknown")
        mode_counts[mode] += 1

    # Total cost
    total_cost_cents = sum(s.get("total_cost_cents", 0) for s in sessions)

    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "average_score": round(avg_score, 1),
        "highest_score": max(scores) if scores else 0,
        "lowest_score": min(scores) if scores else 0,
        "performance_trend": trend,
        "recent_scores": scores[:10],
        "readiness_distribution": dict(readiness_counts),
        "mode_distribution": dict(mode_counts),
        "total_cost_cents": total_cost_cents,
    }


@router.get("/progress")
async def get_progress(user: CurrentUser):
    """
    Get detailed progress data for charts and visualizations.
    Returns score history, skill trends, and practice areas.
    """
    sessions = await db.list_documents(
        db.sessions_col(user.uid),
        order_by="created_at",
        direction="ASCENDING",
        limit=50,
    )

    completed = [s for s in sessions if s.get("status") == "completed" and s.get("summary")]

    # Score timeline
    score_timeline = []
    for s in completed:
        summary = s.get("summary", {})
        score_timeline.append({
            "date": s.get("created_at", ""),
            "score": summary.get("overall_score", 0),
            "mode": s.get("config", {}).get("mode", "mixed"),
            "readiness": summary.get("readiness_level", "unknown"),
        })

    # Communication scores over time
    comm_timeline = []
    for s in completed:
        summary = s.get("summary", {})
        comm = summary.get("communication_scores", {})
        if comm:
            comm_timeline.append({
                "date": s.get("created_at", ""),
                "clarity": comm.get("clarity", 0),
                "structure": comm.get("structure", 0),
                "conciseness": comm.get("conciseness", 0),
            })

    # Aggregate strengths and common improvements
    all_strengths = []
    all_improvements = []
    for s in completed[-10:]:  # Last 10 sessions
        summary = s.get("summary", {})
        all_strengths.extend(summary.get("strengths", []))
        all_improvements.extend(summary.get("improvements", []))

    # Count frequency
    strength_freq = _count_frequency(all_strengths)
    improvement_freq = _count_frequency(all_improvements)

    return {
        "score_timeline": score_timeline,
        "communication_timeline": comm_timeline,
        "top_strengths": strength_freq[:5],
        "top_improvements": improvement_freq[:5],
        "total_practice_sessions": len(completed),
    }


@router.get("/skills")
async def get_skill_analytics(user: CurrentUser):
    """
    Get skill-level analytics from resume and session data.
    Shows which skills have been demonstrated and which gaps remain.
    """
    # Get latest resume
    resumes = await db.list_documents(db.resumes_col(user.uid), limit=1)
    resume_skills = []
    if resumes:
        parsed = resumes[0].get("parsed_data", {})
        resume_skills = parsed.get("technical_skills", [])

    # Get skill gaps from sessions
    sessions = await db.list_documents(db.sessions_col(user.uid), limit=20)
    addressed_gaps = set()
    remaining_gaps = set()

    for s in sessions:
        summary = s.get("summary", {})
        addressed_gaps.update(summary.get("skill_gaps_addressed", []))
        remaining_gaps.update(summary.get("skill_gaps_remaining", []))

    # Remove addressed from remaining
    remaining_gaps -= addressed_gaps

    return {
        "resume_skills": resume_skills[:20],
        "skills_demonstrated": list(addressed_gaps),
        "skills_to_practice": list(remaining_gaps),
    }


def _count_frequency(items: List[str]) -> List[dict]:
    """Count item frequency and return sorted list."""
    counts = defaultdict(int)
    for item in items:
        counts[item] += 1
    sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [{"item": k, "count": v} for k, v in sorted_items]
