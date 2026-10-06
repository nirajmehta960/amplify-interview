# Phase 3 — S3 Bucket and the IAM Instance Role

**Goal:** a private bucket for résumé uploads, and a role that lets EC2 reach it with **zero credentials on the box**.
**Time:** ~1 hour
**Prerequisites:** Phases 1–2
**Cost impact:** pennies (5 GB free tier; this app stores small files)
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §3 (S3) and §1 (IAM roles)

---

## Why this phase exists

Two lessons in one sitting. First: S3 is not a filesystem — it is a key→bytes map with HTTP access and IAM permissions. Second, and more important: this is where you build the **instance profile** that makes the "no access keys anywhere" claim true.

When you finish, `backend/app/db/storage.py` will be able to create a boto3 S3 client with **no credentials passed in at all**, and it will just work. Understanding *why* is the point of the phase.

---

## Concepts you need

**Bucket / object / key** — the bucket is a globally-unique namespace in one region; the object is the bytes; the key is the full path-like name. There are no real folders. The `/` in `resumes/user123/abc_cv.pdf` is just part of the string.

**Private by default + presigned URLs** — keep Block Public Access **ON**. To let a browser read a private object, generate a **presigned URL**: a time-limited signed link that embeds the permission. You never make the bucket public.

**Lifecycle rules** — auto-delete or archive objects by age and prefix. This app writes temp audio to `transcribe_temp/` and deletes it in a `finally` block; the lifecycle rule is the backstop for when that cleanup fails.

**Instance profile** — the wrapper that lets an EC2 instance automatically assume a role. This is the mechanism behind keyless access. boto3 walks a credential chain: explicit args → env vars → `~/.aws/credentials` → **instance metadata**. On EC2 it lands on the last one and gets temporary, auto-rotating credentials.

**Trust policy vs permission policy** — a role has both. The **trust policy** says *who may assume it* (here: the EC2 service). The **permission policy** says *what it can do once assumed*. When `AssumeRole` fails, it is always the trust policy.

---

## Steps

```bash
source ~/amplify-env.sh
# plus, from Phase 2:
export VPC_ID=... SG_WEB=... SG_DB=... SUBNET_A=... SUBNET_B=...
```

### 3.1 — Create the uploads bucket

Bucket names are **globally unique across all of AWS**, so suffix with your account ID.

**UI:** S3 → *Create bucket* → name `amplify-interview-uploads-<account-id>` → `us-east-1` → **Block all public access = ON** → ACLs disabled → Create.

**CLI:**
```bash
export BUCKET=$PROJECT-uploads-$ACCOUNT_ID
aws s3api create-bucket --bucket $BUCKET --region $AWS_REGION

aws s3api put-public-access-block --bucket $BUCKET \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "BUCKET=$BUCKET"
```

> `us-east-1` needs **no** `LocationConstraint`. Any other region requires `--create-bucket-configuration LocationConstraint=$AWS_REGION`. This trips up everyone once.

### 3.2 — Lifecycle rule for temp transcription audio

`backend/app/routers/speech.py` uploads audio to `transcribe_temp/{job_id}.webm`, hands the S3 URI to Transcribe, then deletes it. If the request dies mid-flight, the object leaks. This rule sweeps it up.

```bash
aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET \
  --lifecycle-configuration '{"Rules":[{
    "ID":"expire-transcribe-temp","Status":"Enabled",
    "Filter":{"Prefix":"transcribe_temp/"},
    "Expiration":{"Days":1}}]}'
```

### 3.3 — Create the role with a scoped policy

Write the S3 policy **by hand**, scoped to this one bucket. Reaching for `AmazonS3FullAccess` here would skip the entire lesson.

