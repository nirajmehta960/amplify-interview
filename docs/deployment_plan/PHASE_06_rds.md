# Phase 6 — RDS PostgreSQL and SSM Parameter Store

**Goal:** a managed Postgres instance that is unreachable from the internet, plus all app config stored centrally.
**Time:** ~1.5 hours (RDS takes 5–10 minutes to provision — get a coffee)
**Prerequisites:** Phases 1–5
**Cost impact:** **~$15/month** — this is the most expensive resource in the project. Stop it when idle.
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §4 (RDS)

---

## Why this phase exists

You have the code (Phase 5) and the network (Phase 2). This is where the actual database lands — inside the security group you built, with **Public access = No**, reachable only by things carrying `sg-ec2-web`.

The Parameter Store half of this phase is the answer to "where do secrets live?" Not in a `.env` committed to git, not baked into the Docker image — in SSM, fetched at deploy time by a role that is allowed to read them.

---

## ⚠️ Read this before you start: you cannot migrate the database yet

RDS is private. EC2 does not exist until Phase 8. So there is **no machine that can reach the database** during this phase, and `alembic upgrade head` **cannot run here**.

That is not a flaw in the plan — it is the security model working. The sequence is:
- **Phase 6 (now):** create the database, verify it is unreachable, store the connection string.
- **Phase 8:** from the EC2 box, run migrations and create the schema.

You already validated your migrations against local Docker Postgres in Phase 5, which is exactly what that step was for. If you want to reach RDS from your laptop before Phase 8, §6.5 shows the SSM port-forwarding trick — but it needs the EC2 instance, so it is genuinely a Phase 8 activity.

---

## Concepts you need

**Managed database** — AWS runs the engine, patching, backups, and failover. You lose OS access and gain not being on call for it.

**DB subnet group** — a set of subnets across **≥2 AZs** that RDS may place the instance in. Required even for a single-AZ instance, because failover needs somewhere to fail over to. This is why Phase 2 collected two subnet IDs.

**Public access = No** — RDS gets no public IP and no DNS route from outside the VPC. Combined with the SG rule from Phase 2, the database is unreachable from the internet by two independent mechanisms.

**Connection pooling** — every Postgres connection is a separate OS process on the server. `db.t4g.micro` caps out around 80–100. Your app's pool settings (`pool_size=5, max_overflow=10` from Phase 5) exist so a handful of app instances cannot exhaust that.

**Parameter Store vs Secrets Manager** — Parameter Store `SecureString` is free and KMS-encrypted. Secrets Manager adds automatic rotation for ~$0.40/secret/month. We use Parameter Store in Stage 1 and note Secrets Manager as the Stage 2 upgrade.

---

## Steps

```bash
source ~/amplify-env.sh
export VPC_ID=... SUBNET_A=... SUBNET_B=... SG_WEB=... SG_DB=... BUCKET=...
export POOL_ID=... CLIENT_ID=...
```

### 6.1 — DB subnet group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name amplify-db-subnets \
  --db-subnet-group-description "Amplify RDS subnets" \
  --subnet-ids $SUBNET_A $SUBNET_B
```

### 6.2 — Create the instance

**UI:** RDS → *Create database* → **Standard create** → **PostgreSQL 16** → Template **Free tier** → `db.t4g.micro`, 20 GB gp3 → master user `amplify_admin` + strong password → **Connectivity: Public access = No**, security group **`sg-rds-db`**, subnet group `amplify-db-subnets` → *Additional configuration* → **Initial database name `amplify_interview`** → backups 7 days → Create.

**CLI:**
```bash
export DB_PASSWORD='<choose-a-strong-password-no-@-or-/>'

aws rds create-db-instance \
  --db-instance-identifier amplify-interview-db \
  --engine postgres --engine-version 16.4 \
  --db-instance-class db.t4g.micro \
  --allocated-storage 20 --storage-type gp3 \
  --master-username amplify_admin --master-user-password "$DB_PASSWORD" \
  --db-name amplify_interview \
  --db-subnet-group-name amplify-db-subnets \
  --vpc-security-group-ids $SG_DB \
  --no-publicly-accessible \
  --backup-retention-period 7

aws rds wait db-instance-available --db-instance-identifier amplify-interview-db

export DB_HOST=$(aws rds describe-db-instances \
  --db-instance-identifier amplify-interview-db \
  --query "DBInstances[0].Endpoint.Address" --output text)
echo "DB_HOST=$DB_HOST"
```

> Avoid `@`, `/`, `"`, and `%` in the password. It gets embedded in a URL (`postgresql+asyncpg://user:pass@host/db`) where those characters have meaning, and `%` additionally breaks Alembic's ConfigParser interpolation.

**"Initial database name" is not optional.** Leave it blank and RDS creates a server with **no database in it**, and every connection fails with `database "amplify_interview" does not exist`. Fixing it after the fact means connecting to the `postgres` database and issuing `CREATE DATABASE` — from a box that doesn't exist yet.

### 6.3 — Prove the isolation

This is the checkpoint that teaches the phase.

