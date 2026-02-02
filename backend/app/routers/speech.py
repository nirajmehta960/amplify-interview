"""
Speech-to-Text router.
Proxies audio to Google Cloud Speech-to-Text, replacing the browser-side Deepgram call.
Removes the only remaining browser-exposed third-party API key.
"""

import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

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


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """
    Transcribe an audio/video file using Google Cloud Speech-to-Text.
    Accepts any audio format; returns transcript text, confidence, and word timestamps.
    Does not require authentication — called from the interview session.
    """
    settings = get_settings()

    try:
        from google.cloud import speech

        audio_content = await audio_file.read()

        client = speech.SpeechClient()

        audio = speech.RecognitionAudio(content=audio_content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code=settings.gcp_speech_language,
            enable_word_time_offsets=True,
            enable_automatic_punctuation=True,
            model="latest_long",
        )

        response = client.recognize(config=config, audio=audio)

        if not response.results:
            return TranscribeResponse(text="", confidence=0.0, words=[])

        # Combine all results
        full_text = " ".join(
            result.alternatives[0].transcript
            for result in response.results
            if result.alternatives
        )
        avg_confidence = sum(
            result.alternatives[0].confidence
            for result in response.results
            if result.alternatives
        ) / len(response.results)

        words: list[TranscriptWord] = []
        for result in response.results:
            if not result.alternatives:
                continue
            for word_info in result.alternatives[0].words:
                words.append(TranscriptWord(
                    word=word_info.word,
                    start_time=word_info.start_time.total_seconds(),
                    end_time=word_info.end_time.total_seconds(),
                ))

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
