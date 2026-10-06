# Backend Phase 4 — Persistence and File Storage

**What this covers:** the database abstraction, how multi-tenancy is enforced, and S3 file handling.
**Files:** `backend/app/db/dynamodb.py`, `backend/app/db/storage.py`, `backend/app/routers/resume.py`
**You need to know:** NoSQL key design, boto3, object storage, presigned URLs

---

## What's stored

| Collection | Partition key | Holds |
|---|---|---|
| `resumes` | `user_id` | file metadata, raw text, parsed structure |
| `job_descriptions` | `user_id` | raw text, parsed requirements |
| `sessions` | `user_id` | config, questions, scores, difficulty, embedded feedback |
| `messages` | `session_id` | the transcript, with per-message analysis |
| `questions` | `user_id` | the user's saved practice questions |

Note `messages` partitions by **`session_id`**, not `user_id` — a transcript is always fetched for one session, so that is the natural access pattern. This is the core NoSQL discipline: **key by how you read, not by how the data relates.**

---

## The document-API abstraction

`db/dynamodb.py` exposes a document-style API rather than raw boto3 calls:

```python
def sessions_col(user_id: str) -> DynamoDBCollectionReference: ...
def messages_col(user_id: str, session_id: str) -> DynamoDBCollectionReference: ...

async def create_document(col, data, doc_id=None) -> str
async def get_document(ref) -> Optional[dict]
async def update_document(ref, data) -> None
async def list_documents(col, order_by="created_at", direction="DESCENDING", limit=50) -> List[dict]
async def delete_document(ref) -> None
```

**The value of the abstraction:** callers never touch boto3. Every persistence detail lives in one file, which is exactly why the Postgres migration is tractable — you rewrite this module's callers rather than hunting SDK calls through 8 files.

**The cost:** it hides genuinely important database differences. `list_documents` queries a whole partition and then **sorts in Python**:

```python
res = table.query(KeyConditionExpression=Key(pk_name).eq(pk_val))
items = res.get("Items", [])
if order_by:
    items.sort(key=lambda x: x.get(order_by, ""), reverse=(direction == "DESCENDING"))
return items[:limit]
```

That is fine at small scale and wrong at large scale — it fetches every row before discarding most. A real DynamoDB design would use a sort key or GSI. Recognizing this is the lesson.

---

## Multi-tenancy by construction

The single most important security property in the persistence layer:

```python
docs = await db.list_documents(db.sessions_col(user.uid), limit=limit)
```

`user.uid` is baked into the collection reference, so it becomes the **partition key** of every read and write. There is no `WHERE user_id = ?` clause anyone can forget. Requesting another user's session ID queries *your* partition, finds nothing, and returns a natural 404.

When this moves to Postgres, that guarantee **disappears** — tenant isolation becomes a predicate you must write on every query. That is the single easiest thing to get wrong in the migration, which is why the migration plan makes `user_id` a required argument on every repository function.

---

## Auto-creating tables

```python
def _ensure_table_exists(table_name, pk_name, sk_name=None):
    try:
        table.load()
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            db.create_table(..., BillingMode="PAY_PER_REQUEST")
            table.wait_until_exists()
```

Convenient in development, **risky in production**: a typo in the table prefix silently creates a new empty table instead of failing loudly, and you debug "where did my data go" instead of reading an error. Alembic migrations replace this with explicit, reviewed schema changes.

`PAY_PER_REQUEST` is the right default for unpredictable low traffic — no capacity planning, no idle cost.

---

## File storage — `db/storage.py`

S3 handles anything that isn't a record: résumé/JD uploads and temporary transcription audio.

```python
def upload_file(content: bytes, filename: str, content_type: str,
                user_id: str, subfolder: str) -> str:
    key = f"{subfolder}/{user_id}/{uuid4().hex}_{filename}"
    s3.put_object(Bucket=bucket, Key=key, Body=content, ContentType=content_type)
    return f"s3://{bucket}/{key}"
```

**The key layout `{subfolder}/{user_id}/{uuid}_{name}` does three jobs:** the `user_id` segment allows IAM policies scoped per user later; the UUID prevents collisions when two people upload `resume.pdf`; the original filename is preserved for display.

Remember S3 has no folders — that whole string is one key. The `/` characters are convention, though lifecycle rules and IAM policies can match on them as prefixes (which is exactly how `transcribe_temp/` gets auto-expired).

**Presigned URLs** let a browser fetch a private object without the bucket ever being public:

```python
def generate_signed_url(s3_uri: str, expires_in: int = 3600) -> str:
    return s3.generate_presigned_url("get_object",
        Params={"Bucket": bucket, "Key": key}, ExpiresIn=expires_in)
```

The URL embeds a signature and expiry. No credentials reach the client, and access dies on schedule.

### Credentials: none

```python
s3 = boto3.client("s3", region_name=settings.aws_region)
```

No keys passed. boto3 walks its credential chain — explicit args → env vars → `~/.aws/credentials` → **EC2 instance metadata**. On the deployed box it lands on the instance role from the deployment plan's Phase 3. Same code, different credential source, zero secrets on disk.

---

## Upload validation order

`routers/resume.py` orders its checks deliberately:

```python
if not file.filename:                                    raise HTTPException(400, ...)
if file.content_type not in ALLOWED_MIME_TYPES:          raise HTTPException(400, ...)
content = await file.read()                              # only now read the bytes
if len(content) > settings.max_resume_size_bytes:        raise HTTPException(400, ...)
```

Cheap metadata checks come first; the body is only read once the request looks plausible. The size check must come *after* the read, since `UploadFile` doesn't reliably expose length beforehand — which is why Nginx also needs `client_max_body_size` (deployment plan, Phase 8) to reject oversized bodies before they ever reach Python.

---

## ⚠️ Live bug in this layer

```python
resume_data = { "raw_file_url": ..., "parsed_data": ..., "file_name": ... }   # no created_at
resume_id = await db.create_document(db.resumes_col(user.uid), resume_data)
return ResumeUploadResponse(..., uploaded_at=resume_data["created_at"])       # KeyError
```

`create_document` does `item = dict(data)` and injects `created_at` **into its copy**. The caller's dict never receives the key, so this raises `KeyError`, which the broad `except Exception` converts into a generic 500.

**Résumé upload and JD creation currently fail on every successful request.** The fix is to return the created row's timestamp rather than reading it back out of the input dict.

This is a good illustration of a real hazard: `except Exception: raise HTTPException(500, "…")` turned a trivial `KeyError` into an opaque server error that hid the bug.

---

## 🧠 Check your understanding

1. Why is `messages` partitioned by `session_id` rather than `user_id`?
2. What exactly makes cross-tenant access impossible here, and why does that guarantee vanish under Postgres?
3. Why is `list_documents` sorting in Python a scaling problem?
4. What are the risks of auto-creating tables on first use?
5. How does a presigned URL grant access without making the bucket public?
6. Why does boto3 need no credentials on EC2 but does on your laptop?
7. Why does the size check have to come after `await file.read()`?

---

## ⚠️ Also note

Resolved 2026-08-10 — `db/firestore.py`, the `gs://` URI fallbacks, and the stale Firestore comments are all deleted. Persistence is DynamoDB-only (and moving to Postgres; see the migration plan).

---

**Next:** [Phase 5 — LLM integration](PHASE_05_llm_layer.md)
