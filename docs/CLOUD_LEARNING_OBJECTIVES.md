# Cloud & Backend Learning Objectives — Amplify Interview

This is the **learning companion** to `DEPLOYMENT_AWS.md`. The deployment guide tells you *what buttons to press*; this document tells you *why*, so you come out fundamentally strong rather than just having a running server.

Each objective follows the same shape:

- **Mental model** — the one idea to hold in your head.
- **Fundamentals** — the concepts, from the ground up.
- **In this project** — exactly where it shows up in Amplify Interview (files, services).
- **Hands-on** — a checklist you can actually do.
- **Pitfalls** — the mistakes everyone makes once.
- **You understand this when…** — self-check questions. If you can answer them without notes, move on.

> **How to use this:** follow the order below. Each objective builds on the previous one.
> Don't deploy the app on day one — build the mental model first, then provision, then automate.

**Suggested order:** IAM → VPC → S3 → RDS → Docker → Nginx → Cognito → GitHub Actions → CloudWatch.
(You provision identity and network *before* the things that live inside them, and you automate/monitor *last*.)

---

## The big picture: one request, end to end

Before the details, trace a single "submit interview answer" request through the Stage 1 architecture. If you can narrate this, the individual services will make sense.

```
Browser (React app on CloudFront/S3)
  │  1. User is logged in → holds a Cognito JWT in localStorage (amplify_id_token)
  │  2. fetch("https://api.<domain>/api/interview/session/{id}/message", Authorization: Bearer <JWT>)
  ▼
DNS → Elastic IP → EC2 (public subnet)
  │  3. Nginx (:443) terminates TLS, reverse-proxies to 127.0.0.1:8080
  ▼
FastAPI container (Docker, :8080)
  │  4. middleware/auth.py verifies the JWT against Cognito's public keys (JWKS)
  │  5. interview_engine.py runs the logic, calls OpenAI
  │  6. reads/writes rows in RDS (private subnet) over the SG-to-SG rule
  │  7. reads/writes resume files in S3 using the EC2 instance role (no keys)
  ▼
Response flows back up: FastAPI → Nginx → browser
        (CloudWatch is collecting logs/metrics the whole time)
```

Every objective below is one box or arrow in that diagram.

---

## 0. Prerequisites & ground rules

- **AWS account** with MFA on the root user. Create an **IAM admin user** for daily use — never use root.
- **AWS CLI v2** installed and configured (`aws configure`) — this is how you'll learn faster than the console.
- **One region for everything** (this project assumes `us-east-1`). Mixing regions is a classic time-sink.
- **Cost awareness:** stay in the **12-month Free Tier** (t3.micro EC2, db.t4g.micro RDS, 5 GB S3). Set a **Billing alarm** at $5 *before* you provision anything (see CloudWatch section). Stop/delete resources when you're done for the day.
- **Least privilege from day one** — it's harder to retrofit than to start with.

---

## 1. Understand IAM (Identity & Access Management)

> **Mental model:** IAM answers one question for every AWS API call — *"Is this principal allowed to do this action on this resource?"* Everything in AWS is an API call, so IAM is everywhere.

### Fundamentals
- **Principal** — *who* is acting: an IAM user, an IAM role, or an AWS service.
- **Policy** — a JSON document listing `Effect` (Allow/Deny), `Action` (e.g. `s3:PutObject`), `Resource` (an ARN), and optional `Condition`. **Deny always wins.** Default is implicit deny.
- **User vs Role — the single most important distinction:**
  - A **user** has long-lived credentials (password, access keys). Use for humans.
  - A **role** has *no* permanent credentials. A principal **assumes** it and receives **temporary** credentials. Use for machines and services.
- **Trust policy vs permission policy:** a role has two policies — the **trust policy** says *who may assume it* (e.g. "the EC2 service" or "this GitHub repo"), and the **permission policy** says *what it can do once assumed*.
- **Instance profile** — the wrapper that lets an EC2 instance automatically assume a role. This is how code on EC2 gets AWS access **without any keys in the code or on disk.**
- **ARN** (Amazon Resource Name) — the globally unique ID of a resource: `arn:aws:s3:::amplify-interview-uploads/*`. You'll write these constantly.

