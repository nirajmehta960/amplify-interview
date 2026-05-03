from typing import Optional, List, Dict, Any, Tuple, AsyncIterator
"""
Google Cloud Storage helpers for file upload/download.
"""


import logging
from io import BytesIO
from uuid import uuid4

from google.cloud import storage as gcs

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: Optional[gcs.Client] = None


def _get_gcs_client() -> gcs.Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = gcs.Client(project=settings.gcp_project_id)
    return _client


def _get_bucket() -> gcs.Bucket:
    settings = get_settings()
    return _get_gcs_client().bucket(settings.gcs_bucket_name)


async def upload_file(
    file_content: bytes,
    file_name: str,
    content_type: str,
    user_id: str,
    subfolder: str = "resumes",
) -> str:
    """
    Upload a file to GCS and return the gs:// URI.

    Files are stored as: {subfolder}/{user_id}/{uuid}_{original_name}
    """
    bucket = _get_bucket()
    unique_name = f"{uuid4().hex[:8]}_{file_name}"
    blob_path = f"{subfolder}/{user_id}/{unique_name}"
    blob = bucket.blob(blob_path)

    blob.upload_from_string(file_content, content_type=content_type)
    logger.info(f"Uploaded file to gs://{bucket.name}/{blob_path}")

    return f"gs://{bucket.name}/{blob_path}"


async def download_file(gcs_uri: str) -> bytes:
    """Download a file from GCS given its gs:// URI."""
    # Parse gs://bucket/path
    if not gcs_uri.startswith("gs://"):
        raise ValueError(f"Invalid GCS URI: {gcs_uri}")

    parts = gcs_uri[5:].split("/", 1)
    bucket_name = parts[0]
    blob_path = parts[1]

    bucket = _get_gcs_client().bucket(bucket_name)
    blob = bucket.blob(blob_path)

    buffer = BytesIO()
    blob.download_to_file(buffer)
    buffer.seek(0)
    return buffer.read()


async def delete_file(gcs_uri: str) -> None:
    """Delete a file from GCS given its gs:// URI."""
    if not gcs_uri.startswith("gs://"):
        raise ValueError(f"Invalid GCS URI: {gcs_uri}")

    parts = gcs_uri[5:].split("/", 1)
    bucket_name = parts[0]
    blob_path = parts[1]

    bucket = _get_gcs_client().bucket(bucket_name)
    blob = bucket.blob(blob_path)
    blob.delete()
    logger.info(f"Deleted file: {gcs_uri}")


def generate_signed_url(gcs_uri: str, expiration_minutes: int = 60) -> str:
    """Generate a signed URL for temporary public access."""
    from datetime import timedelta

    if not gcs_uri.startswith("gs://"):
        raise ValueError(f"Invalid GCS URI: {gcs_uri}")

    parts = gcs_uri[5:].split("/", 1)
    bucket_name = parts[0]
    blob_path = parts[1]

    bucket = _get_gcs_client().bucket(bucket_name)
    blob = bucket.blob(blob_path)

    url = blob.generate_signed_url(
        expiration=timedelta(minutes=expiration_minutes),
        method="GET",
    )
    return url
