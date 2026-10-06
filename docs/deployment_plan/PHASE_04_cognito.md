# Phase 4 — Cognito User Pool

**Goal:** real user sign-up, sign-in, and JWTs — replacing the mock auth the app currently falls back to.
**Time:** ~1 hour
**Prerequisites:** Phase 1
**Cost impact:** $0 (free below 50k monthly active users)
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §7 (Cognito)

---

## Why this phase exists

The code for this is already written on both sides — `src/contexts/AuthContext.tsx` calls the Cognito IDP API directly, and `backend/app/middleware/auth.py` verifies the resulting JWTs against Cognito's public keys. What's missing is the pool itself.

Right now, with no `VITE_AWS_COGNITO_CLIENT_ID` set, the frontend runs in **mock mode**: any login succeeds and stores the literal token `mock-user-token`, which the backend accepts only when `ENVIRONMENT=development`. This phase turns that off and makes auth real.

It is deliberately placed before the code migration so you can test authenticated endpoints properly in Phase 5.

---

## Concepts you need

**User pool** — a managed user directory. It stores users, handles email verification and password resets, and issues tokens. (Distinct from an *identity pool*, which vends temporary AWS credentials — this project does not use one.)

**The three tokens.** On successful sign-in Cognito returns:
- **ID token** — who the user is (claims: `sub`, `email`, `name`). This is what the app sends to the backend.
- **Access token** — what the user may do, for Cognito's own APIs.
- **Refresh token** — used to get new tokens without re-entering a password.

This app stores all three in `localStorage` and sends the **ID token** as `Authorization: Bearer <token>`.

**JWT structure** — three base64 segments: header, payload, signature. The payload is **not encrypted**, only encoded. Anyone can read it; the signature is what makes it trustworthy.

**JWKS** — Cognito publishes its public keys at
`https://cognito-idp.<region>.amazonaws.com/<pool-id>/.well-known/jwks.json`.
The backend fetches these once, caches them for an hour, and verifies each token's RS256 signature locally. **The backend never calls Cognito per request** — that is the whole point of asymmetric JWT verification, and it is why auth adds ~0ms instead of a network round trip.

**Public client, no secret** — because the frontend is browser JavaScript, it cannot hold a secret. So the app client is created with `--no-generate-secret` and uses `ALLOW_USER_PASSWORD_AUTH`.

---

## Steps

```bash
source ~/amplify-env.sh
```

### 4.1 — Create the user pool

**UI:** Cognito → *Create user pool*
- Sign-in options: **Email**
- MFA: **No MFA** (keep it simple; revisit later)
- Account recovery: **Email only**
- Self-registration: **enabled**
- Required attributes: **`email`** and **`name`** (the app collects a name at sign-up)
- Email: **Send email with Cognito** (50/day — fine for learning; SES is the Stage 2 upgrade)
- Pool name: `amplify-interview-user-pool`

**CLI:**
```bash
export POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name amplify-interview-user-pool \
  --auto-verified-attributes email \
  --username-attributes email \
  --schema Name=name,Required=true \
  --query "UserPool.Id" --output text)
echo "POOL_ID=$POOL_ID"
```

### 4.2 — Create the app client

```bash
export CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id $POOL_ID --client-name amplify-interview-client \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query "UserPoolClient.ClientId" --output text)
echo "CLIENT_ID=$CLIENT_ID"
```

Both flags matter. `--no-generate-secret` is **required** for browser-based auth — a secret in frontend JS is not a secret. `ALLOW_USER_PASSWORD_AUTH` enables the `InitiateAuth` flow that `AuthContext.tsx` uses; without it every sign-in returns `InvalidParameterException`.

### 4.3 — Look at the JWKS endpoint

```bash
curl -s https://cognito-idp.$AWS_REGION.amazonaws.com/$POOL_ID/.well-known/jwks.json | head -30
```

These are the public keys `backend/app/middleware/auth.py` caches for an hour. Note there is no secret here — that's the asymmetric-crypto point: anyone can *verify* a token, only Cognito can *sign* one.

### 4.4 — Create a test user and get a real token

