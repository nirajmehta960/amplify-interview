# Phase 2 — Networking: VPC and Security Groups

**Goal:** a network where the database is physically unreachable from the internet, and you can explain why.
**Time:** ~1 hour
**Prerequisites:** Phase 1
**Cost impact:** $0 (security groups and default-VPC subnets are free; a NAT Gateway would not be — we avoid one)
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §2 (VPC networking)

---

## Why this phase exists

This is the phase that matters most for security, and the one most people skip past. Everything else in the project lives inside the network you define here. The single control that keeps your database safe is a security group rule you will write in step 2.2 — and it references *another security group* rather than an IP range. That technique is the core lesson.

---

## Concepts you need

**VPC** — your own private network in the cloud, with a CIDR range like `10.0.0.0/16`.

**Subnet** — a slice of that range, pinned to **one Availability Zone**.
- **Public** = its route table has a route to an **Internet Gateway**. Things here can have public IPs.
- **Private** = no internet gateway route. Unreachable from the internet inbound.

**Route table** — maps destination CIDRs to targets (local, IGW, NAT). What actually makes a subnet "public".

**Security group** — a **stateful** firewall attached to a resource. Stateful means: allow something inbound and the reply is automatically allowed back out. Default is deny-all-inbound, allow-all-outbound.

**NACL** — a **stateless** firewall at the subnet boundary. You will rarely touch it. Know it exists and that stateless means you must allow both directions explicitly.

**SG-to-SG referencing** — instead of "allow 5432 from `10.0.3.0/24`", you say "allow 5432 **from `sg-ec2-web`**". Now only machines carrying that security group can reach the database, no matter what IP they get. This is the technique.

---

## A decision: default VPC vs custom VPC

We use the **default VPC** with strict security groups. It is faster, free, and the SG-to-SG rule provides the isolation that actually matters.

The stronger version — a custom VPC with genuinely private subnets — needs a **NAT Gateway** (~$32/month, more than the rest of this stack combined) for the private subnets to reach the internet. RDS itself doesn't need outbound internet, so you can build a custom VPC without NAT if you want the exercise; just know that anything else you put in the private subnet will have no outbound access.

Do the default-VPC path now. Revisit custom VPC in Stage 2 if you want it.

---

## Steps

```bash
source ~/amplify-env.sh
```

### 2.1 — Find the default VPC and two subnets

RDS requires a subnet group spanning **at least two Availability Zones**, even for a single-AZ instance. That's why you need two.

**UI:** VPC console → *Your VPCs* → the one marked *Default* → *Subnets* → note two in **different AZs**.

**CLI:**
```bash
export VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query "Vpcs[0].VpcId" --output text)
echo "VPC_ID=$VPC_ID"

aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID \
  --query "Subnets[].{ID:SubnetId,AZ:AvailabilityZone,Public:MapPublicIpOnLaunch}" --output table

export SUBNET_A=<subnet-in-us-east-1a>
export SUBNET_B=<subnet-in-us-east-1b>
```

Look at that table. Every default subnet has `MapPublicIpOnLaunch = True` — they are all public. That is exactly why the security group in 2.2 is doing the real work here.

### 2.2 — Create the two security groups

This is the phase in two commands.

**UI:** VPC → *Security groups* → *Create security group*, twice:
- **`sg-ec2-web`** — Inbound: `HTTP 80` from `0.0.0.0/0`, `HTTPS 443` from `0.0.0.0/0`, `SSH 22` from **My IP**. Outbound: leave default.
- **`sg-rds-db`** — Inbound: `PostgreSQL 5432`, **Source = `sg-ec2-web`** (search for the security group, do not type a CIDR). Outbound: leave default.

**CLI:**
```bash
# Web tier
export SG_WEB=$(aws ec2 create-security-group --group-name sg-ec2-web \
  --description "Amplify EC2 web" --vpc-id $VPC_ID --query GroupId --output text)

MY_IP=$(curl -s https://checkip.amazonaws.com)/32
aws ec2 authorize-security-group-ingress --group-id $SG_WEB --protocol tcp --port 80  --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_WEB --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_WEB --protocol tcp --port 22  --cidr $MY_IP

# Database tier — 5432 ONLY from the web SG
export SG_DB=$(aws ec2 create-security-group --group-name sg-rds-db \
  --description "Amplify RDS db" --vpc-id $VPC_ID --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $SG_DB \
  --protocol tcp --port 5432 --source-group $SG_WEB

echo "SG_WEB=$SG_WEB  SG_DB=$SG_DB"
```

### 2.3 — Prove the rule is what you think it is

```bash
aws ec2 describe-security-groups --group-ids $SG_DB \
  --query "SecurityGroups[0].IpPermissions" --output json
```

The output must show `UserIdGroupPairs` containing `$SG_WEB`, and an **empty** `IpRanges`. If you see a CIDR in `IpRanges`, you created an IP-based rule by mistake — revoke it and redo.

### 2.4 — Draw it

Genuinely do this on paper before moving on:

```
        Internet
           │
        ┌──▼──┐  IGW
   ┌────┤ VPC ├──────────────────────────────┐
   │    └─────┘                              │
   │  ┌──────────────┐    ┌───────────────┐  │
   │  │ EC2          │    │ RDS           │  │
   │  │ sg-ec2-web   │───▶│ sg-rds-db     │  │
   │  │ 80,443 world │5432│ 5432 from     │  │
   │  │ 22 from myIP │    │ sg-ec2-web    │  │
   │  │              │    │ ONLY          │  │
   │  └──────────────┘    └───────────────┘  │
   └─────────────────────────────────────────┘
```

Note the asymmetry: two arrows point at EC2 from the internet, and **zero** point at RDS.

---

## ✅ Checkpoints

- [ ] `sg-rds-db`'s inbound rule has **source = `sg-ec2-web`**, and `IpRanges` is empty.
- [ ] `sg-ec2-web` allows 22 from your `/32` only — not `0.0.0.0/0`.
- [ ] You have two subnet IDs in two different AZs recorded.
- [ ] You can point at your drawing and say which resources can initiate a connection to which.

---

## 🧠 You understand this when you can answer, without notes

1. What technically makes a subnet public rather than private?
2. Why is "allow 5432 from `sg-ec2-web`" better than "allow 5432 from `10.0.1.0/24`"?
3. Security groups are stateful. What would you additionally have to configure if they were stateless?
4. In Phase 6 you will be unable to reach RDS from your laptop. Explain, in advance, exactly why — and why the application will still work.

---

## 🔧 Troubleshooting

**`InvalidGroup.NotFound` on the SG-to-SG rule** — `$SG_WEB` is empty. The export failed; re-run the describe and set it manually.

**`--source-group` seems to be ignored** — in a non-default VPC you must use `--source-group` together with the group *ID*, not the name. Verify with the describe in 2.3.

**Your IP changes** (home ISP, VPN, coffee shop) — SSH stops working in Phase 8. Re-run the port-22 authorize with the new IP, and revoke the stale rule:
```bash
aws ec2 revoke-security-group-ingress --group-id $SG_WEB --protocol tcp --port 22 --cidr <old-ip>/32
```

---

## 📝 Record in `aws-ids.txt`

```
VPC_ID=
SUBNET_A=
SUBNET_B=
SG_WEB=
SG_DB=
```

---

**Next:** [Phase 3 — S3 and the IAM instance role](PHASE_03_s3_iam.md)
