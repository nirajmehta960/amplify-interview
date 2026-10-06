# Phase 10 — Frontend on S3 + CloudFront

**Goal:** the React app served worldwide over HTTPS from a CDN, out of a bucket that is never public.
**Time:** ~2 hours (CloudFront takes 10–15 minutes to deploy each change — plan around it)
**Prerequisites:** Phases 1–9
**Cost impact:** ~$1/month
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §3 (S3)

---

## Why this phase exists

The frontend is a Vite build — static HTML, JS, and CSS. It needs no server. S3 stores it, CloudFront distributes it from edge locations near your users and terminates TLS.

The interesting part is **Origin Access Control**: the bucket stays fully private and only CloudFront can read it. The old way (S3 static website hosting with a public bucket) is simpler and worse; you'll build the good version.

---

## Concepts you need

**CDN** — caches your files at edge locations worldwide. First request for a file pulls from the origin (S3); subsequent ones are served from the edge.

**Origin Access Control (OAC)** — CloudFront signs its requests to S3 with SigV4. A bucket policy allows *only that distribution*. Block Public Access stays fully on. (OAC supersedes the older OAI; use OAC.)

**Cache invalidation** — CloudFront caches aggressively. After deploying you must invalidate, or users get stale files. Vite hashes asset filenames (`index-a1b2c3.js`), so those are safe to cache forever — but `index.html` must **not** be, because it's the file that points at the new hashes.

**SPA routing** — React Router owns paths like `/dashboard/analytics`. S3 has no such object and returns 403/404. You map those back to `/index.html` with a 200 so the router can take over.

**Build-time env vars** — Vite inlines `VITE_*` variables into the bundle **at build time**. They are not runtime config, and they are **public** — anyone can read them in the JS. That is fine for the Cognito client ID (a public client, by design) and would not be fine for a secret.

---

## Steps

```bash
source ~/amplify-env.sh
export CLIENT_ID=... API_DOMAIN=api.yourdomain.com
```

### 10.1 — Private web bucket

```bash
export WEB_BUCKET=$PROJECT-web-$ACCOUNT_ID
aws s3api create-bucket --bucket $WEB_BUCKET --region $AWS_REGION
aws s3api put-public-access-block --bucket $WEB_BUCKET \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
echo "WEB_BUCKET=$WEB_BUCKET"
```

Do **not** enable S3 static website hosting. That feature requires a public bucket and cannot be used with OAC.

### 10.2 — Build with production values

```bash
cd "/Users/nirajmehta/Documents/Full Stack Projects/amplify-interview"

VITE_API_URL=https://$API_DOMAIN \
VITE_AWS_REGION=$AWS_REGION \
VITE_AWS_COGNITO_CLIENT_ID=$CLIENT_ID \
  npm run build

ls -la dist/
grep -o "https://$API_DOMAIN" dist/assets/*.js | head -1    # confirm the URL got inlined
```

If that grep finds nothing, the variables didn't reach the build and the app will call `localhost:4000` in production.

### 10.3 — Upload with correct cache headers

Two passes, because hashed assets and `index.html` need opposite caching:

```bash
# Hashed assets — cache for a year
aws s3 sync dist/ s3://$WEB_BUCKET --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

# index.html — never cache
aws s3 cp dist/index.html s3://$WEB_BUCKET/index.html \
  --cache-control "no-cache,no-store,must-revalidate"
```

This is the pattern that makes a CDN both fast and correct. Get it backwards and users are stuck on an old build until the TTL expires.

### 10.4 — Certificate for the frontend domain

**CloudFront certificates must live in `us-east-1`** regardless of where anything else is. You are already there.

```bash
aws acm request-certificate --domain-name app.yourdomain.com \
  --validation-method DNS --region us-east-1
```

Get the CNAME validation record from the console (ACM → the certificate → *Create records in Route 53*, or copy it to your registrar) and add it. Validation takes a few minutes.

### 10.5 — Create the distribution

The console is genuinely easier here than the CLI, which needs a large JSON document.

**UI:** CloudFront → *Create distribution*
- **Origin domain:** your `$WEB_BUCKET` (pick the S3 bucket, not the website endpoint)
- **Origin access:** *Origin access control settings* → **Create control setting** → then **copy the bucket policy CloudFront shows you and apply it to the bucket**
- **Viewer protocol policy:** *Redirect HTTP to HTTPS*
- **Default root object:** `index.html`
- **Alternate domain name (CNAME):** `app.yourdomain.com`
- **Custom SSL certificate:** the ACM cert from 10.4