```bash
# Trust policy — who may assume this role
cat > /tmp/ec2-trust.json <<'EOF'
{ "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF

aws iam create-role --role-name amplify-interview-ec2-role \
  --assume-role-policy-document file:///tmp/ec2-trust.json

# Permission policy — scoped to this bucket only
cat > /tmp/s3-policy.json <<EOF
{ "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow",
    "Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
    "Resource":["arn:aws:s3:::$BUCKET","arn:aws:s3:::$BUCKET/*"]}]}
EOF

aws iam put-role-policy --role-name amplify-interview-ec2-role \
  --policy-name amplify-s3 --policy-document file:///tmp/s3-policy.json
```

Note the **two** ARNs. `arn:aws:s3:::$BUCKET` is the bucket itself — needed for `ListBucket`. `arn:aws:s3:::$BUCKET/*` is the objects inside it — needed for `GetObject`/`PutObject`. Bucket-level and object-level actions take different resources, and omitting one is the most common S3 policy bug.

### 3.4 — Attach the managed policies the app needs

```bash
# Speech-to-text (routers/speech.py)
aws iam attach-role-policy --role-name amplify-interview-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonTranscribeFullAccess

# Session Manager + deploys via SSM run-command (Phase 9)
aws iam attach-role-policy --role-name amplify-interview-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Read config/secrets from Parameter Store (Phase 6)
aws iam attach-role-policy --role-name amplify-interview-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess
```

### 3.5 — Create the instance profile

A role cannot attach to an instance directly. The instance profile is the container that makes it possible — and the console hides this step, which is why doing it on the CLI is worth it.

```bash
aws iam create-instance-profile --instance-profile-name amplify-interview-ec2-role
aws iam add-role-to-instance-profile \
  --instance-profile-name amplify-interview-ec2-role \
  --role-name amplify-interview-ec2-role
```

### 3.6 — Test the bucket

```bash
echo "hello" > /tmp/test.txt
aws s3 cp /tmp/test.txt s3://$BUCKET/test.txt
aws s3 ls s3://$BUCKET

# Presigned URL — open it in a browser, it works; strip the query string, it 403s
aws s3 presign s3://$BUCKET/test.txt --expires-in 300

aws s3 rm s3://$BUCKET/test.txt
```

Do open both versions of that URL. Seeing the signed one succeed and the bare one fail is the presigned-URL concept in ten seconds.

---

## ✅ Checkpoints

- [ ] `aws s3 ls s3://$BUCKET` succeeds and the console shows *Block all public access: On*.
- [ ] The presigned URL loads in a browser; the same URL without its query string returns `AccessDenied`.
- [ ] `aws iam get-role --role-name amplify-interview-ec2-role` shows a trust policy naming `ec2.amazonaws.com`.
- [ ] `aws iam list-attached-role-policies --role-name amplify-interview-ec2-role` shows Transcribe + the two SSM policies.
- [ ] `aws iam get-instance-profile --instance-profile-name amplify-interview-ec2-role` shows the role inside it.

---

## 🧠 You understand this when you can answer, without notes

1. Why does the S3 policy need both `arn:...:bucket` and `arn:...:bucket/*`?
2. A presigned URL grants access without changing bucket permissions. What is actually in the URL that makes it work, and what happens when it expires?
3. `storage.py` creates a boto3 client with no credentials. On EC2, where do they come from? On your laptop, where do they come from instead?
4. What is the difference between the role and the instance profile, and why do both exist?

---

## 🔧 Troubleshooting

**`BucketAlreadyExists`** — the name is taken globally. Add a suffix.

**`IllegalLocationConstraintException`** — you passed `LocationConstraint` in `us-east-1`. Drop it.

**`EntityAlreadyExists` on the instance profile** — you ran the command twice. Harmless; verify with `get-instance-profile` and move on.

**Presigned URL 403s immediately** — your CLI credentials lack `s3:GetObject`, or the URL already expired. Presigned URLs inherit the permissions of whoever signed them.

---

## 📝 Record in `aws-ids.txt`

```
BUCKET=
EC2_ROLE=amplify-interview-ec2-role
```

---

**Next:** [Phase 4 — Cognito](PHASE_04_cognito.md)
