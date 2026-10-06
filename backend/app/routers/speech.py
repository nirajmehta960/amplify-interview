"""
Speech-to-Text router using AWS Transcribe.
"""

import logging
import asyncio
from typing import Optional
from uuid import uuid4
import httpx

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/speech", tags=["Speech"])


class TranscriptWord(BaseModel):
    word: str
    start_time: float
    end_time: float


class TranscribeResponse(BaseModel):
    text: str
    confidence: float
    words: list[TranscriptWord]


def _get_transcribe_client():
    settings = get_settings()
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("transcribe", **kwargs)


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """
    Transcribe an audio file using AWS Transcribe.
    Uploads the file to S3, runs transcription, parses results, and cleans up.
    """
    settings = get_settings()
    transcribe = _get_transcribe_client()

    # 1. Read file and prepare keys
    audio_content = await audio_file.read()
    if not audio_content:
        raise HTTPException(400, "Empty audio file received")

    job_id = uuid4().hex
    job_name = f"transcribe_job_{job_id}"
    s3_key = f"transcribe_temp/{job_id}.webm"

    s3_bucket = settings.aws_s3_bucket

    # S3 client creation
    s3 = boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )

    try:
        # Create bucket if it doesn't exist
        try:
            s3.head_bucket(Bucket=s3_bucket)
        except ClientError as e:
            if e.response["Error"]["Code"] in ["404", "NoSuchBucket"]:
                create_args = {"Bucket": s3_bucket}
                if settings.aws_region != "us-east-1":
                    create_args["CreateBucketConfiguration"] = {"LocationConstraint": settings.aws_region}
                s3.create_bucket(**create_args)
            else:
                raise

        # Upload file to S3
        s3.put_object(
            Bucket=s3_bucket,
            Key=s3_key,
            Body=audio_content,
            ContentType="audio/webm",
        )
        s3_uri = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"
        if settings.aws_region != "us-east-1":
            s3_uri = f"https://{s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{s3_key}"

        # 2. Trigger Transcribe Job
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={"MediaFileUri": s3_uri},
            MediaFormat="webm",
            LanguageCode=settings.aws_transcribe_language,
        )
        logger.info(f"Started AWS Transcribe job {job_name}")

        # 3. Poll for Completion
        max_attempts = 120  # max 60 seconds (0.5s intervals)
        status = "IN_PROGRESS"
        while max_attempts > 0:
            job = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            status = job["TranscriptionJob"]["TranscriptionJobStatus"]
            if status in ["COMPLETED", "FAILED"]:
                break
            await asyncio.sleep(0.5)
            max_attempts -= 1

        if status == "FAILED":
            reason = job["TranscriptionJob"].get("FailureReason", "Unknown error")
            raise HTTPException(500, f"Transcription job failed: {reason}")
        if status != "COMPLETED":
            raise HTTPException(508, "Transcription job timed out")

        # 4. Fetch Transcription JSON
        transcript_url = job["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
        async with httpx.AsyncClient() as client:
            res = await client.get(transcript_url)
            res.raise_for_status()
            result_data = res.json()

        # 5. Parse JSON
        results = result_data.get("results", {})
        transcripts = results.get("transcripts", [])
        full_text = transcripts[0].get("transcript", "") if transcripts else ""

        items = results.get("items", [])
        words: list[TranscriptWord] = []
        confidences = []

        for item in items:
            if item.get("type") != "pronunciation":
                continue
            alt = item.get("alternatives", [{}])[0]
            content = alt.get("content", "")
            confidence = float(alt.get("confidence", "0.0"))

            start_time = float(item.get("start_time", "0.0"))
            end_time = float(item.get("end_time", "0.0"))

            words.append(TranscriptWord(
                word=content,
                start_time=start_time,
                end_time=end_time,
            ))
            confidences.append(confidence)

        avg_confidence = sum(confidences) / len(confidences) if confidences else 1.0

        return TranscribeResponse(
            text=full_text,
            confidence=round(avg_confidence, 3),
            words=words,
        )

    except Exception as exc:
        logger.error(f"Speech transcription failed: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(exc)}",
        )

    finally:
        # 6. Cleanup S3 file & Transcribe Job
        try:
            s3.delete_object(Bucket=s3_bucket, Key=s3_key)
        except Exception as cleanup_err:
            logger.warning(f"Failed to cleanup temp transcription S3 file: {cleanup_err}")
        try:
            transcribe.delete_transcription_job(TranscriptionJobName=job_name)
        except Exception as cleanup_err:
            logger.warning(f"Failed to delete transcription job {job_name}: {cleanup_err}")
