# Phase 9 — CI/CD with GitHub Actions

**Goal:** push to `main` → tests run → image builds → migrations apply → deploy → health check. No AWS keys stored anywhere.
**Time:** ~2.5 hours
**Prerequisites:** Phases 1–8 (a working manual deploy you can now automate)
**Cost impact:** $0 (GitHub Actions is free for public repos / 2000 min per month on free private)
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §8 (GitHub Actions)

---

## Why this phase exists

You deployed by hand in Phase 8. You now know every command the pipeline needs to run, which is exactly the right time to automate — automating a process you don't understand produces a black box you can't debug.

The headline lesson is **OIDC**: GitHub Actions assumes an AWS role using a short-lived identity token, so there are no AWS access keys in your repository secrets at all.

---

## ⚠️ Prerequisite: you need real tests

The pipeline gates deploys on `pytest`. If Phase 5 §5.2 was skipped, `pytest` exits code **5** ("no tests collected"), which **fails the job** — so nothing will ever deploy.

Confirm before writing the workflow:
```bash
cd backend && ./venv/bin/pytest -q && echo "exit=$?"
```

---

## Concepts you need

**OIDC federation** — GitHub mints a signed JWT describing the workflow (`repo:owner/name:ref:refs/heads/main`). AWS trusts GitHub's OIDC provider, validates that token, and returns temporary credentials. No secrets, nothing to rotate, nothing to leak.

**Trust policy conditions** — the role's trust policy restricts *which* repo and *which* branch may assume it. Without the `sub` condition, **any GitHub repository in the world** could assume your role. This is the single most important line in this phase.

**SSM Run Command** — executes shell commands on the instance via the SSM agent. The deploy needs no SSH key in CI and no inbound port 22 from GitHub's IP ranges.

**Job dependencies** — `needs: test` creates the gate. Without it, jobs run in parallel and a broken build ships.

---

## Steps

### 9.1 — Register GitHub as an OIDC provider

Once per AWS account:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 9.2 — Create the deploy role

Replace `<GITHUB_OWNER>/<REPO>` with your actual repository.

```bash
cat > /tmp/gh-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:<GITHUB_OWNER>/<REPO>:ref:refs/heads/main"
      }
    }
  }]
}
EOF

aws iam create-role --role-name amplify-github-actions \
  --assume-role-policy-document file:///tmp/gh-trust.json

cat > /tmp/gh-policy.json <<EOF
{ "Version":"2012-10-17","Statement":[
  { "Effect":"Allow",
    "Action":["ecr:GetAuthorizationToken"],
    "Resource":"*" },
  { "Effect":"Allow",
    "Action":["ecr:BatchCheckLayerAvailability","ecr:CompleteLayerUpload","ecr:InitiateLayerUpload",
              "ecr:PutImage","ecr:UploadLayerPart","ecr:BatchGetImage","ecr:GetDownloadUrlForLayer"],
    "Resource":"arn:aws:ecr:$AWS_REGION:$ACCOUNT_ID:repository/$PROJECT-backend" },
  { "Effect":"Allow",
    "Action":["ssm:SendCommand","ssm:GetCommandInvocation","ssm:ListCommandInvocations"],
    "Resource":"*" }
]}
EOF

aws iam put-role-policy --role-name amplify-github-actions \
  --policy-name amplify-deploy --policy-document file:///tmp/gh-policy.json

echo "arn:aws:iam::$ACCOUNT_ID:role/amplify-github-actions"
```

That `sub` condition is the security boundary. Read it once more and make sure the owner, repo, and branch are exactly right.

### 9.3 — The workflow

