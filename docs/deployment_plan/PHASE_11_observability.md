# Phase 11 — Observability with CloudWatch

**Goal:** find out something is broken from an alarm, not from a user — and be able to answer *why* from the logs.
**Time:** ~2 hours
**Prerequisites:** Phases 1–10
**Cost impact:** ~$2/month (5 GB logs free; alarms $0.10 each above 10)
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §9 (CloudWatch)

---

## Why this phase exists

Right now, diagnosing a problem means SSH-ing to the box and running `docker logs`. If the container restarted, those logs are gone. If the instance is unhealthy, you may not be able to get in at all.

This phase is also where the deployment stops being a demo. The difference between "it works" and "I operate it" is knowing when it breaks without being told.

---

## Concepts you need

**Logs vs metrics** — metrics are numeric time series, cheap to store and alarm on ("CPU is 90%"). Logs are text, expensive at volume, and tell you *why*. You alarm on metrics and investigate with logs.

**Log group / stream** — a group is a named bucket of logs (`/amplify/api`) with a retention policy; a stream is one source within it. **Default retention is "never expire"**, which quietly costs money forever. Always set it.

**Metric filter** — turns a log pattern into a metric, letting you alarm on things AWS doesn't measure ("more than 5 ERROR lines in 5 minutes").

**Alarm states** — `OK`, `ALARM`, and `INSUFFICIENT_DATA`. The third is not a failure; it means no data arrived. New alarms sit there until data flows.

**The awslogs driver** — Docker ships container stdout/stderr straight to CloudWatch. Simpler than installing the CloudWatch agent for logs, and it survives container restarts.

---

## Steps

```bash
source ~/amplify-env.sh
export EC2_ID=... TOPIC_ARN=...      # SNS topic from Phase 1
```

### 11.1 — Log group with retention

```bash
aws logs create-log-group --log-group-name /amplify/api
aws logs put-retention-policy --log-group-name /amplify/api --retention-in-days 14
```

Fourteen days is plenty for a learning project and keeps you inside the free tier.

### 11.2 — Ship container logs

Add the log driver to the `docker run` command. On the box:

```bash
docker rm -f amplify-api
docker run -d --name amplify-api --restart unless-stopped \
  -p 127.0.0.1:8080:8080 --env-file ~/amplify.env \
  --log-driver=awslogs \
  --log-opt awslogs-region=us-east-1 \
  --log-opt awslogs-group=/amplify/api \
  --log-opt awslogs-stream=api \
  <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/amplify-interview-backend:latest
```

**Update the Phase 9 workflow's SSM command to include these flags**, or your next CI deploy silently reverts to local-only logging. This is the easiest thing in the phase to forget.

The instance role needs to write logs. Phase 3's `AmazonSSMManagedInstanceCore` includes `logs:CreateLogStream` and `logs:PutLogEvents`, so this should work already — verify in 11.3 rather than assuming.

```bash
aws logs tail /amplify/api --follow      # from your laptop
```

### 11.3 — Verify, then alarm on errors

```bash
curl https://api.yourdomain.com/health
aws logs tail /amplify/api --since 5m
```

Now create a metric filter on `ERROR` lines. The app's logging format is `%(asctime)s [%(levelname)s] %(name)s: %(message)s`, so `[ERROR]` is the reliable pattern:

```bash
aws logs put-metric-filter \
  --log-group-name /amplify/api \
  --filter-name api-errors \
  --filter-pattern '"[ERROR]"' \
  --metric-transformations \
    metricName=ApiErrorCount,metricNamespace=Amplify,metricValue=1,defaultValue=0

aws cloudwatch put-metric-alarm \
  --alarm-name amplify-api-errors \
  --namespace Amplify --metric-name ApiErrorCount \
  --statistic Sum --period 300 --evaluation-periods 1 \
  --threshold 5 --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN --treat-missing-data notBreaching
```

`--treat-missing-data notBreaching` matters: without it, quiet periods with no logs flip the alarm to `INSUFFICIENT_DATA` and you learn to ignore it.

Test it for real — hit a route that throws, or `docker stop` the container and curl the API a few times. **An alarm you have never seen fire is an alarm you don't know works.**

### 11.4 — Instance and database alarms

```bash
# EC2 status check — covers hardware/OS failure
aws cloudwatch put-metric-alarm --alarm-name amplify-ec2-status \
  --namespace AWS/EC2 --metric-name StatusCheckFailed \
  --dimensions Name=InstanceId,Value=$EC2_ID \
  --statistic Maximum --period 60 --evaluation-periods 2 \
  --threshold 0 --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN

# RDS free storage under 2 GB
aws cloudwatch put-metric-alarm --alarm-name amplify-rds-storage \
  --namespace AWS/RDS --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=amplify-interview-db \
  --statistic Average --period 300 --evaluation-periods 1 \
  --threshold 2000000000 --comparison-operator LessThanThreshold \
  --alarm-actions $TOPIC_ARN

# RDS connection count — catches the pool leak Phase 5 warned about
aws cloudwatch put-metric-alarm --alarm-name amplify-rds-connections \
  --namespace AWS/RDS --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=amplify-interview-db \
  --statistic Average --period 300 --evaluation-periods 2 \
  --threshold 50 --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN
```

