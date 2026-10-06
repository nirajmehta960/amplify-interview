# AWS Setup Runbook — Stage 1 (UI + CLI)

Hands-on, do-it-now steps to provision the Stage 1 infrastructure for **Amplify Interview**.
Each step gives the **console (UI)** clicks and the **equivalent AWS CLI** command, plus a **✅ Checkpoint** to verify before moving on.

- **Companion docs:** `DEPLOYMENT_AWS.md` (the plan/why-this-shape) · `CLOUD_LEARNING_OBJECTIVES.md` (the concepts).
- **Region:** everything is `us-east-1`. Don't mix regions.
- **You have ~$100 credits**, so you're not tightly Free-Tier-bound, but still **stop/delete** when idle and keep the $5 billing alarm on.
- **Order matters:** identity/network first → storage/db → compute → app config → auth. Do it top to bottom.

> **Legend:** `<LIKE_THIS>` = a value you paste in. Commands that produce an ID are followed by how to capture it.
> Keep a scratch file (`aws-ids.txt`) and paste every ID you create there — you'll reuse them constantly.

---

## Step 0 — Shell setup (run once)

Set variables you'll reuse. Re-run this block whenever you open a new terminal (or save it to a file and `source` it).

```bash
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export PROJECT=amplify-interview
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $ACCOUNT_ID  Region: $AWS_REGION"
```

**✅ Checkpoint:** `aws sts get-caller-identity` shows your `niraj-admin` user ARN (not `:root`).

---

## Step 1 — Networking (VPC + Security Groups)

We'll use your **default VPC** for speed, and enforce isolation with **security groups** (the control that actually matters). Sidebar below shows the stronger custom-VPC path.

### 1a. Find the default VPC + subnets

**UI:** VPC console → *Your VPCs* → note the one marked *Default*. → *Subnets* → note two subnets in **different AZs**.

**CLI:**
```bash
export VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query "Vpcs[0].VpcId" --output text)
echo "VPC_ID=$VPC_ID"

# Grab two subnet IDs in different AZs (needed for the RDS subnet group)
aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID \
  --query "Subnets[].{ID:SubnetId,AZ:AvailabilityZone}" --output table
# Save two of them:
export SUBNET_A=<subnet-in-az-a>
export SUBNET_B=<subnet-in-az-b>
```

### 1b. Create the two security groups (the core lesson)

**UI:** VPC → *Security groups* → *Create security group* (do this twice):
- **`sg-ec2-web`** — Inbound: `HTTP 80` from `0.0.0.0/0`, `HTTPS 443` from `0.0.0.0/0`, `SSH 22` from **My IP**. Outbound: leave default (all).
- **`sg-rds-db`** — Inbound: `PostgreSQL 5432` with **Source = `sg-ec2-web`** (search the SG, not an IP). Outbound: default.

**CLI:**
```bash
# EC2 web SG
export SG_WEB=$(aws ec2 create-security-group --group-name sg-ec2-web \
  --description "Amplify EC2 web" --vpc-id $VPC_ID --query GroupId --output text)

MY_IP=$(curl -s https://checkip.amazonaws.com)/32
aws ec2 authorize-security-group-ingress --group-id $SG_WEB --protocol tcp --port 80  --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_WEB --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_WEB --protocol tcp --port 22  --cidr $MY_IP

# RDS SG — allow 5432 ONLY from the web SG (SG-to-SG reference)
export SG_DB=$(aws ec2 create-security-group --group-name sg-rds-db \
  --description "Amplify RDS db" --vpc-id $VPC_ID --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $SG_DB \
  --protocol tcp --port 5432 --source-group $SG_WEB

echo "SG_WEB=$SG_WEB  SG_DB=$SG_DB"
```

**✅ Checkpoint:** `sg-rds-db` has an inbound rule whose **source is `sg-ec2-web`**, not a CIDR. That's what keeps the DB off the internet.

> **Sidebar — stronger isolation (do later):** create a *custom* VPC with real **private subnets** for RDS + a NAT gateway. It's the better fundamentals lesson (`CLOUD_LEARNING_OBJECTIVES.md` §2) but adds cost/complexity. The SG-to-SG rule above is the essential control either way.

---

## Step 2 — S3 bucket (uploads)

**UI:** S3 → *Create bucket* → Name `amplify-interview-uploads-<something-unique>` → Region `us-east-1` → **Block all public access = ON** → ACLs disabled → Create.