```bash
aws cognito-idp sign-up --client-id $CLIENT_ID \
  --username you@example.com --password 'TestPass123!' \
  --user-attributes Name=name,Value="Test User"

# Skip the emailed code and confirm directly (admin action)
aws cognito-idp admin-confirm-sign-up --user-pool-id $POOL_ID --username you@example.com

# Sign in and capture the ID token
aws cognito-idp initiate-auth --client-id $CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=you@example.com,PASSWORD='TestPass123!' \
  --query "AuthenticationResult.IdToken" --output text
```

Paste that token into [jwt.io](https://jwt.io) and read the payload. Find `sub` (the stable user ID this app uses as `user_id` on every row), `email`, `token_use: "id"`, `iss`, and `exp`. Confirm for yourself that the payload was readable without any key at all.

### 4.5 — Wire it into the app config

Root `.env` (frontend, build-time):
```bash
VITE_AWS_REGION=us-east-1
VITE_AWS_COGNITO_CLIENT_ID=<CLIENT_ID>
```

`backend/.env` (local dev):
```bash
AWS_COGNITO_USER_POOL_ID=<POOL_ID>
AWS_COGNITO_CLIENT_ID=<CLIENT_ID>
```

You will push these to SSM Parameter Store in Phase 6, once the store exists.

> ⚠️ Setting `VITE_AWS_COGNITO_CLIENT_ID` **turns mock auth off**. From here on, local sign-in requires a real Cognito user. That is intended — but it means `mock-user-token` no longer works in the browser. The backend still honours it for automated tests while `ENVIRONMENT=development`.

### 4.6 — Verify end to end

```bash
cd backend && ./venv/bin/python -m uvicorn app.main:app --port 4000
```
```bash
TOKEN=<the ID token from 4.4>
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/user/profile
```

You should get your profile back, built from the JWT claims. Then corrupt one character in the middle of the token and retry — you should get a 401. That's the signature check doing its job.

---

## ✅ Checkpoints

- [ ] `aws cognito-idp describe-user-pool --user-pool-id $POOL_ID` returns the pool.
- [ ] The app client has **no** client secret and lists `ALLOW_USER_PASSWORD_AUTH`.
- [ ] The JWKS URL returns a JSON key set.
- [ ] `initiate-auth` returns an ID token, and jwt.io shows your `sub` and `email`.
- [ ] `/api/user/profile` returns 200 with a valid token and **401 with a tampered one**.
- [ ] `npm run dev` → sign up through the real UI → the user appears under Cognito → *Users*.

---

## 🧠 You understand this when you can answer, without notes

1. The backend verifies thousands of tokens without ever calling Cognito. How?
2. Why is a JWT payload safe to read but still trustworthy?
3. Why must this app client have no client secret?
4. `auth.py` caches JWKS for one hour. What breaks if Cognito rotates keys inside that window, and why is that acceptable?
5. Which of the three tokens does this app send to the backend, and why that one?

---

## 🔧 Troubleshooting

**`InvalidParameterException: USER_PASSWORD_AUTH flow not enabled`** — the app client is missing `ALLOW_USER_PASSWORD_AUTH`. Update it with `update-user-pool-client` (note: that API replaces the full config, so re-pass your other settings).

**`NotAuthorizedException` on a fresh user** — the account is unconfirmed. Run `admin-confirm-sign-up`, or use the emailed code.

**Backend returns 401 with a token you believe is valid** — check three things in order: `AWS_COGNITO_USER_POOL_ID` matches the pool that issued it; you sent the **ID** token, not the access token; the token hasn't expired (1h default).

**Sign-up email never arrives** — Cognito's built-in sender caps at 50/day and often lands in spam. Use `admin-confirm-sign-up` while developing.

**Frontend still logs in with any password** — `VITE_AWS_COGNITO_CLIENT_ID` isn't reaching the build. Vite only exposes `VITE_`-prefixed vars, and **only reads them at build/dev-server start** — restart `npm run dev`.

---

## 📝 Record in `aws-ids.txt`

```
POOL_ID=
CLIENT_ID=
```

---

**Next:** [Phase 5 — DynamoDB → Postgres code migration](PHASE_05_code_migration.md)