### In this project
- The EC2 box assumes **`amplify-interview-ec2-role`** (instance profile) to reach S3, Transcribe, and SSM — see `DEPLOYMENT_AWS.md` Step 5. That's why `app/db/storage.py` and `app/routers/speech.py` create boto3 clients with **no credentials** — boto3 automatically picks up the instance role.
- Locally, boto3 falls back to `~/.aws/credentials` — the same code, different credential source. (You saw this when the backend logged *"Found credentials in shared credentials file"*.)
- GitHub Actions assumes **`amplify-github-actions`** via **OIDC** — a keyless trust relationship (GitHub Actions section).

### Hands-on
1. Create an IAM admin user + enable MFA; configure the CLI with its access key.
2. Write a **scoped** S3 policy by hand (only `GetObject`/`PutObject`/`DeleteObject` on `arn:aws:s3:::amplify-interview-uploads/*`) instead of using `AmazonS3FullAccess`.
3. Create the EC2 role with an **EC2 trust policy** + that S3 policy. Attach it to your instance.
4. From the EC2 box, run `aws sts get-caller-identity` and confirm it shows the **role**, not a user.

### Pitfalls
- Reaching for `*FullAccess` managed policies "to make it work." Scope down — it's the whole lesson.
- Putting access keys in `.env`, code, or a Docker image. On EC2/App Runner you should have **zero** long-lived keys.
- Confusing the trust policy with the permission policy — if `AssumeRole` fails, it's the *trust* policy.

### You understand this when…
- You can explain why an EC2 role is safer than baking access keys into the app.
- You can read an ARN and a policy JSON and say exactly what it grants.
- You know what "temporary credentials" means and where they come from.

---

## 2. Understand VPC networking

> **Mental model:** A VPC is your own private data-center network in the cloud. **Subnets** are rooms in it; **route tables** are the hallways; **security groups** are the locked doors on each machine. Your job is to make sure the only open doors are the ones you meant to open.

### Fundamentals
- **VPC** — an isolated virtual network with a private IP range (CIDR, e.g. `10.0.0.0/16`).
- **Subnet** — a slice of that range, tied to **one Availability Zone**.
  - **Public subnet** = its route table has a route to an **Internet Gateway (IGW)**. Things here can have public IPs.
  - **Private subnet** = no direct IGW route. Reaches the internet *outbound* only via a **NAT Gateway** (and is unreachable *inbound* from the internet).
- **Route table** — rules mapping destination CIDRs to targets (local, IGW, NAT).
- **Internet Gateway** — the VPC's door to the public internet.
- **Security Group (SG)** — a **stateful** virtual firewall *on a resource* (EC2, RDS). Stateful = if you allow inbound, the response is automatically allowed out. You allow by port + source, where **source can be another SG** (not just an IP range). Default: deny all inbound, allow all outbound.
- **Network ACL (NACL)** — a **stateless** firewall at the *subnet* boundary. You'll rarely touch it; know it exists and that "stateless" means you must allow both directions.
- **SG-to-SG referencing** — the key technique: instead of "allow 5432 from 10.0.x.x", you say "allow 5432 **from `sg-ec2-web`**." Now only the app servers can reach the DB, regardless of IP.

### In this project (this is the core networking lesson)
- **EC2 lives in a public subnet**, has an Elastic IP, and its SG `sg-ec2-web` allows `443/80` from the world and `22` from your IP only.
- **RDS lives in a private subnet** with **Public access = No**, and its SG `sg-rds-db` allows `5432` **only from `sg-ec2-web`**. The database is physically unreachable from the internet — the app is its only path in.
- This is why `DATABASE_URL` points at a private endpoint that only resolves/routes correctly from inside the VPC.

### Hands-on
1. Draw your VPC on paper: CIDR, two AZs, public + private subnets, IGW, route tables.
2. Create the two SGs and wire `sg-rds-db` to accept `5432` **from `sg-ec2-web`** only.
3. Prove isolation: `psql` to RDS **from your laptop** → should **hang/fail**. From the EC2 box → should connect. Sit with *why*.
4. Lock SSH (`22`) to your IP, not `0.0.0.0/0`.

### Pitfalls
- Opening `5432` or `22` to `0.0.0.0/0` "just to test." This is the #1 way beginners get compromised.
- Putting RDS in a public subnet with a public IP — defeats the purpose.
- Forgetting RDS needs a **DB subnet group spanning ≥2 AZs**, even if you only use one.
- NAT Gateways cost money hourly — for pure learning you may not need one if the app doesn't make outbound calls from the private subnet (RDS doesn't).

