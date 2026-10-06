# AWS Deployment Plan: Amplify Interview

A **two-stage** AWS plan optimized for *learning backend development and cloud infrastructure*.

- **Stage 1 — Learning Infrastructure:** provision and wire everything by hand.
  `EC2 + Docker + Nginx + RDS (PostgreSQL) + S3 + Cognito + GitHub Actions + CloudWatch`
- **Stage 2 — Modern Managed AWS:** migrate the hand-rolled pieces to managed services.
  `App Runner / ECS Fargate + Redis (ElastiCache) + SQS + Secrets Manager + Terraform`

> **Why this order?** Stage 1 forces you to touch the underlying primitives — VPC networking,
> security groups, the Docker daemon, a reverse proxy, TLS, OS patching, connection pooling.
> Stage 2 then replaces that undifferentiated heavy lifting with managed services, and you'll
> understand *exactly* what each one is doing for you because you did it manually first.

---

## 📌 Key decisions vs. the original plan

| Concern | Original (Option A) | This plan | Rationale |
|---|---|---|---|
| Database | DynamoDB (auto-created) | **RDS PostgreSQL** | Relational modeling, SQL, migrations, joins — higher-value fundamentals. |
| Backend compute | App Runner (managed) | **EC2 + Docker + Nginx** (Stage 1) → App Runner/ECS (Stage 2) | Learn the infra before abstracting it. |
| Frontend hosting | Amplify Hosting | **S3 + CloudFront** | Teaches static hosting, CDN, cache invalidation, OAC. |
| Secrets | Plain env vars | **SSM Parameter Store** (Stage 1) → **Secrets Manager** (Stage 2) | Progressive: no plaintext DB password on the box. |
| Auth / Storage / STT | Cognito / S3 / Transcribe | **Unchanged** | Already a good fit; no reason to change. |