**CLI:**
```bash
# Bucket names are GLOBALLY unique — add a suffix if taken.
export BUCKET=$PROJECT-uploads-$ACCOUNT_ID
aws s3api create-bucket --bucket $BUCKET --region $AWS_REGION
aws s3api put-public-access-block --bucket $BUCKET \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Lifecycle: auto-delete temp transcription files after 1 day
aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET \
  --lifecycle-configuration '{"Rules":[{"ID":"expire-transcribe-temp","Status":"Enabled","Filter":{"Prefix":"transcribe_temp/"},"Expiration":{"Days":1}}]}'
echo "BUCKET=$BUCKET"
```

**✅ Checkpoint:** `aws s3 ls s3://$BUCKET` succeeds (empty), and the console shows *Block all public access: On*.

> Note: `us-east-1` needs **no** `LocationConstraint`. In any other region add `--create-bucket-configuration LocationConstraint=$AWS_REGION`.

---

## Step 3 — IAM role for EC2 (no keys on the box)

The EC2 instance will assume this role to reach S3, Transcribe, and SSM — no access keys anywhere.

**UI:** IAM → *Roles* → *Create role* → Trusted entity **AWS service → EC2** → attach policies → name `amplify-interview-ec2-role`.

**CLI:**
```bash
# Trust policy: EC2 may assume this role
cat > /tmp/ec2-trust.json <<'EOF'
{ "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF
aws iam create-role --role-name amplify-interview-ec2-role \
  --assume-role-policy-document file:///tmp/ec2-trust.json

# Scoped S3 policy (this bucket only)
cat > /tmp/s3-policy.json <<EOF
{ "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow",
    "Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
    "Resource":["arn:aws:s3:::$BUCKET","arn:aws:s3:::$BUCKET/*"]}]}
EOF
aws iam put-role-policy --role-name amplify-interview-ec2-role \
  --policy-name amplify-s3 --policy-document file:///tmp/s3-policy.json

# Transcribe + SSM (read config) + SSM managed instance core (for deploys/Session Manager)
aws iam attach-role-policy --role-name amplify-interview-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonTranscribeFullAccess
aws iam attach-role-policy --role-name amplify-interview-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam attach-role-policy --role-name amplify-interview-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess

# Instance profile (the wrapper EC2 actually attaches)
aws iam create-instance-profile --instance-profile-name amplify-interview-ec2-role
aws iam add-role-to-instance-profile \
  --instance-profile-name amplify-interview-ec2-role \
  --role-name amplify-interview-ec2-role
```

**✅ Checkpoint:** IAM → Roles → `amplify-interview-ec2-role` shows the S3 inline policy + the two SSM policies + Transcribe.

---

## Step 4 — Config & secrets in SSM Parameter Store

Store config centrally (SecureString for secrets) instead of a plaintext file on the box.

**UI:** Systems Manager → *Parameter Store* → *Create parameter* for each (Type **SecureString** for secrets).

**CLI:**
```bash
put()   { aws ssm put-parameter --name "$1" --value "$2" --type String        --overwrite >/dev/null; }
puts()  { aws ssm put-parameter --name "$1" --value "$2" --type SecureString --overwrite >/dev/null; }

put   /amplify/prod/AWS_S3_BUCKET            "$BUCKET"
put   /amplify/prod/AWS_REGION               "$AWS_REGION"
put   /amplify/prod/ALLOWED_ORIGINS          "https://app.yourdomain.com"
put   /amplify/prod/ENVIRONMENT              "production"
puts  /amplify/prod/OPENAI_API_KEY           "<your-openai-or-openrouter-key>"
puts  /amplify/prod/RESEND_API_KEY           "<your-resend-key>"
# DATABASE_URL + Cognito values filled in after Steps 5 and 8
```

**✅ Checkpoint:** `aws ssm get-parameters-by-path --path /amplify/prod --with-decryption --query "Parameters[].Name"` lists your keys.

---

## Step 5 — RDS PostgreSQL

**UI:** RDS → *Create database* → **Standard create → PostgreSQL** (v16) → Template **Free tier** (or Dev/Test) → Instance **db.t4g.micro**, 20 GB gp3 → Credentials: user `amplify_admin`, set a strong password → **Connectivity: Public access = No**, VPC security group = **`sg-rds-db`** → *Additional config* → **Initial database name `amplify_interview`** → Create.