`.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ["backend/**", ".github/workflows/deploy-backend.yml"]

env:
  AWS_REGION: us-east-1
  ECR_REPO: amplify-interview-backend

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: dev
          POSTGRES_DB: amplify_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"      # must match backend/Dockerfile
          cache: "pip"
      - run: pip install -r backend/requirements.txt
      - name: Run tests
        working-directory: backend
        env:
          TEST_DATABASE_URL: postgresql+asyncpg://postgres:dev@localhost:5432/amplify_test
        run: pytest -q

  deploy:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      id-token: write        # required for OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/amplify-github-actions
          aws-region: ${{ env.AWS_REGION }}

      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr

      - name: Build and push
        run: |
          IMAGE=${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPO }}:${{ github.sha }}
          docker build -t $IMAGE ./backend
          docker push $IMAGE
          docker tag $IMAGE ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPO }}:latest
          docker push ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPO }}:latest

      - name: Deploy via SSM
        run: |
          IMAGE=${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPO }}:${{ github.sha }}
          CMD_ID=$(aws ssm send-command \
            --document-name AWS-RunShellScript \
            --targets "Key=tag:Name,Values=amplify-api" \
            --comment "Deploy ${{ github.sha }}" \
            --parameters commands="[
              \"set -e\",
              \"aws ecr get-login-password --region ${{ env.AWS_REGION }} | docker login --username AWS --password-stdin ${{ steps.ecr.outputs.registry }}\",
              \"docker pull $IMAGE\",
              \"aws ssm get-parameters-by-path --path /amplify/prod --with-decryption --region ${{ env.AWS_REGION }} --query 'Parameters[*].[Name,Value]' --output text | sed 's#/amplify/prod/##' | awk '{print \\\$1\\\"=\\\"\\\$2}' > /home/ec2-user/amplify.env\",
              \"docker run --rm --env-file /home/ec2-user/amplify.env $IMAGE alembic upgrade head\",
              \"docker rm -f amplify-api || true\",
              \"docker run -d --name amplify-api --restart unless-stopped -p 127.0.0.1:8080:8080 --env-file /home/ec2-user/amplify.env $IMAGE\"
            ]" \
            --query "Command.CommandId" --output text)

          echo "SSM command: $CMD_ID"
          aws ssm wait command-executed --command-id $CMD_ID \
            --instance-id ${{ secrets.EC2_INSTANCE_ID }} || true
          aws ssm get-command-invocation --command-id $CMD_ID \
            --instance-id ${{ secrets.EC2_INSTANCE_ID }} \
            --query "{Status:Status,Out:StandardOutputContent,Err:StandardErrorContent}" --output json

      - name: Health check
        run: |
          for i in $(seq 1 12); do
            if curl -sf https://api.yourdomain.com/health; then
              echo "healthy"; exit 0
            fi
            echo "waiting ($i/12)…"; sleep 5
          done
          echo "health check failed"; exit 1
```

Two details worth understanding rather than copying:

- **`aws ssm wait command-executed ... || true`** then an explicit `get-command-invocation`. The waiter returns non-zero on a failed command *without showing you why*; fetching the invocation surfaces stdout/stderr in the CI log. Without this, a failed deploy shows as an opaque red X.
- **The health check runs against the public URL**, not localhost — it verifies the whole chain (DNS → Nginx → TLS → container), which is what you actually care about.

### 9.4 — Repository secrets

GitHub → repo → *Settings* → *Secrets and variables* → *Actions*:

| Secret | Value |
|---|---|
| `AWS_ACCOUNT_ID` | your 12-digit account ID |
| `EC2_INSTANCE_ID` | `$EC2_ID` from Phase 8 |

Note what is **not** here: no access key, no secret key, no SSH private key. That is the OIDC payoff.

### 9.5 — Test it

Make a trivial backend change, push to `main`, and watch the Actions tab. Then deliberately break a test, push, and confirm the deploy job **does not run**. Verifying the gate actually gates is the point.

### 9.6 — Frontend workflow (after Phase 10)

Once CloudFront exists, add a second workflow on `paths: ["src/**", "package.json"]` that runs `npm ci && npm run build`, `aws s3 sync dist/ s3://$WEB_BUCKET --delete`, and a CloudFront invalidation. Come back to this after Phase 10.

---

## ✅ Checkpoints

- [ ] `aws iam get-role --role-name amplify-github-actions` shows the `sub` condition scoped to your repo and branch.
- [ ] A push to `main` runs tests, builds, deploys, and passes the health check.
- [ ] A failing test **blocks** the deploy job.
- [ ] No AWS keys exist in repository secrets.
- [ ] The running container matches the pushed SHA: `docker inspect amplify-api --format '{{.Config.Image}}'` on the box.

---

## 🧠 You understand this when you can answer, without notes

1. How does GitHub prove its identity to AWS without a stored secret?
2. What could an attacker do if the trust policy omitted the `sub` condition?
3. Why deploy via SSM rather than SSH from the runner?
4. Why do migrations run before the new container starts, not after?
5. What happens to in-flight requests during `docker rm -f`? What would you need for zero-downtime deploys?

---

## 🔧 Troubleshooting

**`Not authorized to perform sts:AssumeRoleWithWebIdentity`** — the `sub` condition doesn't match. It is case-sensitive and branch-specific; a PR from a fork or a different branch will not match `refs/heads/main`.

**`Credentials could not be loaded`** — the job is missing `permissions: id-token: write`.

**SSM command reports success but nothing deployed** — the tag selector matched no instances. `aws ssm send-command` happily targets zero instances. Verify the instance carries `Name=amplify-api` and that the SSM agent is online: `aws ssm describe-instance-information`.

**Deploy succeeds, health check fails** — the container is crash-looping. Read the `get-command-invocation` output, then `docker logs amplify-api` on the box.

**Migration fails and takes the deploy with it** — correct behaviour. Fix the migration; the old container is still running because `docker rm -f` runs *after* the migration step.

---

## 📝 Record in `aws-ids.txt`

```
GH_ROLE_ARN=arn:aws:iam::<account>:role/amplify-github-actions
OIDC_PROVIDER=token.actions.githubusercontent.com
```

---

**Next:** [Phase 10 — Frontend on S3 + CloudFront](PHASE_10_frontend.md)
