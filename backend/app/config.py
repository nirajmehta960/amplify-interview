"""
Application configuration using pydantic-settings.
Loads from environment variables and .env file.
"""

from typing import List
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──────────────────────────────────────────────
    app_name: str = "Amplify Interview API"
    app_version: str = "2.0.0"
    debug: bool = False
    environment: str = "development"  # development | staging | production
    allowed_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ]

    # ── GCP ──────────────────────────────────────────────
    gcp_project_id: str = ""
    gcs_bucket_name: str = "amplify-interview-uploads"
    firestore_database: str = "(default)"

    # ── Firebase Auth ────────────────────────────────────
    firebase_project_id: str = ""
    firebase_service_account_path: str = ""

    # ── OpenAI ───────────────────────────────────────────
    openai_api_key: str = ""
    openai_model_default: str = "gpt-4o-mini"
    openai_model_advanced: str = "gpt-4o"
    openai_max_retries: int = 3
    openai_timeout: int = 60

    # ── Rate Limiting ────────────────────────────────────
    rate_limit_per_minute: int = 30
    rate_limit_burst: int = 10

    # ── Session Defaults ─────────────────────────────────
    max_questions_per_session: int = 20
    default_question_count: int = 10
    max_resume_size_mb: int = 10
    max_jd_length: int = 10000

    @property
    def max_resume_size_bytes(self) -> int:
        return self.max_resume_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