### You understand this when…
- You can explain the difference between a public and private subnet in terms of route tables.
- You can explain why SG-to-SG referencing is better than IP-based rules.
- You can state why the database still works for the app even though you can't reach it from your laptop.
- You know the difference between a stateful SG and a stateless NACL.

---

## 3. Upload files to S3 (object storage)

> **Mental model:** S3 is not a filesystem — it's a **key→bytes** map (a giant hash table) with HTTP access and IAM permissions. There are no real "folders"; the `/` in a key is just part of the string.

### Fundamentals
- **Bucket** — a globally-unique namespace in one region. **Object** — the bytes + metadata. **Key** — the object's full path-like name.
- **Durability vs availability** — S3 stores redundantly across AZs (11 nines of durability). Different from a disk.
- **Private by default + presigned URLs** — keep **Block Public Access ON**. To give a browser temporary access to a private object, generate a **presigned URL**: a time-limited, signed link that embeds the permission. No public bucket needed.
- **Storage classes** (Standard, IA, Glacier) and **lifecycle rules** — auto-delete or archive old objects. Great for the temp transcription files.
- **Access:** via the SDK (boto3) using the instance role — never public creds.

### In this project
- `app/db/storage.py` — `upload_file()` stores resumes at key `resumes/{user_id}/{uuid}_{name}` and returns an `s3://` URI; `download_file()`, `delete_file()`, and `generate_signed_url()` (presigned) also live here.
- `app/routers/speech.py` — uploads audio to `transcribe_temp/{job_id}.webm`, hands the S3 URI to Transcribe, then **deletes it in a `finally` block**. A **lifecycle rule** on `transcribe_temp/` is a good backstop for when cleanup fails.
- The bucket name is `settings.aws_s3_bucket` (`amplify-interview-uploads`).

### Hands-on
1. Create the bucket with Block Public Access **ON**.
2. From the CLI, `aws s3 cp` a file up, then generate a presigned URL and open it in a browser. Watch it expire.
3. Add a **lifecycle rule**: delete anything under `transcribe_temp/` after 1 day.
4. Trace `upload_file()` in `storage.py` and match each boto3 call to what you did on the CLI.

### Pitfalls
- Turning off Block Public Access to "make the file load" — use a presigned URL instead.
- Assuming folders exist — deleting a "folder" means deleting all keys with that prefix.
- Bucket names are global — `amplify-interview-uploads` may be taken; you may need a suffix.
- The auto-create-bucket code in `storage.py` is a dev convenience; in production the bucket should be pre-provisioned (and eventually via Terraform).

### You understand this when…
- You can explain why a presigned URL is safer than a public bucket.
- You can describe what a "key" is and why S3 has no real folders.
- You can say how the app authenticates to S3 on EC2 (instance role, no keys).

---

## 4. Connect to RDS (managed relational database)

> **Mental model:** RDS is a PostgreSQL server that AWS babysits (backups, patching, failover). Your app talks to it exactly like any Postgres — the "cloud" part is networking + credentials + operations, not SQL.