Then *Error pages* → create **two** custom responses, both required:

| HTTP error code | Response page | HTTP response code |
|---|---|---|
| 403 | `/index.html` | **200** |
| 404 | `/index.html` | **200** |

403 is the one people forget. With OAC, a missing key returns **403, not 404**, because CloudFront isn't allowed to know whether it exists. Without the 403 rule, every deep link like `/dashboard/progress` breaks on refresh.

```bash
export DISTRIBUTION_ID=<from the console>
aws cloudfront get-distribution --id $DISTRIBUTION_ID --query "Distribution.DomainName" --output text
```

### 10.6 — DNS

A **CNAME** for `app.yourdomain.com` → the `d111111abcdef8.cloudfront.net` domain. (On Route 53, use an **A record with an Alias** to the distribution instead — it's free and resolves faster.)

### 10.7 — Update backend CORS

The API currently allows a placeholder origin. Fix it and restart:

```bash
aws ssm put-parameter --name /amplify/prod/ALLOWED_ORIGINS \
  --value "https://app.yourdomain.com" --type String --overwrite
```

Then redeploy (push to `main`, or re-run the Phase 8 §8.5–8.6 commands) so the container picks up the new value. **Config in SSM does not reach a running container** — it is read once at startup into `~/amplify.env`.

### 10.8 — Invalidate and verify

```bash
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

Then in the browser at `https://app.yourdomain.com`: sign in, navigate to `/dashboard/progress`, **hard-refresh** (this is the SPA routing test), run an interview, and confirm no CORS errors in the console.

### 10.9 — Add the frontend to CI

Now complete Phase 9 §9.6 — a second workflow on `paths: ["src/**", "package.json", "index.html"]` that builds, syncs with the two cache-control passes above, and invalidates. Add `WEB_BUCKET` and `DISTRIBUTION_ID` as repository secrets.

Invalidate `/index.html` specifically rather than `/*` — the first 1,000 invalidation paths per month are free, `/*` counts as one path but invalidates everything including assets that didn't change.

---

## ✅ Checkpoints

- [ ] `https://app.yourdomain.com` serves the app over a valid certificate.
- [ ] The bucket is **not** public — the direct S3 URL returns AccessDenied.
- [ ] Hard-refreshing `/dashboard/progress` loads the page (SPA routing works).
- [ ] Sign-in works against Cognito and API calls reach `api.yourdomain.com` with no CORS errors.
- [ ] `curl -I https://app.yourdomain.com/index.html` shows `no-cache`; a hashed asset shows `max-age=31536000`.
- [ ] A second `curl -I` shows `X-Cache: Hit from cloudfront`.

---

## 🧠 You understand this when you can answer, without notes

1. How does CloudFront read from a bucket that blocks all public access?
2. Why must `index.html` and the hashed assets have opposite cache policies?
3. Why does the 403 → `/index.html` rule exist, and why is 404 alone insufficient?
4. Why is `VITE_AWS_COGNITO_CLIENT_ID` safe to inline into public JavaScript?
5. Why did the backend need a redeploy after changing `ALLOWED_ORIGINS` in SSM?

---

## 🔧 Troubleshooting

**AccessDenied on every file** — the OAC bucket policy wasn't applied. CloudFront shows it at OAC creation; copy it to the bucket's *Permissions* tab.

**Deep links 404 on refresh** — the custom error responses are missing, or you set the response code to 403/404 instead of **200**.

**Old version persists after deploy** — no invalidation, or `index.html` was uploaded with long cache headers.

**CORS errors** — `ALLOWED_ORIGINS` must match the scheme and host **exactly** (`https://app.yourdomain.com`, no trailing slash), and the container must have been restarted.

**Certificate not selectable** — it isn't in `us-east-1`, or it hasn't finished DNS validation.

**Changes take 15 minutes** — normal. Distribution config changes propagate to all edges; content invalidations are faster.

---

## 📝 Record in `aws-ids.txt`

```
WEB_BUCKET=
DISTRIBUTION_ID=
CLOUDFRONT_DOMAIN=
APP_DOMAIN=app.yourdomain.com
```

---

**Next:** [Phase 11 — Observability](PHASE_11_observability.md)
