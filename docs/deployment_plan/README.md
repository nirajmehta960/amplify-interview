# Amplify Interview — Manual AWS Deployment, Phase by Phase

You deploy this yourself, by hand, one phase per sitting. Every phase teaches one part of the stack and ends with something you can verify.

## The three documents, and when to read each

| Document | Use it for |
|---|---|
| **`DEPLOYMENT_AWS.md`** (this folder) | *Why* the architecture has this shape. Read once, up front. |
| **`../CLOUD_LEARNING_OBJECTIVES.md`** | The concepts, from the ground up. Read the linked section *before* each phase. |
| **`../AWS_SETUP_RUNBOOK.md`** | Condensed command reference. Useful once you've done a phase and want the commands without the prose. |
| **`PHASE_XX_*.md`** (this folder) | **What you actually work from.** Each phase is self-contained: concepts → steps → checkpoints → self-check. |

Order of operations for each phase: read the linked learning-objective section → work the phase doc → clear every checkpoint → answer the self-check questions without notes → move on.

---

## The phases

| # | Phase | What you learn | Time | New cost |
|---|---|---|---|---|
| 1 | [Foundations](PHASE_01_foundations.md) | IAM users vs roles, policies, ARNs, billing alarms | 45m | $0 |
| 2 | [Networking](PHASE_02_networking.md) | VPC, subnets, route tables, security groups, SG-to-SG | 1h | $0 |
| 3 | [S3 + IAM role](PHASE_03_s3_iam.md) | Object storage, presigned URLs, instance profiles | 1h | ~$0 |
| 4 | [Cognito](PHASE_04_cognito.md) | User pools, JWTs, JWKS verification | 1h | $0 |
| 5 | [**Code: DynamoDB → Postgres**](PHASE_05_code_migration.md) | SQLAlchemy 2.0 async, Alembic, relational modeling | 8–12h | $0 |
| 6 | [RDS PostgreSQL](PHASE_06_rds.md) | Managed databases, subnet groups, private networking | 1.5h | ~$15/mo |
| 7 | [Docker + ECR](PHASE_07_docker_ecr.md) | Image layers, registries, multi-stage builds | 1.5h | ~$1/mo |
| 8 | [EC2 + Nginx + TLS](PHASE_08_ec2_nginx.md) | **First live deploy.** Reverse proxy, Let's Encrypt, systemd | 3h | ~$8/mo |
| 9 | [CI/CD](PHASE_09_cicd.md) | GitHub OIDC, keyless deploys, SSM run-command | 2.5h | $0 |
| 10 | [Frontend](PHASE_10_frontend.md) | Static hosting, CDN, OAC, cache invalidation | 2h | ~$1/mo |
| 11 | [Observability](PHASE_11_observability.md) | CloudWatch logs, metrics, alarms | 2h | ~$2/mo |

**Phase 5 is the outlier** — it is pure local code work with no AWS involved, and it is the longest phase by far. It sits in the middle because the backend currently runs on DynamoDB and cannot talk to RDS until it is rewritten. Its own plan lives at `~/.claude/plans/peaceful-riding-hippo.md`.

You reach a working public URL at the end of **Phase 8**. Phases 9–11 make it maintainable.

---

## Before Phase 1

- An AWS account with **MFA on the root user**, and root credentials put away.
- **AWS CLI v2** installed (`aws --version`).
- **Docker Desktop** installed *and running* (`docker ps` must succeed — it currently does not on this machine).
- **Python 3.11+** for the backend venv (system Python is 3.9.6, which is too old for Phase 5).
- A **domain you control**, if you want HTTPS on a real hostname in Phase 8. Without one you can still finish, but you'll be on a bare IP with no TLS.
- Everything lives in **`us-east-1`**. Mixing regions is the classic time sink.

---

## Keep a scratch file

Create `aws-ids.txt` in your home directory (**not** in the repo — it is not gitignored) and paste every ID as you create it. You will reuse these constantly across phases.

```
ACCOUNT_ID=
VPC_ID=            SUBNET_A=            SUBNET_B=
SG_WEB=            SG_DB=
BUCKET=            WEB_BUCKET=
DB_HOST=           # DB_PASSWORD lives in SSM only — never here
ECR=
EC2_ID=            EC2_IP=              EIP_ALLOC=
POOL_ID=           CLIENT_ID=
DISTRIBUTION_ID=
```

Each phase opens with a shell block that re-exports what it needs. Re-run it whenever you open a new terminal.

---

## Cost control

Running everything continuously is roughly **$25–30/month**, dominated by RDS and EC2. With ~$100 of credits you have a few months of runway, but idle resources still burn it.

Set the billing alarm in Phase 1 **before provisioning anything**. When you stop for more than a day:

```bash
aws ec2 stop-instances --instance-ids $EC2_ID
aws rds stop-db-instance --db-instance-identifier amplify-interview-db   # auto-restarts after 7 days
```

Each phase doc has a **Cost impact** line at the top and a teardown note where relevant.

---

## Progress tracker

- [ ] Phase 1 — Foundations
- [ ] Phase 2 — Networking
- [ ] Phase 3 — S3 + IAM role
- [ ] Phase 4 — Cognito
- [ ] Phase 5 — Code migration to Postgres
- [ ] Phase 6 — RDS
- [ ] Phase 7 — Docker + ECR
- [ ] Phase 8 — EC2 + Nginx + TLS ← **first live**
- [ ] Phase 9 — CI/CD
- [ ] Phase 10 — Frontend
- [ ] Phase 11 — Observability

---

## The one request you should be able to narrate

By the end, you should be able to trace this from memory. If you can, you understand the system.

```
Browser (React on CloudFront/S3)
  │ 1. Logged in → Cognito JWT in localStorage (amplify_id_token)
  │ 2. fetch("https://api.<domain>/api/interview/session/{id}/message", Bearer <JWT>)
  ▼
DNS → Elastic IP → EC2 (public subnet)
  │ 3. Nginx :443 terminates TLS, proxies to 127.0.0.1:8080
  ▼
FastAPI container (Docker, :8080)
  │ 4. middleware/auth.py verifies the JWT against Cognito's JWKS
  │ 5. interview_engine.py runs the logic, calls OpenAI
  │ 6. reads/writes rows in RDS (private subnet) over the SG-to-SG rule
  │ 7. reads/writes resume files in S3 using the EC2 instance role (no keys)
  ▼
Response back up: FastAPI → Nginx → browser
        (CloudWatch collecting logs/metrics throughout)
```

Every phase below is one box or one arrow in that diagram.
