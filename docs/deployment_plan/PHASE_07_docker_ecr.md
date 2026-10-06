# Phase 7 — Docker Image and ECR

**Goal:** a versioned backend image built locally, running locally, and pushed to a private AWS registry.
**Time:** ~1.5 hours
**Prerequisites:** Phases 1–6; Docker Desktop running
**Cost impact:** ~$1/month (ECR storage; 500 MB free tier)
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §5 (Deploy a Dockerized application)

---

## Why this phase exists

The unit of deployment for this project is a container image. Getting it right locally — where the feedback loop is seconds — before shipping it to EC2 is what makes Phase 8 boring instead of a debugging session.

`backend/Dockerfile` already exists and is a decent multi-stage build. This phase is about understanding it, fixing what's stale, and learning the registry workflow.

---

## Concepts you need

**Image vs container** — the image is the immutable filesystem + metadata; the container is a running instance. Same relationship as class and object.

**Layers** — each Dockerfile instruction creates a layer, cached and reused. Order matters enormously: copy `requirements.txt` and `pip install` **before** copying source code, so a one-line code change doesn't reinstall every dependency. The existing Dockerfile gets this right.

**Multi-stage builds** — build in a fat image with compilers, copy only the artifacts into a slim runtime image. Ships a much smaller attack surface.

**Registry** — where images live. ECR is AWS's private one; auth is an IAM-derived token, not a stored password.

**Tags** — `:latest` is a *mutable pointer*, not a version. Deploying `:latest` means you cannot say what is running or roll back to a known state. Tag with the git SHA and treat `:latest` as a convenience alias only.

---

## Steps

```bash
source ~/amplify-env.sh
```

### 7.1 — Read the Dockerfile

Open `backend/Dockerfile`. Confirm you can explain each instruction. Two things need attention:

**Python version.** It currently says `python:3.12-slim`. Phase 5 rebuilt your venv — make the Dockerfile, the venv, and the CI workflow all agree on one version. Drift here produces bugs that reproduce in exactly one environment.

**The PORT comment.** `ENV PORT=8080` is correct for our Nginx setup — Nginx proxies to the container on 8080. (The old `# Cloud Run provides PORT env var` comment was removed with the rest of the GCP cruft on 2026-08-10.)

### 7.2 — Build and inspect

```bash
cd "/Users/nirajmehta/Documents/Full Stack Projects/amplify-interview"
docker build -t amplify-backend:dev ./backend

docker images amplify-backend        # expect a few hundred MB
docker history amplify-backend:dev   # see the layers and their sizes
```

Then prove the layer cache is real: touch a source file, rebuild, and watch every step up to `COPY app/` come back as `CACHED`. Now touch `requirements.txt` and rebuild — the dependency install runs again. That contrast is the whole lesson about instruction ordering.

### 7.3 — Run it against local Postgres

Test the image against the local database from Phase 5, not RDS (which you still can't reach).

```bash
docker run --rm -p 8080:8080 \
  -e ENVIRONMENT=development \
  -e DATABASE_URL="postgresql+asyncpg://postgres:dev@host.docker.internal:5432/amplify_interview" \
  -e AWS_REGION=us-east-1 \
  -e AWS_S3_BUCKET=$BUCKET \
  -e OPENAI_API_KEY=sk-placeholder \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  amplify-backend:dev

curl http://localhost:8080/health
```

`host.docker.internal` is how a container reaches a service on the macOS host. Using `localhost` inside the container refers to *the container itself*, and is the most common first-time Docker networking mistake.

Also run the migration through the image — this is exactly the command Phase 8 runs on EC2, so a failure here is much cheaper to debug:
```bash
docker run --rm \
  -e DATABASE_URL="postgresql+asyncpg://postgres:dev@host.docker.internal:5432/amplify_interview" \
  amplify-backend:dev alembic upgrade head
```

### 7.4 — Create the ECR repository

```bash
aws ecr create-repository --repository-name $PROJECT-backend \
  --image-scanning-configuration scanOnPush=true

export ECR=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT-backend
echo "ECR=$ECR"
```

`scanOnPush` gives you a free CVE scan of your dependencies on every push — worth having on.

### 7.5 — Push, tagged by git SHA

```bash
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

export SHA=$(git rev-parse --short HEAD)
docker tag amplify-backend:dev $ECR:$SHA
docker tag amplify-backend:dev $ECR:latest
docker push $ECR:$SHA
docker push $ECR:latest

aws ecr list-images --repository-name $PROJECT-backend --output table
```

That login token is valid for 12 hours; you will re-run the login command often.

### 7.6 — Lifecycle policy so storage doesn't creep

Every CI run in Phase 9 pushes an image. Without this you accumulate hundreds.

```bash
aws ecr put-lifecycle-policy --repository-name $PROJECT-backend \
  --lifecycle-policy-text '{"rules":[{
    "rulePriority":1,
    "description":"Keep last 10 images",
    "selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},
    "action":{"type":"expire"}}]}'
```

### 7.7 — Check the scan results

```bash
aws ecr describe-image-scan-findings --repository-name $PROJECT-backend --image-id imageTag=$SHA \
  --query "imageScanFindings.findingSeverityCounts"
```

Some findings in a `python:slim` base are normal. Look at them anyway — knowing what's in your image is part of owning it.

---

## ✅ Checkpoints

- [ ] `docker build` succeeds and `docker history` shows the multi-stage layers.
- [ ] Rebuilding after a source-only change shows `CACHED` up to the `COPY app/` step.
- [ ] The container serves `/health` on `localhost:8080`.
- [ ] `alembic upgrade head` runs successfully **through the image**.
- [ ] `aws ecr list-images` shows both the SHA tag and `latest`.
- [ ] The lifecycle policy is attached.

---

## 🧠 You understand this when you can answer, without notes

1. Why copy `requirements.txt` and install *before* copying application code?
2. What does the multi-stage build actually remove from the final image?
3. Why is deploying `:latest` a bad idea, and what does the git SHA tag buy you?
4. Why does `localhost` inside a container not reach your host's Postgres?
5. Where do the credentials for `docker push` come from, and how long do they last?

---

## 🔧 Troubleshooting

**`Cannot connect to the Docker daemon`** — Docker Desktop isn't running. (It is currently not running on this machine.)

**`no basic auth credentials` on push** — the ECR login expired or targeted the wrong registry host. Re-run 7.5's login line; note it points at the registry root, not the repository path.

**Build fails compiling a wheel** — a dependency needs system libraries. `build-essential` is already in the builder stage; if something new needs more, add it there, not to the runtime stage.

**Container starts then exits immediately** — read `docker logs <id>`. Usually a missing required env var causing a pydantic-settings validation error at import.

**`alembic upgrade head` can't reach the DB from the container** — you used `localhost` instead of `host.docker.internal`.

---

## 📝 Record in `aws-ids.txt`

```
ECR=
```

---

**Next:** [Phase 8 — EC2, Nginx, and TLS](PHASE_08_ec2_nginx.md) ← this is where it goes live
