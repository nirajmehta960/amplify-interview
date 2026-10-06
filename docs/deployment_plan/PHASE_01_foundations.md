# Phase 1 — Foundations: IAM, CLI, and a Billing Alarm

**Goal:** an admin identity that is not root, a working CLI, and a cost alarm — before a single billable resource exists.
**Time:** ~45 minutes
**Prerequisites:** an AWS account
**Cost impact:** $0
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §1 (IAM)

---

## Why this phase exists

Every single thing you do in AWS is an API call, and IAM answers one question for every one of them: *is this principal allowed to do this action on this resource?* Get the identity model right now and the other ten phases are downhill. Retrofit it later and you will be unpicking permissions for days.

The billing alarm comes first for a blunt reason: it is the only thing standing between a misconfigured resource and a surprise invoice.

---

## Concepts you need

**Principal** — *who* is acting. An IAM user, an IAM role, or an AWS service.

**Policy** — a JSON document: `Effect` (Allow/Deny), `Action` (`s3:PutObject`), `Resource` (an ARN), optional `Condition`. Default is implicit deny. **Deny always wins.**

**User vs role — the distinction that matters most:**
- A **user** has long-lived credentials (password, access keys). For humans.
- A **role** has *no* permanent credentials. A principal **assumes** it and gets **temporary** credentials. For machines and services.

You will create exactly one user (yourself) in this phase. Every other identity in this project is a role.

**ARN** — the globally unique name of a resource: `arn:aws:s3:::amplify-interview-uploads/*`. You will write these constantly.

---

## Steps

### 1.1 — Lock down root

**UI:** Sign in as root → account menu → *Security credentials* → enable **MFA** (authenticator app).

Then stop using root. It is for billing settings and closing the account, nothing else.

### 1.2 — Create your admin user

**UI:** IAM → *Users* → *Create user* → name `niraj-admin` → *Provide user access to the AWS Management Console* → set a password.
Permissions → *Attach policies directly* → **`AdministratorAccess`**.
Then the user → *Security credentials* → **enable MFA** → *Create access key* → **Command Line Interface** → save the key pair.

> `AdministratorAccess` on your own user is fine — you are the account owner. The least-privilege discipline in this project applies to the **machine** roles (Phase 3), which are the ones an attacker can actually reach.

### 1.3 — Configure the CLI

```bash
aws configure
# AWS Access Key ID:     <from step 1.2>
# AWS Secret Access Key: <from step 1.2>
# Default region name:   us-east-1
# Default output format: json
```

Set up the shell block you will reuse in every phase. Save it as `~/amplify-env.sh` and `source` it in new terminals:

```bash
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export PROJECT=amplify-interview
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $ACCOUNT_ID  Region: $AWS_REGION"
```

### 1.4 — Billing alarm at $5

Billing metrics only exist in **us-east-1**, which is one reason this project pins that region.

**UI:** Billing → *Billing preferences* → enable **Receive CloudWatch billing alerts** (this can take ~24h to start emitting data).
Then CloudWatch → *Alarms* → *Create alarm* → *Billing* → `EstimatedCharges` → threshold **$5** → create an SNS topic `amplify-billing-alerts` → confirm the subscription email.

**CLI** (after creating and confirming the SNS topic):
```bash
export TOPIC_ARN=$(aws sns create-topic --name amplify-billing-alerts --query TopicArn --output text)
aws sns subscribe --topic-arn $TOPIC_ARN --protocol email --notification-endpoint you@example.com
# → confirm the link in your inbox before continuing

aws cloudwatch put-metric-alarm \
  --alarm-name amplify-billing-over-5usd \
  --namespace AWS/Billing --metric-name EstimatedCharges \
  --dimensions Name=Currency,Value=USD \
  --statistic Maximum --period 21600 --evaluation-periods 1 \
  --threshold 5 --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN
```

### 1.5 — Read a policy out loud

Not optional — this is the skill the phase exists to build.

```bash
aws iam get-policy-version \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess \
  --version-id $(aws iam get-policy --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess \
      --query 'Policy.DefaultVersionId' --output text)
```

Read the JSON and say, in a sentence, what it permits and on which resources.

---

## ✅ Checkpoints

- [ ] `aws sts get-caller-identity` returns an ARN ending in `user/niraj-admin` — **not** `:root`.
- [ ] Root has MFA enabled and you are not signed in as root.
- [ ] `echo $ACCOUNT_ID` prints 12 digits after sourcing your env file.
- [ ] The billing alarm exists: `aws cloudwatch describe-alarms --alarm-names amplify-billing-over-5usd` returns it.
- [ ] You confirmed the SNS subscription email.

---

## 🧠 You understand this when you can answer, without notes

1. Why is an EC2 role safer than putting access keys in a `.env` on the box?
2. What does "temporary credentials" mean, and who issues them?
3. Given `arn:aws:s3:::amplify-interview-uploads/*`, what exactly does the `/*` change versus leaving it off?
4. If an `AssumeRole` call fails, is the problem in the trust policy or the permission policy?

---

## 🔧 Troubleshooting

**`aws sts get-caller-identity` → `InvalidClientTokenId`** — the access key was mistyped or deactivated. Re-run `aws configure`.

**Billing metrics show no data** — expect up to 24 hours after enabling billing alerts. The alarm sits in `INSUFFICIENT_DATA` until then; that is normal, not broken.

**Alarm can't find the metric** — you are not in `us-east-1`. Billing metrics exist only there.

---

## 📝 Record in `aws-ids.txt`

```
ACCOUNT_ID=
TOPIC_ARN=
```

---

**Next:** [Phase 2 — Networking](PHASE_02_networking.md)