```bash
psql -h $DB_HOST -U amplify_admin -d amplify_interview
# Expected: hangs, then times out. This is SUCCESS, not failure.
```

It hangs rather than refusing because the security group **drops** unmatched packets instead of rejecting them — there is no "no" to receive, so your client waits. Sit with why that's the correct behaviour for a database.

### 6.4 — Store all config in Parameter Store

```bash
put()  { aws ssm put-parameter --name "$1" --value "$2" --type String       --overwrite >/dev/null; }
puts() { aws ssm put-parameter --name "$1" --value "$2" --type SecureString --overwrite >/dev/null; }

put   /amplify/prod/ENVIRONMENT              "production"
put   /amplify/prod/AWS_REGION               "$AWS_REGION"
put   /amplify/prod/AWS_S3_BUCKET            "$BUCKET"
put   /amplify/prod/ALLOWED_ORIGINS          "https://app.yourdomain.com"
put   /amplify/prod/AWS_COGNITO_USER_POOL_ID "$POOL_ID"
put   /amplify/prod/AWS_COGNITO_CLIENT_ID    "$CLIENT_ID"

puts  /amplify/prod/OPENAI_API_KEY  "<your-openai-key>"
puts  /amplify/prod/RESEND_API_KEY  "<your-resend-key>"
puts  /amplify/prod/DATABASE_URL \
  "postgresql+asyncpg://amplify_admin:$DB_PASSWORD@$DB_HOST:5432/amplify_interview"
```

Note `postgresql+asyncpg://` — the driver the Phase 5 code expects. The plain `postgresql://` scheme raises a confusing `InvalidRequestError` at first request.

**`ENVIRONMENT=production` matters for security.** `middleware/auth.py` accepts the literal `mock-user-token` **only** when environment is `development`. Get this wrong and you ship an auth bypass.

Verify, and confirm encryption actually applies:
```bash
aws ssm get-parameters-by-path --path /amplify/prod --query "Parameters[].Name" --output table

# Without decryption the secret comes back as ciphertext:
aws ssm get-parameter --name /amplify/prod/DATABASE_URL --query "Parameter.Value" --output text
# With it, plaintext (this is what the EC2 role will do):
aws ssm get-parameter --name /amplify/prod/DATABASE_URL --with-decryption --query "Parameter.Value" --output text
```

### 6.5 — Reaching RDS from your laptop (Phase 8 preview)

Once EC2 exists, SSM port forwarding tunnels through it without opening any firewall port:

```bash
aws ssm start-session --target $EC2_ID \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"$DB_HOST\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"5433\"]}"

# In another terminal — note port 5433, your local Docker Postgres still owns 5432:
psql -h localhost -p 5433 -U amplify_admin -d amplify_interview
```

Come back to this in Phase 8. It is the cleanest way to inspect production data, and it requires no SSH key and no inbound rule.

---

## ✅ Checkpoints

- [ ] RDS status **Available**, **Publicly accessible = No**.
- [ ] `psql` direct from your laptop **hangs/times out** — the isolation is real.
- [ ] All 9 parameters exist under `/amplify/prod`.
- [ ] `DATABASE_URL` starts with `postgresql+asyncpg://` and contains the real endpoint.
- [ ] Fetching `DATABASE_URL` *without* `--with-decryption` returns ciphertext.
- [ ] `ENVIRONMENT` is `production`.

---

## 🧠 You understand this when you can answer, without notes

1. Why does a single-AZ instance still require a subnet group spanning two AZs?
2. Why does `psql` from your laptop *hang* rather than immediately refuse?
3. The app will connect fine while you cannot. Explain the exact mechanism.
4. Why store `DATABASE_URL` in SSM rather than baking it into the Docker image?
5. Why can't `alembic upgrade head` run in this phase?

---

## 🔧 Troubleshooting

**`InvalidParameterValue: Cannot find version 16.4`** — versions get retired. List what's available:
`aws rds describe-db-engine-versions --engine postgres --query "DBEngineVersions[].EngineVersion" --output table`

**`DBSubnetGroupDoesNotCoverEnoughAZs`** — both subnet IDs are in the same AZ. Re-check the Phase 2 table and pick two different ones.

**Creation takes forever** — 5–10 minutes is normal. `aws rds wait db-instance-available` blocks until ready.

**Password rejected** — RDS forbids `/`, `"`, `@`, and spaces in master passwords.

**Parameter Store `ParameterAlreadyExists`** — you dropped `--overwrite`. The helper functions above include it.

---

## 💰 Stop it when idle

```bash
aws rds stop-db-instance --db-instance-identifier amplify-interview-db
aws rds start-db-instance --db-instance-identifier amplify-interview-db
```
AWS force-restarts a stopped instance after **7 days**, so re-stop it weekly if you take a long break.

---

## 📝 Record in `aws-ids.txt`

```
DB_HOST=
DB_SUBNET_GROUP=amplify-db-subnets
# DB_PASSWORD — SSM only, never write it here
```

---

**Next:** [Phase 7 — Docker and ECR](PHASE_07_docker_ecr.md)