### Fundamentals
- **Managed service** — AWS handles the OS, DB engine patching, automated backups, and (optionally) Multi-AZ failover. You still own schema, queries, and indexing.
- **Endpoint + port** — a DNS name resolving to the instance; `5432` for Postgres.
- **Connections are expensive** — Postgres forks a backend per connection. Apps use a **connection pool** (SQLAlchemy's engine pool) so you reuse connections. In serverless/containers at scale you add **RDS Proxy** (Stage 2).
- **Migrations** — schema changes are code. **Alembic** versions them; you run `alembic upgrade head` to apply. Never hand-edit prod schema.
- **Relational modeling** — tables, primary keys, foreign keys, indexes. **JSONB** columns let you store semi-structured blobs *and* still query them — the bridge from the old document model.
- **Backups & PITR** — automated snapshots + point-in-time recovery. Know how to restore.

### In this project (this is the DynamoDB → RDS migration)
- Today the backend uses `app/db/dynamodb.py` (document-style). The plan (`DEPLOYMENT_AWS.md` Appendix A/B) moves it to **SQLAlchemy 2.0 async + asyncpg + Alembic**.
- **Hybrid schema** (Appendix B): real columns for what you filter/sort/join on (`user_id`, `status`, `created_at`, `scores`) and **JSONB** for nested blobs (`parsed_data`, `config`, `questions_generated`, `match_analysis`). This is the single best Postgres lesson in the project.
- Connection string: `DATABASE_URL=postgresql+asyncpg://user:pw@<endpoint>:5432/amplify_interview`.
- RDS lives in the **private subnet** (see VPC section) — the app reaches it, you don't.

### Hands-on
1. Run Postgres locally in Docker first (`postgres:16`) — learn without touching AWS or paying.
2. Design the schema on paper from the Pydantic models (`app/models/*.py`); decide column vs JSONB for each field.
3. Set up Alembic, autogenerate the initial migration, `alembic upgrade head`, and inspect tables with `psql`.
4. Write one real query with a JSONB filter (e.g. sessions where `config->>'mode' = 'technical'`).
5. Then provision RDS and point `DATABASE_URL` at it; run the same migration against it.

### Pitfalls
- Opening RDS to the internet to "make it connect" — fix the SG/subnet instead (VPC section).
- No connection pooling → running out of DB connections under load.
- Editing schema by hand and losing track — always go through a migration.
- Storing *everything* as JSONB — then you can't index/constrain. Use columns for the fields you query.
- Committing the DB password — it belongs in SSM Parameter Store (Stage 1) / Secrets Manager (Stage 2).

### You understand this when…
- You can explain when to use a real column vs a JSONB field.
- You can describe what a migration is and why you never edit prod schema by hand.
- You can explain why connection pooling matters and where RDS Proxy fits later.
- You can trace how a row written by `interview_engine.py` gets back out on the results page.

---

## 5. Deploy a Dockerized application

> **Mental model:** A Docker **image** is a frozen, self-contained snapshot of your app + its dependencies + OS libraries. A **container** is a running instance of that image. "Works on my machine" dies here because the machine *is* the image.

### Fundamentals
- **Image vs container** — image = the class (immutable, built once), container = the object (a running process).
- **Dockerfile** — the recipe: base image, copy code, install deps, set the start command. Each instruction is a cached **layer**; order matters (put rarely-changing steps first).
- **Registry** — where images live. You'll push to **ECR** (Elastic Container Registry, AWS's private registry).
- **Ports** — a container is isolated; `-p 127.0.0.1:8080:8080` publishes the container's `8080` to the host's localhost only (so only Nginx can reach it).
- **Env & config** — pass config via `--env-file` / env vars, never bake secrets into the image.
- **Immutability & tags** — deploy by **building a new image tagged with the git SHA** and running it, not by editing files on the server. Rollback = run the previous tag.
- **12-factor** — config in the environment, logs to stdout (so Docker/CloudWatch can collect them), stateless processes.

### In this project
- `backend/Dockerfile` builds the FastAPI app; it must serve on **`8080`** (`uvicorn app.main:app --host 0.0.0.0 --port 8080`) to match Nginx and the App Runner config.
- On EC2 you run the container bound to `127.0.0.1:8080` and pass `--env-file /home/ec2-user/amplify.env` (populated from SSM).
- Migrations run as a **one-shot container** (`docker run --rm ... alembic upgrade head`) before the API starts — same image, different command.
- Frontend is built (`npm run build`) into static files — no container needed; it goes to S3/CloudFront.

### Hands-on
1. `docker build -t amplify-backend ./backend` and run it locally against local Postgres. Hit `/health`.
2. Read the Dockerfile line by line; reorder to maximize layer caching (deps before code).
3. Create the ECR repo, log in, tag with a git SHA, push. Pull it on the EC2 box.
4. Practice a rollback: run tag `A`, then tag `B`, then back to `A`.

### Pitfalls
- Baking secrets or `.env` into the image (they end up in image layers forever).
- Using `:latest` everywhere — you lose the ability to know/rollback what's deployed. Tag with the SHA.
- Not sending logs to stdout — then CloudWatch has nothing to collect.
- Running as root in the container; forgetting `--restart unless-stopped` so it survives reboots.

### You understand this when…
- You can explain the image/container/registry triangle.
- You can explain why deploying = "new image + run", not "edit files on server."
- You know why the container binds to `127.0.0.1` and not `0.0.0.0` on the EC2 host.

---

## 6. Configure Nginx (reverse proxy + TLS)

> **Mental model:** Nginx is the public front door. It speaks HTTPS to the world, then quietly forwards plain HTTP to your app on localhost. Your app never faces the internet directly.

