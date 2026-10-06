# Frontend Phase 5 — The API Client

**What this covers:** the single typed layer between React and the FastAPI backend.
**Files:** `src/services/apiClient.ts` (352 lines)
**You need to know:** the Fetch API, TypeScript generics, `FormData`

---

## Three parts, one file

1. **~120 lines of exported interfaces** mirroring the backend's response models
2. **One generic `apiFetch<T>()`** wrapper plus an `ApiError` class
3. **Seven per-domain objects** of one-line arrow functions

No component ever calls `fetch` directly. That single rule is what makes auth, error handling, and base URLs changeable in one place.

---

## The wrapper

```ts
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();               // localStorage "amplify_id_token"
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // FormData must set its own multipart boundary
  if (options.body instanceof FormData) delete headers["Content-Type"];

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(body.detail || response.statusText, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
```

Five details that each fix a real bug:

**`delete headers["Content-Type"]` for FormData.** Multipart uploads need a boundary parameter (`multipart/form-data; boundary=----WebKitFormBoundary...`) that only the browser can generate. Setting the header manually produces a request the server cannot parse — a genuinely confusing failure.

**`.catch(() => ({ detail: "Unknown error" }))` on the error body.** A 502 from Nginx returns HTML, not JSON; without the catch, error handling throws a `SyntaxError` and the real status is lost.

**`body.detail`** matches FastAPI's error shape exactly (`HTTPException(404, "Session not found")` serializes to `{"detail": "..."}`), so backend messages surface directly in toasts.

**`status: 204` returns early.** A 204 has no body, and `response.json()` on an empty body throws. `DELETE` endpoints return 204.

**`ApiError` carries `status`**, so callers can branch on 404 vs 500 rather than string-matching messages.

**`fetch` only rejects on network failure** — a 500 is a resolved promise with `ok: false`. Forgetting the `!response.ok` check is the most common Fetch mistake.

---

## Per-domain objects

```ts
export const interviewApi = {
  createSession: (config: SessionConfig) =>
    apiFetch<StartSessionResponse>("/api/interview/session", {
      method: "POST", body: JSON.stringify(config),
    }),

  sendMessage: (sessionId: string, content: string, durationSeconds?: number) =>
    apiFetch<SendMessageResponse>(`/api/interview/session/${sessionId}/message`, {
      method: "POST", body: JSON.stringify({ content, duration_seconds: durationSeconds }),
    }),

  listSessions: (limit = 20) =>
    apiFetch<SessionListItem[]>(`/api/interview/sessions?limit=${limit}`),

  deleteSession: (sessionId: string) =>
    apiFetch<void>(`/api/interview/session/${sessionId}`, { method: "DELETE" }),
};
```

Plain objects of arrow functions — no classes, no instantiation. Seven of them: `interviewApi`, `resumeApi`, `feedbackApi`, `analyticsApi`, `questionsApi`, `userApi`, `emailApi`. The generic parameter on `apiFetch<T>` is what carries types to the call site, so `await interviewApi.listSessions()` is fully typed with no annotation.

**File upload:**
```ts
upload: (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ResumeUploadResponse>("/api/resume/upload", {
    method: "POST", body: formData,
  });
},
```

**Query strings** are built with `URLSearchParams` rather than concatenation, so values are encoded correctly:
```ts
list: (category?: string, q?: string) => {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (q) params.append("q", q);
  return apiFetch<UserQuestion[]>(`/api/questions?${params}`);
},
```

---

## snake_case all the way through

The types mirror the backend exactly:

```ts
export interface SessionProgress {
  questions_asked: number;
  questions_total: number;
  current_difficulty: "easy" | "medium" | "hard";
  topics_covered: string[];
  average_score: number;
  is_complete: boolean;
}
```

Components consume snake_case directly — `res.session_progress.is_complete`. There is **no camelCase mapping layer**.

This is a deliberate trade. A mapping layer would feel more idiomatic in JS, but it means every field is written three times (backend model, wire type, frontend type) and every rename touches a translation function. Matching the wire format exactly means the types *are* the contract, and a backend field rename produces an immediate TypeScript error rather than a silently-undefined value.

Note the union types (`"easy" | "medium" | "hard"`) mirroring the backend's `str, Enum` classes — that is what keeps the two ends aligned at compile time.

---

## Error handling at the call site

```tsx
try {
  const data = await interviewApi.listSessions();
  setSessions(data);
} catch (err) {
  toast({
    title: "Failed to load sessions",
    description: err instanceof ApiError ? err.message : "Something went wrong",
    variant: "destructive",
  });
} finally {
  setLoading(false);
}
```

Consistent across pages. Because `body.detail` flows through, the backend's own message is what the user sees.

---

## ⚠️ What's missing

| Gap | Consequence |
|---|---|
| **No 401 refresh interceptor** | Sessions die after 1 hour (Phase 4) |
| **No retry** | A single transient network blip fails the request |
| **No `AbortSignal`** | Unmounting mid-request still calls `setState` → React warning, potential leak |
| **No request deduplication** | Concurrent identical requests all go out |
| **`analyticsApi` is untyped** | Returns `Promise<any>`; callers cast |

The abort gap is worth fixing first — it is a real bug that produces console warnings today:

```ts
useEffect(() => {
  const controller = new AbortController();
  loadData(controller.signal);
  return () => controller.abort();
}, []);
```

Adopting TanStack Query (already installed, Phase 3) would resolve retry, dedup, caching, and abort in one move.

---

## ⚠️ The one service that bypasses all of this

`src/services/deepgramTranscriptionService.ts` does **not** use `apiFetch`. It:

- declares its own `API_BASE_URL` defaulting to **port 8080** while `apiClient` defaults to **4000** — so it points at the wrong server in local development
- sends **no `Authorization` header** (which happens to work only because `/api/speech/transcribe` is unauthenticated — backend Phase 9)
- uses a raw `fetch` with an `AbortController` 120s timeout

It is also **misnamed twice over**: there is no Deepgram involved (the backend uses AWS Transcribe), and `createStreamingSession()` does not stream — `pushChunk` buffers blobs into an array and `finalize()` concatenates them into one blob and POSTs it.

Folding it into `apiClient` would fix the port mismatch and the missing auth header in one edit.

---

## 🧠 Check your understanding

1. Why must `Content-Type` be deleted for `FormData`?
2. Why `.catch()` around parsing the error body?
3. Why does `fetch` not throw on a 500, and what is the consequence of forgetting `!response.ok`?
4. Why return early on 204?
5. What does using snake_case throughout buy you, and what does it cost?
6. What real bug does the absence of `AbortSignal` cause?
7. Name three problems `deepgramTranscriptionService` has from not using `apiFetch`.

---

**Next:** [Phase 6 — The interview chat](PHASE_06_chat_ui.md)