That last one is the direct sensor for the long-open-transaction failure mode from Phase 5 §5.4. If connections climb steadily and never fall, transactions are being held across the OpenAI calls.

### 11.5 — A dashboard

CloudWatch → *Dashboards* → *Create* → `amplify-interview`. Add:
- EC2 `CPUUtilization` and `NetworkIn`
- RDS `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`
- `Amplify/ApiErrorCount`
- A **Logs table** widget over `/amplify/api` filtered to `[ERROR]`

One screen that answers "is it healthy?" is worth more than a dozen alarms you never look at.

### 11.6 — Learn Logs Insights

This is the highest-leverage skill in the phase. CloudWatch → *Logs Insights* → select `/amplify/api`:

```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

```
fields @timestamp, @message
| filter @message like /Unhandled error/
| stats count() by bin(1h)
```

The second one shows error rate over time, which is usually the first question you actually have during an incident.

---

## ✅ Checkpoints

- [ ] `aws logs tail /amplify/api --follow` streams live requests.
- [ ] Retention on `/amplify/api` is 14 days, not "never expire".
- [ ] The Phase 9 workflow includes the awslogs flags, so CI deploys keep logging.
- [ ] You **triggered the error alarm on purpose** and received the email.
- [ ] All four alarms exist and are in `OK` (not `INSUFFICIENT_DATA`).
- [ ] The dashboard shows live data.
- [ ] You can answer "how many errors in the last hour?" with a Logs Insights query.

---

## 🧠 You understand this when you can answer, without notes

1. When do you reach for a metric, and when for a log?
2. What does `INSUFFICIENT_DATA` mean, and why is `treat-missing-data notBreaching` usually right?
3. Rising `DatabaseConnections` that never falls — what's the likely cause in *this* app?
4. Why does the awslogs driver beat SSH-ing in to run `docker logs`?
5. Why must log retention be set explicitly?

---

## 🔧 Troubleshooting

**No logs appear** — the container isn't using the awslogs driver (`docker inspect amplify-api --format '{{.HostConfig.LogConfig.Type}}'`), or the instance role lacks `logs:PutLogEvents`.

**`docker logs amplify-api` is now empty** — expected. With the awslogs driver, logs go to CloudWatch instead of local storage. Use `aws logs tail`.

**Metric filter never matches** — patterns are literal and case-sensitive. Quote it as `'"[ERROR]"'` so the brackets aren't interpreted.

**Alarm stuck in `INSUFFICIENT_DATA`** — no data has arrived in an evaluation period. Generate traffic, or set `--treat-missing-data notBreaching`.

**No email** — the SNS subscription from Phase 1 was never confirmed. `aws sns list-subscriptions-by-topic --topic-arn $TOPIC_ARN` shows `PendingConfirmation`.

---

## 🎉 Stage 1 complete

You now have:

- A React app on CloudFront, backed by a private S3 bucket
- A FastAPI backend on EC2 behind Nginx with automatic TLS
- PostgreSQL on RDS, unreachable from the internet
- Cognito auth with JWTs verified against JWKS
- Zero long-lived credentials anywhere — instance profile on the box, OIDC in CI
- Push-to-deploy with a test gate and automatic migrations
- Logs, metrics, alarms, and a dashboard

**The capstone:** narrate one `POST /api/interview/session/{id}/message` from browser to database and back, naming every hop and every security control it passes through. If you can do that without notes, Stage 1 did its job.

---

## Stage 2 — where to go next

Full detail in `DEPLOYMENT_AWS.md`. Roughly in order of value:

| Change | Replaces | What you learn |
|---|---|---|
| **Terraform** for the whole stack | Console click-ops | Reproducible infra, state, modules, plan/apply |
| **SQS + worker** for transcription | The 60s in-request Transcribe poll (Phase 8 §8.7) | Async decoupling, queues, retries |
| **App Runner / ECS Fargate** | EC2 + Nginx + manual Docker | Managed containers, autoscaling, zero-downtime deploys |
| **ElastiCache (Redis)** | — | Caching LLM results, shared rate-limit counters |
| **Secrets Manager** | SSM SecureString | Automatic credential rotation |
| **RDS Proxy** | Direct DB connections | Connection pooling for containers |
| **SES + WAF** | Cognito default email; no WAF | Deliverability, edge security |

Two things from Stage 1 are worth revisiting first, because they are known limitations rather than new features:

1. **`middleware/rate_limit.py` uses in-memory storage** (`memory://`) — it does not work correctly across multiple workers or instances. Redis fixes it.
2. **`routers/speech.py` blocks a request for up to 60 seconds.** SQS + a worker is the real fix; the Nginx timeout bump in Phase 8 is a workaround.

---

**Back to:** [the phase index](README.md)