### Fundamentals
- **Reverse proxy** — accepts client requests and forwards them to a backend, returning the backend's response. (A *forward* proxy sits in front of clients; a *reverse* proxy sits in front of servers.)
- **Why put it in front of FastAPI/uvicorn?** TLS termination, a hardened HTTP parser, gzip, static files, request buffering, rate limiting, and the ability to run multiple apps/paths on one box.
- **TLS termination** — Nginx holds the certificate and does the encryption/decryption, so your app deals only with plain HTTP locally.
- **Let's Encrypt + Certbot** — free, auto-renewing certificates. Certbot edits your Nginx config and sets up renewal.
- **Proxy headers** — you must forward `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` so the app knows the original client and scheme.
- **`upstream` / `proxy_pass`** — how you point Nginx at `127.0.0.1:8080`.

### In this project
- `DEPLOYMENT_AWS.md` Step 6 has the exact server block: `listen 443`, `server_name api.<domain>`, `proxy_pass http://127.0.0.1:8080`, forwarding the standard headers, with `certbot --nginx` provisioning TLS.
- The FastAPI CORS config (`allowed_origins` in `app/config.py`) must include your CloudFront frontend origin — Nginx handles transport, CORS is still the app's job.

### Hands-on
1. Install Nginx, write the reverse-proxy server block, `nginx -t`, reload.
2. `curl http://localhost:8080/health` (direct) vs `curl https://api.<domain>/health` (through Nginx) — same result, different path.
3. Run `certbot --nginx`; inspect what it changed in the config; confirm auto-renewal (`certbot renew --dry-run`).
4. Add gzip and a simple `limit_req` rate-limit zone; observe the effect.

### Pitfalls
- Forwarding no headers → the app sees Nginx's IP as the client and thinks every request is `http`.
- Opening the app's `8080` to the world *and* using Nginx — bind the app to localhost so Nginx is the only entrypoint.
- Letting the cert expire (you disabled auto-renew) — sites break silently at 90 days.
- CORS confusion: a CORS error is the *app's* config, not Nginx.

### You understand this when…
- You can explain reverse vs forward proxy.
- You can explain what "TLS termination" means and why the app only needs HTTP.
- You can name the proxy headers and what breaks without them.

---

## 7. Authenticate users with Cognito

> **Mental model:** Cognito is your outsourced identity provider. It owns passwords and issues **signed JWTs**. Your backend never sees a password — it just **verifies the signature** on the token, like checking a passport's hologram.

### Fundamentals
- **User Pool** — the user directory (sign-up, sign-in, email verification, password reset, MFA).
- **App client** — an application registered with the pool. A **public client** (no secret) is used for browser/SPA auth.
- **JWT (JSON Web Token)** — three base64 parts: header, claims (payload), signature. Claims include `sub` (stable user id), `email`, `exp` (expiry). **Anyone can read a JWT; only the issuer can sign one.**
- **Token types** — **ID token** (who the user is, for your app), **Access token** (what they can call), **Refresh token** (get new ones). This app uses the **ID token**.
- **Verification via JWKS** — Cognito publishes public keys at a `.well-known/jwks.json` URL. Your backend fetches them (and caches them) and verifies the token's signature + `iss` + `aud` + `exp`. No network call to Cognito per request.
- **Stateless auth** — no server-side sessions; the token *is* the proof. That's what lets the backend scale horizontally.

### In this project
- **Frontend** (`src/contexts/AuthContext.tsx`) calls the Cognito IDP API directly (`InitiateAuth`, `SignUp`, `ForgotPassword`, `ConfirmForgotPassword`) and stores the ID token in `localStorage` as `amplify_id_token`. `apiClient.ts` attaches it as `Authorization: Bearer <token>`.
- **Backend** (`app/middleware/auth.py`) — `get_current_user()` fetches & caches the **JWKS**, verifies signature/issuer/audience, and builds an `AuthUser(uid, email, name)`. Routers depend on `CurrentUser`.
- **Mock mode** — if no `AWS_COGNITO_CLIENT_ID` is set, the frontend accepts any login and the backend accepts the literal token `mock-user-token` (only when `ENVIRONMENT=development`). Great for local dev; make sure it's off in prod.
- The `sub` claim is the `user_id` used as the partition key / row owner everywhere.