**CLI:**
```bash
# DB subnet group across two AZs
aws rds create-db-subnet-group \
  --db-subnet-group-name amplify-db-subnets \
  --db-subnet-group-description "Amplify RDS subnets" \
  --subnet-ids $SUBNET_A $SUBNET_B

export DB_PASSWORD='<choose-a-strong-password>'
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

# Wait until available (a few minutes), then get the endpoint
aws rds wait db-instance-available --db-instance-identifier amplify-interview-db
export DB_HOST=$(aws rds describe-db-instances --db-instance-identifier amplify-interview-db \
  --query "DBInstances[0].Endpoint.Address" --output text)
echo "DB_HOST=$DB_HOST"

# Store the connection string as a secret (asyncpg driver, matches the backend)
puts /amplify/prod/DATABASE_URL \
  "postgresql+asyncpg://amplify_admin:$DB_PASSWORD@$DB_HOST:5432/amplify_interview"
```

**✅ Checkpoint:** RDS status = *Available*, **Publicly accessible = No**. From your laptop `psql -h $DB_HOST -U amplify_admin` should **fail/hang** (that's correct — only the EC2 SG can reach it).

---

## Step 6 — ECR repository (for the backend image)

**UI:** ECR → *Create repository* → Private → name `amplify-interview-backend`.

**CLI:**
```bash
aws ecr create-repository --repository-name $PROJECT-backend >/dev/null
export ECR=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT-backend
echo "ECR=$ECR"

# Build & push (needs the backend Dockerfile serving on :8080)
aws ecr get-login-password | docker login --username AWS --password-stdin \
  $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
docker build -t $PROJECT-backend ./backend
docker tag  $PROJECT-backend:latest $ECR:latest
docker push $ECR:latest
```

**✅ Checkpoint:** `aws ecr list-images --repository-name $PROJECT-backend` shows the pushed image.

---

## Step 7 — EC2 instance (Docker host)

**UI:** EC2 → *Launch instance* → AMI **Amazon Linux 2023** → **t3.micro** → Key pair (create/download) → Network: default VPC, **Auto-assign public IP = Enable**, SG = **`sg-ec2-web`** → *Advanced* → **IAM instance profile = `amplify-interview-ec2-role`** → paste the user-data below → Launch. Then allocate + associate an **Elastic IP**.

**User data (installs Docker + Nginx + Certbot on first boot):**
```bash
#!/bin/bash
dnf update -y
dnf install -y docker nginx certbot python3-certbot-nginx
systemctl enable --now docker nginx
usermod -aG docker ec2-user
```

**CLI:**
```bash
# Latest Amazon Linux 2023 AMI
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

# Elastic IP (stable address for DNS)
export EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
aws ec2 associate-address --instance-id $EC2_ID --allocation-id $EIP_ALLOC
export EC2_IP=$(aws ec2 describe-addresses --allocation-ids $EIP_ALLOC \
  --query "Addresses[0].PublicIp" --output text)
echo "EC2_IP=$EC2_IP  (point api.yourdomain.com A-record here)"
```

**✅ Checkpoint:** `ssh -i ~/amplify-key.pem ec2-user@$EC2_IP` works; on the box `docker --version` and `systemctl status nginx` are healthy.

---

## Step 8 — Cognito user pool

**UI:** Cognito → *Create user pool* → Sign-in: **Email** → MFA **No/Optional** → Recovery **Email only** → Self-registration ON, required attrs **email + name** → Email **Send with Cognito** → App client **Public client** `amplify-interview-client`, **no client secret**, enable **ALLOW_USER_PASSWORD_AUTH** → name `amplify-interview-user-pool` → Create. Record **UserPoolId** and **ClientId**.

**CLI:**
```bash
export POOL_ID=$(aws cognito-idp create-user-pool --pool-name amplify-interview-user-pool \
  --auto-verified-attributes email \
  --username-attributes email \
  --schema Name=name,Required=true \
  --query "UserPool.Id" --output text)

export CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id $POOL_ID --client-name amplify-interview-client \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query "UserPoolClient.ClientId" --output text)

echo "POOL_ID=$POOL_ID  CLIENT_ID=$CLIENT_ID"
put /amplify/prod/AWS_COGNITO_USER_POOL_ID "$POOL_ID"
put /amplify/prod/AWS_COGNITO_CLIENT_ID    "$CLIENT_ID"
```

**✅ Checkpoint:** `aws cognito-idp describe-user-pool --user-pool-id $POOL_ID` returns the pool. These IDs become the frontend's `VITE_AWS_COGNITO_CLIENT_ID` / `VITE_AWS_REGION`.

---

## Step 9 — Deploy the backend on EC2

SSH to the box, pull config from SSM, run migrations, start the container behind Nginx.

```bash
ssh -i ~/amplify-key.pem ec2-user@$EC2_IP     # then run the following ON the box

# 1) Pull config from SSM into an env file
aws ssm get-parameters-by-path --path /amplify/prod --with-decryption --region us-east-1 \
  --query "Parameters[*].[Name,Value]" --output text \
  | sed 's#/amplify/prod/##' | awk '{print $1"="$2}' > ~/amplify.env

# 2) Log in to ECR and pull the image  (ACCOUNT/REGION baked into the URI)
aws ecr get-login-password --region us-east-1 | docker login --username AWS \
  --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
IMAGE=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/amplify-interview-backend:latest
docker pull $IMAGE

# 3) Run DB migrations once (same image, alembic command) — after the RDS migration lands
docker run --rm --env-file ~/amplify.env $IMAGE alembic upgrade head

# 4) Start the API bound to localhost (Nginx is the only public entrypoint)
docker rm -f amplify-api 2>/dev/null || true
docker run -d --name amplify-api --restart unless-stopped \
  -p 127.0.0.1:8080:8080 --env-file ~/amplify.env $IMAGE
```

**Nginx reverse proxy** (`/etc/nginx/conf.d/amplify.conf` on the box):
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
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com   # TLS (needs the DNS A-record → EC2_IP first)
```

**✅ Checkpoint:** `curl http://127.0.0.1:8080/health` on the box, and `curl https://api.yourdomain.com/health` from your laptop, both return `{"status":"healthy",...}`.

> **Note:** Steps 6/9 assume the backend still runs on DynamoDB today. The `alembic upgrade head` + `DATABASE_URL` bits activate once the **DynamoDB → RDS code migration** (`DEPLOYMENT_AWS.md` Appendix A) is done. Until then, skip the migration line and the DB won't be used.

---

## Step 10 — Frontend on S3 + CloudFront (summary)

```bash
export WEB_BUCKET=$PROJECT-web-$ACCOUNT_ID
aws s3api create-bucket --bucket $WEB_BUCKET --region $AWS_REGION
aws s3api put-public-access-block --bucket $WEB_BUCKET \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Build with prod env values, then upload
VITE_API_URL=https://api.yourdomain.com \
VITE_AWS_REGION=us-east-1 \
VITE_AWS_COGNITO_CLIENT_ID=$CLIENT_ID \
  npm run build
aws s3 sync dist/ s3://$WEB_BUCKET --delete
```
Then create a **CloudFront distribution** (UI) with the S3 bucket as origin via **Origin Access Control (OAC)**, default root `index.html`, and a `403/404 → /index.html (200)` rule for SPA routing. (Full detail in `DEPLOYMENT_AWS.md` Step 11.)

**✅ Checkpoint:** the CloudFront URL serves the app; login hits Cognito; API calls reach `api.yourdomain.com`.

---

## Teardown (when you stop for a while)

To avoid burning credits on idle resources:
```bash
docker rm -f amplify-api                                   # on the box
aws ec2 stop-instances --instance-ids $EC2_ID              # stop (keeps disk) — or terminate to delete
aws rds stop-db-instance --db-instance-identifier amplify-interview-db   # RDS auto-restarts after 7 days
```
Full delete: `terminate-instances`, `delete-db-instance --skip-final-snapshot`, release the Elastic IP, delete the buckets. S3/ECR storage is cheap but not free.

---

## Cheat sheet — IDs to record in `aws-ids.txt`

```
ACCOUNT_ID=
VPC_ID=            SUBNET_A=            SUBNET_B=
SG_WEB=            SG_DB=
BUCKET=            WEB_BUCKET=
DB_HOST=           DB_PASSWORD=(store only in SSM, not here)
ECR=
EC2_ID=            EC2_IP=(Elastic IP)     EIP_ALLOC=
POOL_ID=           CLIENT_ID=
```

## Recommended order recap
`0 shell → 1 VPC/SG → 2 S3 → 3 IAM role → 4 SSM → 5 RDS → 6 ECR → 7 EC2 → 8 Cognito → 9 backend deploy → 10 frontend`