> ⚠️ **This requires a backend code migration.** The current backend is built on `app/db/dynamodb.py`
> (a document-style adapter). Moving to RDS introduces **SQLAlchemy 2.0 (async) + asyncpg + Alembic**
> and rewrites all persistence. See [Appendix A](#appendix-a-dynamodb--rds-code-migration).

---

# STAGE 1 — Learning Infrastructure

## 🏗️ Stage 1 Architecture

```
                    ┌─────────────────────────────────────────────┐
   Browser ───────▶ │  CloudFront (CDN)  ──▶  S3 (static React)    │
                    └─────────────────────────────────────────────┘
        │ Cognito JWT (client-side auth via Cognito IDP API)
        │ API calls to https://api.<domain>
        ▼
   ┌───────────────────────── VPC ─────────────────────────────────┐
   │  Public subnet                     Private subnet              │
   │  ┌──────────────────────────┐      ┌────────────────────────┐ │
   │  │ EC2 (Amazon Linux 2023)  │      │ RDS PostgreSQL         │ │
   │  │  ┌────────────────────┐  │      │ (db.t4g.micro)         │ │
   │  │  │ Nginx (443/80)     │  │ SG   │  amplify_interview DB  │ │
   │  │  │  └─▶ FastAPI :8080 │──┼─────▶│  (5432, private only)  │ │
   │  │  │     (Docker)       │  │ chain└────────────────────────┘ │
   │  │  └────────────────────┘  │                                 │
   │  │  IAM instance profile ───┼──▶ S3 · Transcribe · SSM        │
   │  └──────────────────────────┘                                 │
   └────────────────────────────────────────────────────────────────┘

   CI/CD:  GitHub Actions ─▶ run tests ─▶ build image ─▶ push to ECR ─▶ run migration ─▶ deploy ─▶ health check
   Obs:    CloudWatch Agent on EC2 (logs + metrics),  RDS metrics
```

---

## Step 1 — Networking (VPC)

Learn the network topology first; everything else lives inside it.

1. Use the **default VPC** to start, or create one with the VPC wizard (2 public + 2 private subnets across 2 AZs).
2. Note the **subnet IDs**: one public (for EC2), the private ones (for RDS — RDS requires a subnet group spanning ≥2 AZs).
3. **Security groups** (create two, chained — this is the important lesson):
   - `sg-ec2-web`: inbound `80` and `443` from `0.0.0.0/0`; inbound `22` from **your IP only**.
   - `sg-rds-db`: inbound `5432` **from `sg-ec2-web` only** (source = the security group, not a CIDR). RDS is never exposed to the internet.

---

## Step 2 — Amazon Cognito (unchanged)

Cognito handles registration, email verification, and JWT issuance. The frontend calls the
Cognito IDP API directly (see `src/contexts/AuthContext.tsx`); the backend verifies JWTs against
the Cognito JWKS (see `app/middleware/auth.py`).

1. **Cognito → Create user pool.**
2. Sign-in option: **Email**.
3. MFA: **No MFA** (simplicity) or Optional. Account recovery: **Email only**.
4. Sign-up: self-registration enabled; required attributes **`email`** and **`name`**.
5. Message delivery: **Send email with Cognito** (50/day; wire up SES later for production).
6. App client:
   - Type: **Public client**, name `amplify-interview-client`.
   - **Do not** generate a client secret (required for client-side auth).
   - Advanced → enable **ALLOW_USER_PASSWORD_AUTH**.
7. Record **`UserPoolId`** (`us-east-1_xxxx`) and **`ClientId`**.

---

## Step 3 — Amazon S3 (uploads bucket, unchanged)

Stores raw resume uploads and temporary transcription audio.

1. **S3 → Create bucket**, e.g. `amplify-interview-uploads` (globally unique).
2. ACLs disabled; **Block all public access ON** (objects reached via presigned URLs).
3. Create the bucket in the **same region** as everything else.

---

## Step 4 — Amazon RDS PostgreSQL

This replaces DynamoDB.

1. **RDS → Create database → Standard create → PostgreSQL** (v16.x).
2. Template: **Free tier** (or Dev/Test). Instance: **db.t4g.micro**, 20 GB gp3.
3. Credentials: master user `amplify_admin`; **let RDS manage the password in Secrets Manager**, or set one and store it in SSM (Step 7). Do not commit it.
4. Connectivity:
   - VPC: the one from Step 1. **Public access: No.**
   - VPC security group: **`sg-rds-db`** (from Step 1).
   - Subnet group: the **private** subnets.
5. Additional config: **Initial database name `amplify_interview`**. Enable automated backups (7 days).
6. Create. Record the **endpoint** (`amplify-interview-db.xxxx.us-east-1.rds.amazonaws.com`) and port `5432`.

> The backend connects with `DATABASE_URL=postgresql+asyncpg://amplify_admin:<pw>@<endpoint>:5432/amplify_interview`.
> Schema is created/evolved with **Alembic migrations** (`alembic upgrade head`), not auto-created at runtime.
> See [Appendix A](#appendix-a-dynamodb--rds-code-migration) and [Appendix B](#appendix-b-proposed-postgresql-schema).

---

## Step 5 — IAM instance profile for EC2

The EC2 box assumes a role instead of holding long-lived keys.

1. **IAM → Roles → Create role → AWS service → EC2.**
2. Attach (scope down in production):
   - S3 access limited to `arn:aws:s3:::amplify-interview-uploads/*`
   - `AmazonTranscribeFullAccess` (or scoped)
   - `AmazonSSMReadOnlyAccess` (to read config/secrets from Parameter Store) + `AmazonSSMManagedInstanceCore` (for SSM-based deploys / Session Manager)
3. Name it `amplify-interview-ec2-role`. You'll attach it to the instance in Step 6.

> Note: DB credentials do **not** come from IAM here — they come from SSM Parameter Store (Step 7).
> (IAM database authentication to RDS is a great Stage 2 enhancement.)

---

## Step 6 — Launch EC2 + install Docker & Nginx

1. **EC2 → Launch instance.**
   - AMI: **Amazon Linux 2023**. Type: **t3.micro** (free tier) or t3.small.
   - Subnet: **public**; **Auto-assign public IP: Enable**. Attach an **Elastic IP** afterward (stable address for DNS).
   - Security group: **`sg-ec2-web`**. IAM instance profile: **`amplify-interview-ec2-role`**.
   - Key pair: create/download for SSH.
2. SSH in and install Docker + Nginx + Certbot:
   ```bash
   sudo dnf update -y
   sudo dnf install -y docker nginx
   sudo systemctl enable --now docker
   sudo usermod -aG docker ec2-user     # re-login to take effect
   # Certbot via pip or dnf (for Let's Encrypt TLS)
   sudo dnf install -y certbot python3-certbot-nginx
   ```
3. **DNS:** point `api.<yourdomain>` (an A record) at the Elastic IP.
4. **Nginx reverse proxy** — `/etc/nginx/conf.d/amplify.conf`:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass         http://127.0.0.1:8080;
           proxy_set_header   Host $host;
           proxy_set_header   X-Real-IP $remote_addr;
           proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header   X-Forwarded-Proto $scheme;
       }
   }
   ```
   ```bash
   sudo nginx -t && sudo systemctl enable --now nginx
   sudo certbot --nginx -d api.yourdomain.com   # provisions + auto-renews TLS
   ```

---

## Step 7 — Configuration via SSM Parameter Store

Instead of a plaintext `.env` with secrets on the box, store config in SSM (free) and load it at container start.

1. **Systems Manager → Parameter Store → Create parameter** for each value; use **SecureString** for secrets:
   - `/amplify/prod/DATABASE_URL` (SecureString)
   - `/amplify/prod/OPENAI_API_KEY` (SecureString)
   - `/amplify/prod/RESEND_API_KEY` (SecureString)
   - `/amplify/prod/AWS_COGNITO_USER_POOL_ID`, `/amplify/prod/AWS_COGNITO_CLIENT_ID`
   - `/amplify/prod/AWS_S3_BUCKET`, `/amplify/prod/ALLOWED_ORIGINS`
2. At deploy time, fetch them into an env file the container reads:
   ```bash
   aws ssm get-parameters-by-path --path /amplify/prod --with-decryption \
     --query "Parameters[*].[Name,Value]" --output text \
     | sed 's#/amplify/prod/##' | awk '{print $1"="$2}' > /home/ec2-user/amplify.env
   ```

---

## Step 8 — Run the backend container (Docker)

1. **ECR:** create a private repo `amplify-interview-backend`.
2. **Run migrations once** against RDS before first boot (from the box or CI):
   ```bash
   docker run --rm --env-file /home/ec2-user/amplify.env \
     <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/amplify-interview-backend:latest \
     alembic upgrade head
   ```
3. **Run the API** (bind to localhost so only Nginx reaches it):
   ```bash
   docker run -d --name amplify-api --restart unless-stopped \
     -p 127.0.0.1:8080:8080 \
     --env-file /home/ec2-user/amplify.env \
     <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/amplify-interview-backend:latest
   ```
   > A small `docker-compose.yml` (api + optional local nginx) is a clean way to manage this.
   > Confirm the `backend/Dockerfile` exposes/serves on **8080** (`uvicorn app.main:app --host 0.0.0.0 --port 8080`).

---

## Step 9 — CI/CD with GitHub Actions

Pipeline flow:
Push ─▶ Run tests ─▶ Build Docker image ─▶ Push to ECR ─▶ Run migration ─▶ Deploy ─▶ Health check

> ⚠️ **Safety Rule:** Never deploy if tests fail.

`.github/workflows/deploy-backend.yml` (sketch):
```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ["backend/**", ".github/workflows/deploy-backend.yml"]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r backend/requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }   # OIDC → AWS, no static keys
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<ACCOUNT>:role/amplify-github-actions
          aws-region: us-east-1
      - name: Log in to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2
        id: ecr
      - name: Build Docker image
        run: |
          IMAGE=${{ steps.ecr.outputs.registry }}/amplify-interview-backend:${{ github.sha }}
          docker build -t $IMAGE ./backend
      - name: Push to ECR
        run: |
          IMAGE=${{ steps.ecr.outputs.registry }}/amplify-interview-backend:${{ github.sha }}
          docker push $IMAGE
      - name: Deploy and Run Migration on EC2 via SSM
        run: |
          IMAGE=${{ steps.ecr.outputs.registry }}/amplify-interview-backend:${{ github.sha }}
          aws ssm send-command \
            --document-name AWS-RunShellScript \
            --targets "Key=tag:Name,Values=amplify-api" \
            --parameters "commands=[
              \"aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${{ steps.ecr.outputs.registry }}\",
              \"docker pull $IMAGE\",
              \"docker run --rm --env-file /home/ec2-user/amplify.env $IMAGE alembic upgrade head\",
              \"docker rm -f amplify-api || true\",
              \"docker run -d --name amplify-api --restart unless-stopped -p 127.0.0.1:8080:8080 --env-file /home/ec2-user/amplify.env $IMAGE\"
            ]"
      - name: Health check
        run: |
          echo "Waiting for API to be healthy..."
          for i in {1..10}; do
            if curl -s -f https://api.yourdomain.com/health; then
              echo "API is healthy!"
              exit 0
            fi
            echo "Retrying in 5 seconds..."
            sleep 5
          done
          echo "Health check failed!"
          exit 1
