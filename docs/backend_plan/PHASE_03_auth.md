# Backend Phase 3 — Authentication

**What this covers:** verifying AWS Cognito JWTs locally, and the dependency that makes every protected route one word long.
**Files:** `backend/app/middleware/auth.py`
**You need to know:** JWT structure, asymmetric signatures (RS256), JWKS, FastAPI dependency injection

---

## The model: the API never calls Cognito

Cognito issues tokens. The backend **verifies them offline** using Cognito's public keys. There is no per-request call to AWS.

```
Browser ──sign in──▶ Cognito ──ID token (JWT, RS256)──▶ Browser
Browser ──Authorization: Bearer <token>──▶ FastAPI
                                            │
                                            ├─ fetch JWKS once, cache 1h
                                            └─ verify signature locally  ✓
```

This is the entire payoff of asymmetric signing: Cognito holds the private key and is the only party that can *create* a valid token; the public keys are published, so **anyone** can *verify* one. Verification costs microseconds and adds zero network latency. A shared-secret (HS256) scheme would work too, but then every service holding the secret could also mint tokens.

---

## JWKS fetching and caching

```python
_jwks_cache: Optional[dict] = None
_jwks_cache_timestamp: float = 0
JWKS_CACHE_TTL = 3600      # 1 hour

async def get_jwks(user_pool_id: str, region: str) -> dict:
    global _jwks_cache, _jwks_cache_timestamp
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_timestamp) < JWKS_CACHE_TTL:
        return _jwks_cache
    url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_timestamp = now
    return _jwks_cache
```

A module-level cache is per-process, so each worker fetches once per hour — negligible.

**Why an hour?** Cognito rotates signing keys rarely and publishes the new key *before* using it. So a stale cache still verifies current tokens. The failure mode is bounded: at worst, tokens signed with a brand-new key fail for up to an hour. A production-grade version refetches once on unknown-`kid` before rejecting.

---

## The verification sequence

```python
security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthUser:
    if not credentials:
        raise HTTPException(401, "Not authenticated",
                            headers={"WWW-Authenticate": "Bearer"})
    token = credentials.credentials

    # Dev-only bypass
    if settings.environment == "development" and token == "mock-user-token":
        return AuthUser(uid="mock-user-uid", email="mock@example.com", name="Mock User")

    headers = jwt.get_unverified_header(token)          # read kid — NOT trusted yet
    kid = headers["kid"]
    jwks = await get_jwks(settings.aws_cognito_user_pool_id, settings.aws_region)
    key_data = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if key_data is None:
        raise HTTPException(401, "Invalid token")

    claims = jwt.decode(
        token, key_data, algorithms=["RS256"],
        audience=settings.aws_cognito_client_id,
        issuer=f"https://cognito-idp.{settings.aws_region}.amazonaws.com/{pool_id}",
        options={"verify_aud": bool(settings.aws_cognito_client_id)},
    )
    return AuthUser(uid=claims["sub"], email=claims.get("email"), ...)
```

Details that matter:

**`auto_error=False`.** With the default, FastAPI returns its own 403 for a missing header. Disabling it lets you return a correct **401** with a `WWW-Authenticate: Bearer` header, which is what the spec requires and what clients key off to trigger re-login.

**`get_unverified_header` is safe here** — it reads only the `kid` to select a key. The claims are never trusted until `jwt.decode` verifies the signature. Reading *claims* unverified would be the classic vulnerability.

**`algorithms=["RS256"]` is pinned.** Never derive the algorithm from the token header — that is the `alg: none` attack, where an attacker sets the algorithm to `none` and supplies no signature.

**Issuer and audience are both checked.** Signature validity alone is not enough: a token from a *different* Cognito pool could be correctly signed. The issuer check binds it to your pool, the audience check to your app client.

---

## `sub` is the identity, not email

```python
uid = claims["sub"]
```

Cognito's `sub` is an immutable UUID. Email is mutable — users change it. Every row in the database is keyed by `sub`; keying on email would orphan a user's entire history the day they update it.

---

## The `CurrentUser` dependency

The most quietly valuable line in the file:

```python
CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
```

Every protected endpoint becomes:

```python
@router.get("/sessions", response_model=list[SessionListItem])
async def list_sessions(user: CurrentUser, limit: int = 20):
    docs = await db.list_documents(db.sessions_col(user.uid), limit=limit)
```

No `= Depends(...)` at the call site, full type inference, and **auth is impossible to forget without it being visible** — an endpoint with no `user: CurrentUser` parameter is obviously public when you read it.

Because `user.uid` is then passed into every collection accessor (`db.sessions_col(user.uid)`), **multi-tenancy is enforced by construction**. There is no "and where user_id = ?" to forget; a cross-tenant ID simply returns nothing, which surfaces as a natural 404.

---

## The dev bypass

```python
if settings.environment == "development" and token == "mock-user-token":
```

This exists so you can develop and test protected routes without a Cognito pool. It is a deliberate, useful shortcut — **and it is exactly one config value away from being an authentication bypass in production.**

Two safeguards to keep in mind:
1. `ENVIRONMENT=production` must be set in deployed environments (it is, via SSM — see the deployment plan's Phase 6).
2. The check is `==`, not a substring or prefix match.

If you build something similar, prefer failing closed: default `environment` to `"production"` so a *missing* value is safe rather than permissive. This codebase defaults to `"development"`, which is convenient locally and worth being conscious of.

---

## Error handling

```python
except ExpiredSignatureError:
    raise HTTPException(401, "Token has expired")
except JWTError:
    raise HTTPException(401, "Invalid authentication credentials")
except Exception as e:
    logger.error(f"Auth error: {e}")
    raise HTTPException(500, "Authentication error")
```

Expiry is distinguished from other failures because the client's response differs: an expired token means *refresh and retry*, while an invalid one means *sign in again*. Everything else collapses to a generic 401 — telling an attacker exactly which check failed is free reconnaissance.

A missing `aws_cognito_user_pool_id` returns **500, not 401** — that is a server misconfiguration, not a client error, and the status code should say so.

---

## 🧠 Check your understanding

1. How does the API verify thousands of tokens without ever calling Cognito?
2. Why is reading the `kid` from an unverified header safe, while reading claims would not be?
3. What is the `alg: none` attack, and which line prevents it?
4. Why check issuer and audience when the signature is already valid?
5. Why key the database on `sub` instead of email?
6. What exactly makes multi-tenancy safe here, given no query says "where user_id = ..."?

---

## ⚠️ Notes

`options={"verify_aud": bool(settings.aws_cognito_client_id)}` **silently skips audience verification** when no client ID is configured. That is deliberate (it keeps local dev working), but it means a deployment missing `AWS_COGNITO_CLIENT_ID` accepts tokens issued for any app client in the pool.

There is no refresh-token handling anywhere in the backend — that lives entirely in the frontend (`src/contexts/AuthContext.tsx`), and is currently unimplemented there too.

---

**Next:** [Phase 4 — Persistence & storage](PHASE_04_persistence.md)
