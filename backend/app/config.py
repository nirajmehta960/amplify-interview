"""
Application configuration using pydantic-settings.
Loads from environment variables and .env file.
"""

from typing import List, Any
from typing_extensions import Annotated
from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode


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
    # NoDecode disables pydantic-settings' automatic JSON decoding so the
    # validator below can accept plain comma-separated env values.
    allowed_origins: Annotated[List[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Any) -> Any:
        """
        Support comma-separated env var values like:
        ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
        or JSON array values like ["http://localhost:3000"].
        """
        if v is None:
            return v
        if isinstance(v, str):
            raw = v.strip()
            if raw.startswith("[") and raw.endswith("]"):
                import json
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    pass
            return [s.strip() for s in raw.split(",") if s.strip()]
        return v

    # ── AWS Configs ──────────────────────────────────────
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    aws_s3_bucket: str = "amplify-interview-uploads"
    aws_cognito_user_pool_id: str = ""
    aws_cognito_client_id: str = ""
    aws_dynamodb_table_prefix: str = "amplify_"

    # ── LLM (OpenAI API or OpenRouter-compatible base URL) ──
    openai_api_key: str = ""
    # Empty = official OpenAI (https://api.openai.com/v1). For OpenRouter: https://openrouter.ai/api/v1
    openai_api_base: str = ""
    openai_model_default: str = "gpt-4o-mini"
    openai_model_advanced: str = "gpt-4o"
    openai_max_retries: int = 3
    openai_timeout: int = 60

    # ── Email (Resend) ───────────────────────────────────
    resend_api_key: str = ""
    email_from: str = "Amplify Interview <noreply@amplifyinterview.com>"
    app_url: str = "https://amplifyinterview.com"

    # ── Speech-to-Text (AWS Transcribe) ──────────────────
    aws_transcribe_language: str = "en-US"

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
