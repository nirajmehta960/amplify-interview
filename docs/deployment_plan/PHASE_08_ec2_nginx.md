# Phase 8 — EC2, Nginx, TLS — and the First Live Deploy

**Goal:** the API running publicly at `https://api.<yourdomain>` with a real certificate, backed by RDS.
**Time:** ~3 hours
**Prerequisites:** Phases 1–7; a domain you control (for TLS)
**Cost impact:** ~$8/month (t3.micro; free tier covers 750 h/month for the first year)
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §5 (Docker deploy) and §6 (Nginx + TLS)

---

## Why this phase exists

This is the phase where everything you built connects. The instance profile from Phase 3 gets used, the security group from Phase 2 gets exercised, the RDS instance from Phase 6 finally gets its schema, and the image from Phase 7 actually runs.

By the end you have a public HTTPS URL. Everything after this makes it maintainable rather than possible.

---

## Concepts you need

**Instance profile in action** — the box holds **no credentials**. boto3 reads temporary ones from the instance metadata service, and AWS rotates them automatically. When `aws s3 ls` works on the box without you ever running `aws configure`, that is Phase 3 paying off.

**Reverse proxy** — Nginx owns ports 80/443. The app binds to `127.0.0.1:8080` and is unreachable from outside. Nginx handles TLS, sets forwarding headers, and can serve maintenance pages when the app is down.

**Why bind to `127.0.0.1:8080` and not `0.0.0.0:8080`** — publishing on `0.0.0.0` makes the container reachable directly on the instance's public IP, bypassing Nginx and TLS entirely. The security group would still block port 8080, but defence in depth means not relying on a single control.

**Let's Encrypt / ACME** — Certbot proves you control the domain by serving a challenge file over HTTP, then receives a 90-day certificate and installs a renewal timer. This is why the DNS A-record must exist *before* you run Certbot.

**User data** — a script that runs once on first boot, as root. Good for installing packages; not a deployment mechanism.

---

## Steps

```bash
source ~/amplify-env.sh
export SG_WEB=... SUBNET_A=... ECR=... DB_HOST=...
```

### 8.1 — Launch the instance

```bash
export AMI=$(aws ssm get-parameter \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query "Parameter.Value" --output text)

aws ec2 create-key-pair --key-name amplify-key \
  --query KeyMaterial --output text > ~/amplify-key.pem && chmod 400 ~/amplify-key.pem

cat > /tmp/userdata.sh <<'EOF'
#!/bin/bash
dnf update -y
dnf install -y docker nginx certbot python3-certbot-nginx
systemctl enable --now docker nginx
usermod -aG docker ec2-user
EOF

export EC2_ID=$(aws ec2 run-instances --image-id $AMI --instance-type t3.micro \
  --key-name amplify-key --security-group-ids $SG_WEB --subnet-id $SUBNET_A \
  --associate-public-ip-address \
  --iam-instance-profile Name=amplify-interview-ec2-role \
  --user-data file:///tmp/userdata.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=amplify-api}]' \
  --query "Instances[0].InstanceId" --output text)

aws ec2 wait instance-running --instance-ids $EC2_ID
```

The `Name=amplify-api` tag is not cosmetic — Phase 9's deploy targets the instance **by tag**, so it must match exactly.

### 8.2 — Elastic IP

A default public IP changes every time the instance stops. An Elastic IP is stable, which is what DNS needs.

```bash
export EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
aws ec2 associate-address --instance-id $EC2_ID --allocation-id $EIP_ALLOC
export EC2_IP=$(aws ec2 describe-addresses --allocation-ids $EIP_ALLOC \
  --query "Addresses[0].PublicIp" --output text)
echo "EC2_IP=$EC2_IP"
```

> An Elastic IP is free **while attached to a running instance** and billed (~$3.60/mo) while unattached. If you terminate the instance, release the address too.

### 8.3 — DNS

At your registrar, create an **A record**: `api.yourdomain.com` → `$EC2_IP`. Verify before continuing — Certbot will fail without it:

```bash
dig +short api.yourdomain.com     # must return $EC2_IP
```

DNS propagation is usually seconds, occasionally an hour.

### 8.4 — Verify the instance role

SSH in and confirm the keyless-credentials claim:

```bash
ssh -i ~/amplify-key.pem ec2-user@$EC2_IP
```
```bash
aws sts get-caller-identity     # shows assumed-role/amplify-interview-ec2-role — NOT a user
aws s3 ls s3://<your-bucket>    # works, with no aws configure ever run
docker --version && systemctl status nginx --no-pager
```

Pause on that. There are no credentials on this machine, and it can still reach exactly the resources you scoped in Phase 3 — and nothing else.

### 8.5 — Pull config and run migrations

Still on the box:

```bash
# Config from SSM → env file
aws ssm get-parameters-by-path --path /amplify/prod --with-decryption --region us-east-1 \
  --query "Parameters[*].[Name,Value]" --output text \
  | sed 's#/amplify/prod/##' | awk '{print $1"="$2}' > ~/amplify.env
chmod 600 ~/amplify.env
grep -c = ~/amplify.env          # expect 9

# ECR login + pull
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
IMAGE=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/amplify-interview-backend:latest
docker pull $IMAGE
```

**Now the moment this whole sequence was building toward** — the first machine that can legally reach RDS creates the schema:

```bash
docker run --rm --env-file ~/amplify.env $IMAGE alembic upgrade head
```

That command traverses the entire security model: the container reads `DATABASE_URL` from SSM-sourced config, connects out through `sg-ec2-web`, and is admitted by `sg-rds-db` **because of the source-security-group rule you wrote in Phase 2**. If it succeeds, your networking is correct.

