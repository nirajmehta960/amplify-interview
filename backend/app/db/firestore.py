"""
Firestore client and helper functions.
Provides async-style access to Firestore collections.
"""


import logging
from datetime import datetime, timezone
from typing import Any, Optional, Dict, List

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import AsyncClient
from google.cloud.firestore_v1.async_document import AsyncDocumentReference
from google.cloud.firestore_v1.async_collection import AsyncCollectionReference

from app.config import get_settings

logger = logging.getLogger(__name__)

_app: Optional[firebase_admin.App] = None
_db: Optional[AsyncClient] = None


def _init_firebase() -> firebase_admin.App:
    """Initialize Firebase Admin SDK (called once)."""
    global _app
    if _app is not None:
        return _app

    settings = get_settings()

    if settings.firebase_service_account_path:
        cred = credentials.Certificate(settings.firebase_service_account_path)
        _app = firebase_admin.initialize_app(cred, {
            "projectId": settings.gcp_project_id or settings.firebase_project_id,
        })
    else:
        # Use Application Default Credentials (Cloud Run auto-provides these)
        _app = firebase_admin.initialize_app(options={
            "projectId": settings.gcp_project_id or settings.firebase_project_id,
        })

    logger.info("Firebase Admin SDK initialized")
    return _app


def get_firestore_client() -> AsyncClient:
    """Get or create the async Firestore client."""
    global _db
    if _db is not None:
        return _db

    _init_firebase()
    settings = get_settings()
    _db = AsyncClient(
        project=settings.gcp_project_id or settings.firebase_project_id,
        database=settings.firestore_database,
    )
    logger.info("Firestore async client created")
    return _db


# ── Helper Functions ─────────────────────────────────────


def utc_now() -> str:
    """Return current UTC timestamp as ISO string."""
    return datetime.now(timezone.utc).isoformat()


# ---------- Collection References ----------


def users_col() -> AsyncCollectionReference:
    return get_firestore_client().collection("users")


def user_doc(user_id: str) -> AsyncDocumentReference:
    return users_col().document(user_id)


def resumes_col(user_id: str) -> AsyncCollectionReference:
    return user_doc(user_id).collection("resumes")


def jds_col(user_id: str) -> AsyncCollectionReference:
    return user_doc(user_id).collection("job_descriptions")


def sessions_col(user_id: str) -> AsyncCollectionReference:
    return user_doc(user_id).collection("sessions")


def messages_col(user_id: str, session_id: str) -> AsyncCollectionReference:
    return sessions_col(user_id).document(session_id).collection("messages")


def question_bank_col() -> AsyncCollectionReference:
    return get_firestore_client().collection("question_bank")


def user_questions_col(user_id: str) -> AsyncCollectionReference:
    return user_doc(user_id).collection("questions")


# ---------- CRUD Helpers ----------


async def create_document(
    collection_ref: AsyncCollectionReference,
    data: Dict[str, Any],
    doc_id: Optional[str] = None,
) -> str:
    """Create a document, return its ID."""
    data["created_at"] = data.get("created_at", utc_now())

    if doc_id:
        doc_ref = collection_ref.document(doc_id)
        await doc_ref.set(data)
        return doc_id
    else:
        doc_ref = await collection_ref.add(data)
        # .add() returns a tuple: (timestamp, doc_ref)
        return doc_ref[1].id


async def get_document(doc_ref: AsyncDocumentReference) -> Optional[Dict[str, Any]]:
    """Get a document, return None if not found."""
    snapshot = await doc_ref.get()
    if not snapshot.exists:
        return None
    data = snapshot.to_dict()
    data["id"] = snapshot.id
    return data


async def update_document(
    doc_ref: AsyncDocumentReference,
    data: Dict[str, Any],
) -> None:
    """Update fields on an existing document."""
    data["updated_at"] = utc_now()
    await doc_ref.update(data)


async def list_documents(
    collection_ref: AsyncCollectionReference,
    order_by: Optional[str] = "created_at",
    direction: str = "DESCENDING",
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """List documents in a collection."""
    query = collection_ref

    if order_by:
        from google.cloud.firestore_v1 import Query
        dir_enum = (
            Query.DESCENDING if direction == "DESCENDING" else Query.ASCENDING
        )
        query = query.order_by(order_by, direction=dir_enum)

    query = query.limit(limit)
    docs = []
    async for snapshot in query.stream():
        data = snapshot.to_dict()
        data["id"] = snapshot.id
        docs.append(data)
    return docs


async def delete_document(doc_ref: AsyncDocumentReference) -> None:
    """Delete a document."""
    await doc_ref.delete()
