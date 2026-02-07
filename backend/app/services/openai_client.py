"""
Centralized OpenAI API client with retry logic, structured output,
cost tracking, and streaming support.
"""


import json
import logging
from typing import Any, AsyncIterator, Optional, List, Dict, Tuple, Type

from openai import AsyncOpenAI, APIError, RateLimitError, APITimeoutError
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create the singleton async OpenAI client."""
    global _client
    if _client is None:
        settings = get_settings()
        kwargs: dict = {
            "api_key": settings.openai_api_key,
            "max_retries": settings.openai_max_retries,
            "timeout": settings.openai_timeout,
        }
        base = (settings.openai_api_base or "").strip()
        if base:
            kwargs["base_url"] = base
            if "openrouter.ai" in base:
                kwargs["default_headers"] = {
                    "HTTP-Referer": settings.app_url or "http://localhost:5173",
                    "X-Title": settings.app_name,
                }
        _client = AsyncOpenAI(**kwargs)
    return _client


# ── Cost Tracking ────────────────────────────────────────

MODEL_COSTS_PER_MILLION = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini-2024-07-18": {"input": 0.15, "output": 0.60},
    "gpt-4o-2024-08-06": {"input": 2.50, "output": 10.00},
}


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_cents: int = 0
    model: str = ""


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> TokenUsage:
    """Calculate cost in cents for an API call."""
    costs = MODEL_COSTS_PER_MILLION.get(model, {"input": 0.15, "output": 0.60})
    input_cost = (input_tokens / 1_000_000) * costs["input"]
    output_cost = (output_tokens / 1_000_000) * costs["output"]
    total_cost_cents = max(1, round((input_cost + output_cost) * 100))

    return TokenUsage(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=input_tokens + output_tokens,
        cost_cents=total_cost_cents,
        model=model,
    )


# ── Chat Completion ──────────────────────────────────────


async def chat_completion(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 2000,
    response_format: Optional[dict] = None,
) -> Tuple[str, TokenUsage]:
    """
    Send a chat completion request and return (content, usage).

    Args:
        messages: List of {"role": ..., "content": ...} dicts
        model: Model name (defaults to settings.openai_model_default)
        temperature: Sampling temperature
        max_tokens: Max output tokens
        response_format: e.g. {"type": "json_object"} for JSON mode

    Returns:
        Tuple of (response_content_string, token_usage)
    """
    settings = get_settings()
    model = model or settings.openai_model_default
    client = get_openai_client()

    kwargs: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format

    try:
        response = await client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content or ""
        usage = calculate_cost(
            model,
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
        )
        return content, usage

    except RateLimitError as e:
        logger.warning(f"OpenAI rate limit hit: {e}")
        raise
    except APITimeoutError as e:
        logger.warning(f"OpenAI timeout: {e}")
        raise
    except APIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise


async def chat_completion_json(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> Tuple[Dict[str, Any], TokenUsage]:
    """
    Chat completion with JSON mode enabled.
    Returns (parsed_dict, usage).
    """
    content, usage = await chat_completion(
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code fences
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            cleaned = cleaned.rsplit("```", 1)[0]
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from model output: {content[:200]}")
            raise ValueError("Model returned invalid JSON")

    return parsed, usage


async def chat_completion_structured(
    messages: List[Dict[str, str]],
    response_model: Type[BaseModel],
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> Tuple[BaseModel, TokenUsage]:
    """
    Chat completion that validates output against a Pydantic model.
    Returns (validated_model_instance, usage).
    """
    # Add schema to system message
    schema_json = json.dumps(response_model.model_json_schema(), indent=2)
    schema_instruction = {
        "role": "system",
        "content": (
            f"You MUST return your response as a valid JSON object matching this exact schema:\n"
            f"```json\n{schema_json}\n```\n"
            f"Do not include any text outside the JSON object."
        ),
    }
    augmented_messages = [schema_instruction] + messages

    data, usage = await chat_completion_json(
        messages=augmented_messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    try:
        result = response_model.model_validate(data)
    except Exception as e:
        logger.error(f"Schema validation failed: {e}")
        raise ValueError(f"Model output does not match expected schema: {e}")

    return result, usage


# ── Streaming ────────────────────────────────────────────


async def chat_completion_stream(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 2000,
) -> AsyncIterator[str]:
    """
    Stream chat completion tokens. Yields content delta strings.
    """
    settings = get_settings()
    model = model or settings.openai_model_default
    client = get_openai_client()

    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content