```
> Set up **GitHub OIDC → IAM role** (`amplify-github-actions`) so CI assumes a role instead of storing AWS keys.
> A second workflow builds the frontend and syncs it to S3 + invalidates CloudFront (Step 11).

---

## Step 10 — Observability (CloudWatch)

1. Install the **CloudWatch agent** on EC2 (`amazon-cloudwatch-agent`); ship Docker container logs and host metrics (CPU, mem, disk).
2. Alternatively run the container with the `awslogs` Docker log driver → CloudWatch Logs group `/amplify/api`.
3. Watch **RDS metrics** (CPU, connections, free storage) in the RDS console; add a CloudWatch alarm on `FreeStorageSpace` and `DatabaseConnections`.
4. Add a CloudWatch alarm on EC2 `StatusCheckFailed` → SNS email.

---

## Step 11 — Frontend on S3 + CloudFront

1. **S3 bucket** `amplify-interview-web` (Block Public Access **ON** — served only through CloudFront).
2. **CloudFront distribution**, origin = the S3 bucket via **Origin Access Control (OAC)**.
   - Default root object `index.html`; SPA routing → custom error response `403/404 → /index.html (200)`.
   - Attach ACM cert for `app.<yourdomain>`.
3. Build & deploy (locally or via a GitHub Actions job):
   ```bash
   npm run build
   aws s3 sync dist/ s3://amplify-interview-web --delete
   aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
   ```
4. Frontend build-time env vars:
   - `VITE_API_URL=https://api.yourdomain.com`
   - `VITE_AWS_REGION=us-east-1`
   - `VITE_AWS_COGNITO_CLIENT_ID=<ClientId>`