### Hands-on
1. Create the user pool + public app client (`DEPLOYMENT_AWS.md` Step 2); enable `ALLOW_USER_PASSWORD_AUTH`.
2. Sign up a real user; paste the ID token into **jwt.io** and read the claims. Find `sub`, `email`, `exp`, `iss`.
3. Call `/api/user/profile` with a real token, then with a tampered token — watch the backend reject it.
4. Read `middleware/auth.py` and match each step to the verification checklist (kid → JWKS key → verify sig → check iss/aud/exp).

### Pitfalls
- Trusting a JWT without verifying the signature (reading claims ≠ verifying). The whole security model is the signature check.
- Confusing ID vs Access token; verifying against the wrong `aud`.
- Leaving mock mode on in production.
- Storing tokens in `localStorage` is fine for this project but is XSS-exposed; know the trade-off (httpOnly cookies are the stricter option).
- Not handling token expiry/refresh — the app currently just expires the session.

### You understand this when…
- You can explain how the backend trusts a token **without** calling Cognito on every request.
- You can explain what `sub`, `iss`, `aud`, `exp` are and why each is checked.
- You can explain why "anyone can read a JWT" is not a security problem.

---

## 8. Automate deployment using GitHub Actions (CI/CD)

> **Mental model:** CI/CD is a robot that does exactly what you'd do by hand to ship — build, test, push, deploy — triggered by `git push`, with **no human and no long-lived secrets**.

### Fundamentals
- **CI (Continuous Integration)** — on every push, build and test so broken code is caught early.
- **CD (Continuous Deployment)** — automatically ship the built artifact.
- **Workflow / job / step** — a YAML pipeline (`.github/workflows/*.yml`) of jobs made of steps; steps run shell or reusable **actions**.
- **Triggers** — `on: push: branches: [main]`, path filters so backend changes don't rebuild the frontend.
- **OIDC (the important part)** — GitHub Actions can present a short-lived **OIDC token** that an AWS IAM role trusts, so CI assumes a role and gets **temporary** AWS credentials. **No AWS access keys stored in GitHub.** This is the modern, correct pattern.
- **Artifacts & immutability** — build once, tag with the git SHA, deploy that exact artifact. Rollback = redeploy an older SHA.
- **Secrets** — GitHub encrypted secrets for non-AWS things (but prefer OIDC for AWS).

### In this project
- `DEPLOYMENT_AWS.md` Step 9 sketches `deploy-backend.yml`: checkout → `configure-aws-credentials` via OIDC → ECR login → build & push image tagged `${{ github.sha }}` → **deploy to EC2 via SSM `send-command`** (which pulls the image, runs `alembic upgrade head`, and restarts the container). No SSH keys in CI.
- A second workflow builds the frontend and `aws s3 sync dist/ ... && cloudfront create-invalidation`.
- Requires an IAM role `amplify-github-actions` whose **trust policy** names your GitHub repo (the OIDC subject).

### Hands-on
1. First do the deploy **manually** end to end (build, push, SSM/SSH deploy). Only automate what you can already do by hand.
2. Set up the GitHub OIDC identity provider in IAM + the `amplify-github-actions` role with a repo-scoped trust policy.
3. Write the backend workflow; push a trivial change; watch it build, push, and redeploy.
4. Break a build on purpose (syntax error) and confirm CI stops before deploying.

### Pitfalls
- Storing long-lived AWS keys in GitHub secrets — use OIDC instead.
- Deploying without running migrations first (or running them at container start where they race across replicas).
- No path filters → every doc change triggers a full deploy.
- Using `:latest` so you can't tell what's running. Tag with the SHA.
- No manual approval on prod — consider a `workflow_dispatch` or environment protection rule.

### You understand this when…
- You can explain OIDC trust in one sentence ("GitHub proves its identity; an IAM role trusts that identity and hands back temporary creds").
- You can explain why build-once/tag-by-SHA enables clean rollbacks.
- You can describe the full path from `git push` to a new container running on EC2.

---

## 9. Monitor applications with CloudWatch (observability)

> **Mental model:** If it's running in the cloud and you can't see it, it's a black box. CloudWatch is the pane of glass: **logs** (what happened), **metrics** (how much/how fast), **alarms** (tell me when it's bad).

