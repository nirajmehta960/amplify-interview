"""
User question bank router.
CRUD for user-owned practice questions stored in Firestore.
Replaces the Supabase user_questions table.
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.middleware.auth import CurrentUser
from app.db import firestore as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/questions", tags=["Questions"])


# ── Models ────────────────────────────────────────────────


class QuestionCreate(BaseModel):
    question_text: str
    category: str  # e.g. "Behavioral", "Technical", "Product Manager"


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    category: Optional[str] = None


class QuestionResponse(BaseModel):
    id: str
    question_text: str
    category: str
    user_id: str
    created_at: str
    updated_at: Optional[str] = None


# ── Routes ────────────────────────────────────────────────


@router.get("", response_model=List[QuestionResponse])
async def list_questions(
    user: CurrentUser,
    category: Optional[str] = Query(None, description="Filter by category"),
    q: Optional[str] = Query(None, description="Search term"),
):
    """List all practice questions for the current user."""
    docs = await db.list_documents(db.user_questions_col(user.uid), limit=500)

    # Apply category filter
    if category:
        docs = [d for d in docs if d.get("category", "").lower() == category.lower()]

    # Apply search filter (client-side — Firestore full-text search requires extra setup)
    if q:
        q_lower = q.lower()
        docs = [d for d in docs if q_lower in d.get("question_text", "").lower()]

    return [
        QuestionResponse(
            id=d["id"],
            question_text=d.get("question_text", ""),
            category=d.get("category", ""),
            user_id=d.get("user_id", user.uid),
            created_at=d.get("created_at", ""),
            updated_at=d.get("updated_at"),
        )
        for d in docs
    ]


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(user: CurrentUser, body: QuestionCreate):
    """Create a new practice question."""
    if not body.question_text.strip():
        raise HTTPException(400, "question_text cannot be empty")

    data = {
        "question_text": body.question_text.strip(),
        "category": body.category.strip(),
        "user_id": user.uid,
    }

    doc_id = await db.create_document(db.user_questions_col(user.uid), data)

    created = await db.get_document(db.user_questions_col(user.uid).document(doc_id))
    return QuestionResponse(
        id=doc_id,
        question_text=created["question_text"],
        category=created["category"],
        user_id=created["user_id"],
        created_at=created["created_at"],
        updated_at=created.get("updated_at"),
    )


@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(user: CurrentUser, question_id: str, body: QuestionUpdate):
    """Update an existing practice question."""
    doc_ref = db.user_questions_col(user.uid).document(question_id)
    existing = await db.get_document(doc_ref)

    if not existing:
        raise HTTPException(404, "Question not found")

    updates = {}
    if body.question_text is not None:
        if not body.question_text.strip():
            raise HTTPException(400, "question_text cannot be empty")
        updates["question_text"] = body.question_text.strip()
    if body.category is not None:
        updates["category"] = body.category.strip()

    if updates:
        await db.update_document(doc_ref, updates)

    updated = await db.get_document(doc_ref)
    return QuestionResponse(
        id=question_id,
        question_text=updated["question_text"],
        category=updated["category"],
        user_id=updated["user_id"],
        created_at=updated["created_at"],
        updated_at=updated.get("updated_at"),
    )


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(user: CurrentUser, question_id: str):
    """Delete a practice question."""
    doc_ref = db.user_questions_col(user.uid).document(question_id)
    existing = await db.get_document(doc_ref)

    if not existing:
        raise HTTPException(404, "Question not found")

    await db.delete_document(doc_ref)