---

## ✅ Stage 1 done when

- `https://app.<domain>` serves the React app via CloudFront.
- `https://api.<domain>/health` returns healthy through Nginx → Docker → FastAPI.
- Sign-up/sign-in works via Cognito; a full interview persists to **RDS** and reloads.
- Pushing to `main` runs tests, auto-builds, runs migrations, redeploys, and verifies health.
- Logs and metrics are visible in CloudWatch.

---

# STAGE 2 — Modern Managed AWS

Once Stage 1 is solid, replace the manual pieces. Do these incrementally.

| # | Change | Replaces | What you learn |
|---|---|---|---|
| 1 | **Terraform / IaC** for the whole stack | Console click-ops | Reproducible infra, state, modules, plan/apply |
| 2 | **App Runner** (or **ECS Fargate**) for the API | EC2 + Nginx + Docker-by-hand | Managed containers, autoscaling, health checks, TLS |
| 3 | **Secrets Manager** (with rotation) | SSM Parameter Store SecureStrings | Automatic credential rotation, RDS integration |
| 4 | **ElastiCache (Redis)** | (new) | Cache LLM/analysis results, session state, rate-limit counters |
| 5 | **SQS** for async work | Synchronous request handling | Decouple slow work: feedback generation, `POST /api/speech/transcribe` polling → worker + queue |
| 6 | **RDS Proxy** | Direct DB connections | Connection pooling for serverless/containers |
| 7 | **SES** for email + **WAF** on CloudFront | Cognito default email; no WAF | Deliverability, edge security |

**Notable refactors Stage 2 enables:**
- Move the **synchronous Transcribe polling** (`app/routers/speech.py` blocks up to 60s) to an SQS + worker pattern.
- Cache repeated OpenAI calls (question generation, analysis) in Redis to cut cost/latency.
- When moving to App Runner/ECS, swap the EC2 instance profile for a **task role** and read secrets from Secrets Manager; RDS stays put (add **RDS Proxy** in front).

---

## Appendix A — DynamoDB → RDS code migration

This is backend work required before Stage 1 can use RDS. High level:

1. **Dependencies:** add `sqlalchemy[asyncio]>=2.0`, `asyncpg`, `alembic`; drop the DynamoDB path (keep `boto3` for S3/Transcribe).
2. **New module `app/db/database.py`:** async engine + `async_sessionmaker` from `DATABASE_URL`; a FastAPI dependency yielding an `AsyncSession`.
3. **ORM models `app/db/models.py`:** SQLAlchemy models mirroring [Appendix B](#appendix-b-proposed-postgresql-schema), using `JSONB` for nested blobs and `ARRAY`/`JSONB` for lists.
4. **Rewrite `app/db/dynamodb.py` callers:** the helpers (`create_document`, `get_document`, `list_documents`, `update_document`, `delete_document`, `*_col`) are used by `services/interview_engine.py` and every router. Replace with repository functions (e.g. `create_session`, `get_session`, `list_sessions`) backed by SQLAlchemy. `db.utc_now()` → DB `server_default=now()` / timezone-aware timestamps.
5. **Alembic:** `alembic init`, autogenerate the initial migration, `alembic upgrade head`.
6. **Config:** add `database_url` to `app/config.py`; remove dead GCP/Firestore fields; delete `app/db/firestore.py`.
7. **Update `backend/.env.example`** and `DEPLOYMENT_AWS.md` env references (this file) to use `DATABASE_URL` instead of `AWS_DYNAMODB_TABLE_PREFIX`.

## Appendix B — Proposed PostgreSQL schema

Hybrid relational + `JSONB`: columns for what you filter/sort/join on, `JSONB` for nested documents.

```sql
-- Cognito `sub` is the user identity; no passwords stored here.
CREATE TABLE resumes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,                    -- Cognito sub
    file_name   TEXT NOT NULL,
    s3_uri      TEXT NOT NULL,
    parsed_data JSONB NOT NULL,                    -- ParsedResume (work_experience[], education[], ...)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resumes_user ON resumes(user_id, created_at DESC);

CREATE TABLE job_descriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,
    company     TEXT,
    role_title  TEXT,
    raw_text    TEXT NOT NULL,
    parsed_data JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jds_user ON job_descriptions(user_id, created_at DESC);

CREATE TABLE sessions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                TEXT NOT NULL,
    mode                   TEXT NOT NULL,          -- behavioral | technical | mixed
    status                 TEXT NOT NULL,          -- in_progress | completed
    config                 JSONB NOT NULL,         -- SessionConfig
    resume_id              UUID REFERENCES resumes(id) ON DELETE SET NULL,
    jd_id                  UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
    match_analysis         JSONB,
    questions_generated    JSONB NOT NULL DEFAULT '[]',
    current_question_index INT  NOT NULL DEFAULT 0,
    current_difficulty     TEXT NOT NULL DEFAULT 'medium',
    scores                 JSONB NOT NULL DEFAULT '[]',
    topics_covered         TEXT[] NOT NULL DEFAULT '{}',
    total_tokens           INT NOT NULL DEFAULT 0,
    total_cost_cents       INT NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at           TIMESTAMPTZ
);
CREATE INDEX idx_sessions_user ON sessions(user_id, created_at DESC);

CREATE TABLE messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role              TEXT NOT NULL,               -- interviewer | candidate | system
    content           TEXT NOT NULL,
    question_metadata JSONB,
    analysis          JSONB,
    duration_seconds  INT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_session ON messages(session_id, created_at);

CREATE TABLE feedback (
    session_id  UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL,
    payload     JSONB NOT NULL,                    -- full SessionFeedback
    overall_score  INT,
    readiness_level TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT NOT NULL,
    question_text TEXT NOT NULL,
    category      TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ
);
CREATE INDEX idx_user_questions_user ON user_questions(user_id, created_at DESC);
```

---

## Local development (Stage 1)

Run Postgres locally in Docker instead of hitting RDS:
```bash
docker run -d --name amplify-pg -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=amplify_interview -p 5432:5432 postgres:16
```
`backend/.env`:
```bash
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:dev@localhost:5432/amplify_interview
AWS_REGION=us-east-1
AWS_S3_BUCKET=amplify-interview-uploads
AWS_COGNITO_USER_POOL_ID=<user-pool-id>     # omit to use mock auth (token: mock-user-token)
AWS_COGNITO_CLIENT_ID=<client-id>
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
ALLOWED_ORIGINS=http://localhost:3000
```
```bash
cd backend && alembic upgrade head && uvicorn app.main:app --reload --port 4000
npm run dev   # frontend on :3000
```
Frontend `.env`:
```bash
VITE_API_URL=http://localhost:4000
VITE_AWS_REGION=us-east-1
VITE_AWS_COGNITO_CLIENT_ID=<client-id>
```