### Fundamentals
- **Logs** — timestamped text lines grouped into **log groups/streams**. Your app should log to **stdout**; a collector ships it to CloudWatch Logs.
- **Metrics** — numeric time series (CPU %, memory, request count, DB connections). AWS emits many for free; you can publish **custom metrics** too.
- **Alarms** — a rule on a metric ("CPU > 80% for 5 min") that triggers an action (email via **SNS**, auto-scaling, etc.).
- **Dashboards** — curated views of the metrics you care about.
- **The three pillars of observability** — **logs, metrics, traces.** CloudWatch covers logs+metrics; tracing (X-Ray) is a later add-on.
- **Billing alarms** — a special, essential metric: alert when estimated charges cross a threshold.

### In this project
- **EC2:** install the **CloudWatch agent** to ship host metrics (CPU/mem/disk) and Docker container logs. Or run the container with the `awslogs` log driver → log group `/amplify/api`.
- **App logs:** FastAPI already logs to stdout (`logging.basicConfig` in `app/main.py`, per-request errors via the global handler) — perfect for collection.
- **RDS:** watch `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`; alarm on low free storage and high connections.
- **EC2 health:** alarm on `StatusCheckFailed` → SNS email.
- **Cost:** a **billing alarm at $5** is your seatbelt while learning.

### Hands-on
1. **Do this first, before anything else costs money:** create a billing alarm at $5 via SNS to your email.
2. Install the CloudWatch agent on EC2; confirm host metrics and `/amplify/api` logs appear.
3. Trigger an error in the app and **find that log line in CloudWatch Logs** (this is the skill that matters at 2am).
4. Create an alarm on EC2 CPU and on RDS `FreeStorageSpace`; test that the SNS email fires.
5. Build a small dashboard: request errors, CPU, DB connections.

### Pitfalls
- Not centralizing logs — SSHing to read files doesn't scale and dies with the box.
- Logging secrets/PII (tokens, emails) into CloudWatch.
- Alarms with no action (no SNS) — a light nobody sees.
- Infinite log retention — set a retention period; logs cost money.
- Forgetting the billing alarm and getting a surprise bill.

### You understand this when…
- You can name the three pillars of observability and which CloudWatch covers.
- You can find a specific error log line for a failed request without SSHing to the box.
- You can explain the metric → alarm → SNS chain.
- You have a working billing alarm right now.

---

## Capstone: prove you learned it

You're "fundamentally strong" when you can do these **without notes**:

1. **Narrate the request flow** (the big-picture diagram) end to end, naming the security boundary at each hop.
2. **Draw the VPC** and explain why the database is safe.
3. **Explain the credential story** at every layer: laptop (`~/.aws`), EC2 (instance role), CI (OIDC), app→Cognito (JWT/JWKS) — and point out that **none of them use long-lived keys in code.**
4. **Ship a change** by pushing to `main` and watching CI build → migrate → redeploy.
5. **Debug a 500** by finding the log line in CloudWatch, not by SSHing.
6. **Roll back** to the previous image tag.
7. **Justify each Stage-2 upgrade** (App Runner, Secrets Manager, Redis, SQS, RDS Proxy, Terraform) by naming the Stage-1 pain it removes.

## Where each objective lives in the repo

| Objective | Code / config touchpoints |
|---|---|
| IAM | instance role in `DEPLOYMENT_AWS.md` Step 5; boto3 credential fallback in `app/db/storage.py`, `app/routers/speech.py` |
| VPC | `DEPLOYMENT_AWS.md` Step 1 (SGs, subnets); why `DATABASE_URL` is a private endpoint |
| S3 | `app/db/storage.py`, temp files in `app/routers/speech.py` |
| RDS | migration plan `DEPLOYMENT_AWS.md` Appendix A/B; models in `app/models/*.py` |
| Docker | `backend/Dockerfile`, `DEPLOYMENT_AWS.md` Step 8 |
| Nginx | `DEPLOYMENT_AWS.md` Step 6; CORS in `app/config.py` |
| Cognito | `src/contexts/AuthContext.tsx`, `app/middleware/auth.py` |
| GitHub Actions | `.github/workflows/*` (to be created), `DEPLOYMENT_AWS.md` Step 9 |
| CloudWatch | `DEPLOYMENT_AWS.md` Step 10; app logging in `app/main.py` |

---

*Companion docs:* `DEPLOYMENT_AWS.md` (the step-by-step build), this file (the why). Keep them in sync as the project evolves.
