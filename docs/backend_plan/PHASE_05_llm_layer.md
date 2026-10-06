# Backend Phase 5 — The LLM Integration Layer

**What this covers:** the single wrapper every AI call in the app goes through — structured output, cost tracking, and failure handling.
**Files:** `backend/app/services/openai_client.py`
**You need to know:** async Python, the OpenAI SDK, JSON Schema, token-based pricing

---

## Why a wrapper at all

Every AI feature in this app — parsing, matching, question generation, answer scoring, feedback — calls **one module**. Nothing else imports the OpenAI SDK.

That gives you one place to change models, one place that knows about cost, one place to handle malformed JSON, and one seam to mock in tests. Scatter `AsyncOpenAI()` across eight services and none of that is possible.

---

## The client

```python
_client: Optional[AsyncOpenAI] = None

def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        kwargs = {
            "api_key": settings.openai_api_key,
            "max_retries": settings.openai_max_retries,   # 3
            "timeout": settings.openai_timeout,           # 60s
        }
        if settings.openai_api_base:
            kwargs["base_url"] = settings.openai_api_base
            if "openrouter.ai" in settings.openai_api_base:
                kwargs["default_headers"] = {"HTTP-Referer": ..., "X-Title": ...}
        _client = AsyncOpenAI(**kwargs)
    return _client
```

**Retries and timeouts are delegated to the SDK**, not hand-rolled. The OpenAI SDK already does exponential backoff with jitter on 429s and 5xxs. Writing your own retry loop on top usually multiplies the delay and hides the real error.

**`base_url` gives you provider portability for free.** Point it at OpenRouter and the same code reaches Claude, Llama, or Mistral — the API surface is compatible. The conditional headers are an OpenRouter-specific nicety for their dashboard.

---

## Cost tracking

```python
class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_cents: int = 0
    model: str = ""

MODEL_COSTS_PER_MILLION = {
    "gpt-4o":      {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output":  0.60},
    ...
}

def calculate_cost(model, input_tokens, output_tokens) -> int:
    costs = MODEL_COSTS_PER_MILLION.get(model, MODEL_COSTS_PER_MILLION["gpt-4o-mini"])
    input_cost  = (input_tokens  / 1_000_000) * costs["input"]
    output_cost = (output_tokens / 1_000_000) * costs["output"]
    return max(1, round((input_cost + output_cost) * 100))
```

Three decisions worth understanding:

**Integer cents, not floats.** Money in floating point accumulates rounding error. Cents-as-int is exact, and these values get summed per session and per user.

**`max(1, ...)`** — every call costs at least one cent. It avoids a long tail of zero-cost rows that make "total spend" look free, at the price of over-reporting cheap calls.

**Unknown models fall back to gpt-4o-mini pricing.** Convenient, but it *under*-reports if you point at an expensive model not in the table. A stricter version would log a warning.

`TokenUsage` is threaded through **every** service return value — `parse_resume` returns `(ParsedResume, raw_text, TokenUsage)`, `analyze_response` returns `(ResponseAnalysis, TokenUsage)`. `interview_engine._merge_usage()` sums the 1–3 calls made per turn, and the total accumulates onto the session row. That is how per-session cost is known exactly rather than estimated.

---

## Three call modes, layered

### 1. `chat_completion` — the base

```python
async def chat_completion(messages, model=None, temperature=0.7, max_tokens=2000
                          ) -> Tuple[str, TokenUsage]:
```

Returns text plus usage. Catches `RateLimitError` and `APITimeoutError` (warn), `APIError` (error) — logs each, then **re-raises**. It never swallows an exception, so callers decide what a failure means.

### 2. `chat_completion_json` — guaranteed-ish JSON

Calls #1 with `response_format={"type": "json_object"}` and `temperature=0.3`, then parses. The interesting part is the fallback:

```python
try:
    return json.loads(content), usage
except json.JSONDecodeError:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]      # drop ```json line
        cleaned = cleaned.rsplit("```", 1)[0]    # drop closing fence
    try:
        return json.loads(cleaned), usage
    except json.JSONDecodeError:
        raise ValueError("Model returned invalid JSON")
```

Even in JSON mode, models occasionally wrap output in a markdown fence. This is defensive parsing born from production behaviour — worth copying verbatim.

### 3. `chat_completion_structured` — schema-validated objects

The most important function in the file:

```python
async def chat_completion_structured(messages, response_model: Type[BaseModel], ...):
    schema = json.dumps(response_model.model_json_schema(), indent=2)
    schema_message = {
        "role": "system",
        "content": (
            "You MUST return your response as a valid JSON object matching this exact schema:\n"
            f"{schema}\n\nDo not include any text outside the JSON object."
        ),
    }
    data, usage = await chat_completion_json([schema_message] + messages, ...)
    try:
        return response_model.model_validate(data), usage
    except ValidationError as e:
        raise ValueError(f"Model output did not match schema: {e}")
```

`model_json_schema()` converts a Pydantic model to JSON Schema, which is **prepended as a system message**. The reply is then validated back into a typed Python object. Callers get `ParsedResume`, not `dict`.

**Important:** this is **prompt-based** structured output, not OpenAI's native `response_format: {"type": "json_schema"}` / `client.beta.chat.completions.parse()`. The trade-off: this approach works with any OpenAI-compatible provider (including OpenRouter), while native structured output is stricter and guarantees conformance but is provider-specific. Given the OpenRouter support elsewhere in this file, the choice is coherent — but if you pinned to OpenAI, native structured output would be more reliable.

---

## Temperature discipline

A consistent, deliberate convention across the codebase:

| Temperature | Used for | Why |
|---|---|---|
| **0.1** | Résumé/JD extraction | Reading facts off a page — creativity is error |
| **0.2** | Résumé↔JD matching | Mostly analytical, slight judgement |
| **0.3** | Answer analysis, feedback | Consistent scoring matters more than variety |
| **0.7** | Question generation | Repetitive questions are the failure mode here |

If you take one habit from this layer, take this one: **temperature is a per-task setting, not a global default.**

---

## Model selection

`gpt-4o-mini` is the default for high-frequency calls (parsing, per-answer analysis, follow-up decisions). `gpt-4o` is reserved for end-of-session feedback, which runs once and reasons over the entire transcript.

Given mini is ~17× cheaper on input, this is most of the cost control in the product.

---

## ⚠️ Dead code

```python
async def chat_completion_stream(...) -> AsyncIterator[str]:
    async for chunk in stream:
        yield chunk.choices[0].delta.content
```

Fully implemented, **called from nowhere**. `sse-starlette` is in `requirements.txt` for the same never-built feature.

Note it would also bypass cost tracking entirely — streamed responses carry no `usage` object unless you pass `stream_options={"include_usage": True}`. If streaming is ever wired up, that has to be handled or per-session cost silently under-counts.

---

## 🧠 Check your understanding

1. Why does every AI call route through one module?
2. Why track cost in integer cents instead of floats?
3. What does `model_json_schema()` do, and how does it reach the model?
4. How does prompt-based structured output differ from OpenAI's native version, and why was it chosen here?
5. Why is the markdown-fence stripper necessary even in JSON mode?
6. Why is extraction at 0.1 but question generation at 0.7?
7. Why does `chat_completion` log errors and then re-raise rather than returning a default?

---

**Next:** [Phase 6 — Prompt engineering](PHASE_06_prompts.md)