### 8.6 — Start the API

```bash
docker rm -f amplify-api 2>/dev/null || true
docker run -d --name amplify-api --restart unless-stopped \
  -p 127.0.0.1:8080:8080 --env-file ~/amplify.env $IMAGE

curl http://127.0.0.1:8080/health
docker logs amplify-api --tail 50
```

`--restart unless-stopped` means the container comes back after a reboot or a crash.

### 8.7 — Nginx

Create `/etc/nginx/conf.d/amplify.conf`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 12M;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }
}
```

Two settings are specific to this app and both cause real bugs if omitted:

- **`proxy_read_timeout 90s`.** `routers/speech.py` polls AWS Transcribe every 0.5s for **up to 60 seconds** inside the request handler. Nginx's default `proxy_read_timeout` is *also* 60s, so a slow transcription gets killed by the proxy just before the app answers — producing an intermittent 504 that is miserable to diagnose. (Stage 2 fixes this properly by moving transcription to SQS.)
- **`client_max_body_size 12M`.** The app accepts résumé uploads up to 10 MB (`max_resume_size_mb`), but Nginx's default cap is **1 MB** — larger uploads fail with a 413 that never reaches the app.

```bash
sudo nginx -t && sudo systemctl reload nginx
curl http://api.yourdomain.com/health      # HTTP works now
```

### 8.8 — TLS

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot edits your config in place to add the 443 server block, the certificate paths, and an HTTP→HTTPS redirect. Read the diff afterwards — it is a good lesson in what a TLS vhost actually needs.

```bash
curl https://api.yourdomain.com/health
sudo systemctl list-timers | grep certbot     # auto-renewal is installed
sudo certbot renew --dry-run
```

### 8.9 — End-to-end check

Point the frontend at the live API and run a real interview:

```bash
VITE_API_URL=https://api.yourdomain.com \
VITE_AWS_REGION=us-east-1 \
VITE_AWS_COGNITO_CLIENT_ID=<CLIENT_ID> \
  npm run dev
```

Sign up with a real Cognito user, upload a résumé, complete an interview, confirm feedback renders. Then verify the data actually landed — via the SSM tunnel from Phase 6 §6.5:

```bash
aws ssm start-session --target $EC2_ID \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"$DB_HOST\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"5433\"]}"
```
```bash
psql -h localhost -p 5433 -U amplify_admin -d amplify_interview \
  -c "SELECT id, status, created_at FROM sessions ORDER BY created_at DESC LIMIT 5;"
```

Seeing your own interview as a row in a private database you reached through a tunnel is the moment the whole architecture clicks.

---

## ✅ Checkpoints

- [ ] `aws sts get-caller-identity` on the box shows an **assumed role**, not a user.
- [ ] `aws s3 ls` works on the box with no configured credentials.
- [ ] `alembic upgrade head` succeeded against RDS — this proves the SG-to-SG rule.
- [ ] `curl https://api.yourdomain.com/health` returns healthy with a valid certificate.
- [ ] `curl http://api.yourdomain.com/health` redirects to HTTPS.
- [ ] Port 8080 is **not** reachable from outside: `curl http://$EC2_IP:8080/health` fails.
- [ ] A full interview completes through the browser and appears as a row in `sessions`.
- [ ] `sudo certbot renew --dry-run` passes.

---

## 🧠 You understand this when you can answer, without notes

1. Trace one `POST /api/interview/session/{id}/message` from browser to database and back, naming every hop.
2. The box has no credentials but can write to S3. How, exactly?
3. Why bind the container to `127.0.0.1:8080` rather than `0.0.0.0:8080`?
4. Why must the DNS A-record exist before running Certbot?
5. Why does `proxy_read_timeout` need raising for this specific application?
6. Why is an Elastic IP necessary at all?

---

## 🔧 Troubleshooting

**SSH times out** — your IP changed. Re-authorize port 22 in `sg-ec2-web` for your current `/32`.

**`docker: permission denied`** — the `usermod -aG docker` from user-data needs a fresh login. Log out and back in.

**`alembic upgrade head` hangs** — the SG-to-SG rule is wrong. Check `sg-rds-db` inbound source is `sg-ec2-web` (Phase 2 §2.3), and that the instance actually carries `sg-ec2-web`.

**Container exits immediately** — `docker logs amplify-api`. Usually a missing env var; confirm `~/amplify.env` has all 9 lines and no blanks from a failed SSM fetch.

**`~/amplify.env` values look truncated** — a parameter value contains whitespace, which breaks the `awk` split. Quote it or set that parameter without spaces.

**Certbot: "challenge failed"** — DNS isn't pointing at `$EC2_IP` yet, or port 80 is blocked. `dig +short api.yourdomain.com` must return your Elastic IP.

**502 Bad Gateway** — Nginx is up, the app is not. `docker ps` and `curl http://127.0.0.1:8080/health` on the box.

**504 after ~60s on transcription** — you skipped `proxy_read_timeout 90s`.

**413 on résumé upload** — you skipped `client_max_body_size 12M`.

---

## 💰 Stop it when idle

```bash
aws ec2 stop-instances --instance-ids $EC2_ID
aws rds stop-db-instance --db-instance-identifier amplify-interview-db
```
The Elastic IP stays attached and free. On restart, the container comes back automatically via `--restart unless-stopped`.

---

## 📝 Record in `aws-ids.txt`

```
EC2_ID=
EC2_IP=
EIP_ALLOC=
API_DOMAIN=api.yourdomain.com
```

---

**Next:** [Phase 9 — CI/CD with GitHub Actions](PHASE_09_cicd.md)
