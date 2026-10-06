"""
AWS S3 storage helpers for file upload/download.
"""

import logging
from io import BytesIO
from uuid import uuid4
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)

_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is None:
        settings = get_settings()
        kwargs = {"region_name": settings.aws_region}
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
        _s3_client = boto3.client("s3", **kwargs)
    return _s3_client


async def upload_file(
    file_content: bytes,
    file_name: str,
    content_type: str,
    user_id: str,
    subfolder: str = "resumes",
) -> str:
    """
    Upload a file to S3 and return the s3:// URI.

    Files are stored as: {subfolder}/{user_id}/{uuid}_{original_name}
    """
    settings = get_settings()
    s3 = _get_s3_client()
    bucket = settings.aws_s3_bucket
    unique_name = f"{uuid4().hex[:8]}_{file_name}"
    blob_path = f"{subfolder}/{user_id}/{unique_name}"

    try:
        # Create S3 bucket if it doesn't exist for dev convenience
        try:
            s3.head_bucket(Bucket=bucket)
        except ClientError as e:
            if e.response["Error"]["Code"] in ["404", "NoSuchBucket"]:
                logger.info(f"S3 Bucket {bucket} not found. Creating it...")
                create_args = {"Bucket": bucket}
                if settings.aws_region != "us-east-1":
                    create_args["CreateBucketConfiguration"] = {"LocationConstraint": settings.aws_region}
                s3.create_bucket(**create_args)
            else:
                raise

        s3.put_object(
            Bucket=bucket,
            Key=blob_path,
            Body=file_content,
            ContentType=content_type
        )
        logger.info(f"Uploaded file to s3://{bucket}/{blob_path}")
        return f"s3://{bucket}/{blob_path}"
    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        raise


async def download_file(s3_uri: str) -> bytes:
    """Download a file from S3 given its s3:// URI."""
    if not s3_uri.startswith("s3://"):
        raise ValueError(f"Invalid S3 URI: {s3_uri}")

    parts = s3_uri[5:].split("/", 1)
    bucket_name = parts[0]
    blob_path = parts[1]

    s3 = _get_s3_client()
    try:
        res = s3.get_object(Bucket=bucket_name, Key=blob_path)
        return res["Body"].read()
    except ClientError as e:
        logger.error(f"S3 download failed: {e}")
        raise


async def delete_file(s3_uri: str) -> None:
    """Delete a file from S3 given its s3:// URI."""
    if not s3_uri.startswith("s3://"):
        raise ValueError(f"Invalid S3 URI: {s3_uri}")

    parts = s3_uri[5:].split("/", 1)
    bucket_name = parts[0]
    blob_path = parts[1]

    s3 = _get_s3_client()
    try:
        s3.delete_object(Bucket=bucket_name, Key=blob_path)
        logger.info(f"Deleted S3 file: {s3_uri}")
    except ClientError as e:
        logger.error(f"S3 delete failed: {e}")
        raise


def generate_signed_url(s3_uri: str, expiration_minutes: int = 60) -> str:
    """Generate a presigned URL for temporary access to a private object."""
    if not s3_uri.startswith("s3://"):
        raise ValueError(f"Invalid S3 URI: {s3_uri}")

    parts = s3_uri[5:].split("/", 1)
    bucket_name = parts[0]
    blob_path = parts[1]

    s3 = _get_s3_client()
    try:
        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": bucket_name, "Key": blob_path},
            ExpiresIn=expiration_minutes * 60,
        )
        return url
    except ClientError as e:
        logger.error(f"S3 presigned URL generation failed: {e}")
        raise
