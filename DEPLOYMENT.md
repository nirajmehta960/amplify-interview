# Amplify Interview — GCP Deployment Guide

Complete step-by-step guide to deploy this project on Google Cloud Platform. **Target project:** GCP project ID `**amplify-interview`** (already created; billing should already be linked). If you deploy to a different project ID, replace `amplify-interview` in every command, URL, and `.firebaserc` value.

You still install CLI tools locally (gcloud, Firebase, Docker, Node) if you do not have them yet.

**This guide includes both CLI and UI options.** Use whichever you prefer:

- **CLI**: faster and repeatable (best for CI/CD)
- **UI**: helpful to verify configuration visually

---

## Local development ports (recommended)

- **Frontend (Vite)**: `http://localhost:3000`
- **Backend (FastAPI)**: `http://localhost:4000`

Note: **Cloud Run must listen on port `8080`** in production. The `4000` port is only for local development (`uvicorn --port 4000`).

---

## Prerequisites

Install the following tools before starting:

**gcloud CLI**

```bash
# macOS (Homebrew)
brew install --cask google-cloud-sdk

# Verify
gcloud version
```

**Firebase Tools**

```bash
npm install -g firebase-tools
firebase --version
```

**Docker Desktop**
Download from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) and install. Verify:

```bash
docker --version
```

**Node.js (20, 22, or 24 recommended for Firebase CLI)**

`firebase-tools` depends on packages that declare support for **Node 20, 22, or 24**. Node 25 may work but can show `EBADENGINE` warnings.

```bash
# Option A — Homebrew (macOS), then make it the default node
brew install node@20
brew link node@20 --force --overwrite
node --version   # v20.x.x

# Option B — nvm (https://github.com/nvm-sh/nvm) after install + ~/.zshrc setup
nvm install 20
nvm use 20
node --version
```

**Authenticate gcloud**

```bash
gcloud auth login
gcloud auth application-default login
# Align Application Default Credentials with this project (avoids quota / wrong-project warnings)
gcloud auth application-default set-quota-project amplify-interview
```

---

## Step 1 — Create & Configure GCP Project

This guide uses the existing GCP project `**amplify-interview**`. If you use a different project ID, replace `amplify-interview` in every command and URL below.

### Option A — CLI

```bash
# Skip project creation — this repo uses the existing project amplify-interview.

# Set as default so every subsequent command uses it
gcloud config set project amplify-interview
gcloud config set compute/region us-central1
```

If `gcloud` asks to enable **Compute Engine API** on this project, answer **y** (needed to validate the default region the first time).

Refresh Application Default Credentials quota project if you previously used another GCP project on this machine:

```bash
gcloud auth application-default set-quota-project amplify-interview
```

### Option B — UI

1. Open GCP Console and select the project from the top project picker.
2. Confirm the Project ID in **IAM & Admin → Settings**.
3. Note: there is no single UI “set default region for all commands”; keep using the CLI defaults above for consistent behavior.

To create a **new** project instead (optional):

```bash
gcloud projects create YOUR_PROJECT_ID --name="Amplify Interview"
gcloud config set project YOUR_PROJECT_ID
gcloud config set compute/region us-central1
```

**Enable billing:**

1. Open [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing)
2. Click **Manage billing accounts** → **Add billing account** (or link an existing one)
3. Navigate to **IAM & Admin → Settings** for your project and link the billing account

Verify billing is linked:

```bash
gcloud beta billing projects describe amplify-interview
# billingEnabled: true
```

---

## Step 2 — Enable Required APIs

Enable all services with one command:

```bash
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  speech.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project=amplify-interview
```

This takes ~2 minutes. All APIs must succeed before proceeding.

### Option B — UI

GCP Console → **APIs & Services → Library**, then enable:

- Cloud Run API
- Cloud Firestore API
- Cloud Storage
- Cloud Speech-to-Text API
- Secret Manager API
- Cloud Build API
- Artifact Registry API
- Firebase Management API
- Identity Toolkit API (Firebase Auth)

---

## Step 3 — Firebase Project Setup

### 3a. Add Firebase to your GCP project

1. Open [https://console.firebase.google.com](https://console.firebase.google.com)
2. If `**amplify-interview**` is not in Firebase yet: click **Add project** → select GCP project `**amplify-interview`** from the dropdown → accept terms → **Continue** (do not enable Google Analytics here — you'll add GA4 separately in Step 10) → **Add Firebase**.
3. If Firebase is **already** enabled on `**amplify-interview`**, open that project from the Firebase console home (no second project is required).

Important: your Firebase project ID might be slightly different (e.g. `amplify-interview-e6bf5`). That’s OK — just make sure `.firebaserc` `"default"` matches the Firebase project you’re deploying to (Step 10).

### 3b. Enable Firestore

1. In Firebase Console → **Firestore Database** → **Create database**
2. Select **Native mode** (not Datastore mode)
3. Location: **us-central1**
4. Click **Done**

### 3c. Enable Firebase Auth

1. Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** tab → Enable **Email/Password**
3. Enable **Google** sign-in:
  - Click Google → toggle Enable
  - Set a support email (your email)
  - Click **Save**

### 3d. Register a Web App & Get Config Values

1. Firebase Console → **Project settings** (gear icon) → **General** tab
2. Scroll to **Your apps** → Click **</>** (Web)
3. App nickname: **`amplify-interview`** (any display name is fine; this matches the repo convention)
4. Check **Also set up Firebase Hosting** → **Register app**
5. Copy the Firebase config object — it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "amplify-interview.firebaseapp.com",
  projectId: "amplify-interview",
  storageBucket: "amplify-interview.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
};
```

Save these values — you'll need them as secrets in Step 7.

### 3e. Set Firebase Auth Action URL (for password reset emails)

1. Firebase Console → **Authentication** → **Templates** tab
2. Click **Password reset** template → **Edit** (pencil icon)
3. Under **Action URL**, set to your Cloud Run URL (you'll know it after Step 9). For now, skip — come back after Step 9.

---

## Step 4 — Cloud Storage Bucket

### Option A — CLI

```bash
# Create the bucket
gcloud storage buckets create gs://amplify-interview-uploads \
  --location=us-central1 \
  --project=amplify-interview
```

Create a CORS configuration file:

```bash
cat > /tmp/cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
EOF

gcloud storage buckets update gs://amplify-interview-uploads \
  --cors-file=/tmp/cors.json
```

Note: After your frontend is deployed, replace `"*"` in origin with your Firebase Hosting URL (e.g., `"https://amplify-interview.web.app"`) and re-apply the CORS config.

### Option B — UI

1. GCP Console → **Cloud Storage → Buckets → Create**
2. Bucket name: `amplify-interview-uploads`
3. Location type: **Region** → `us-central1`
4. Create
5. Bucket CORS is easiest to set via the CLI commands above (UI support varies by console version).

---

## Step 5 — Artifact Registry

Create a Docker repository to store backend container images:

### Option A — CLI

```bash
gcloud artifacts repositories create amplify-interview \
  --repository-format=docker \
  --location=us-central1 \
  --description="Amplify Interview backend images" \
  --project=amplify-interview
```

Authenticate Docker to push to this registry:

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Option B — UI

1. GCP Console → **Artifact Registry → Repositories → Create**
2. Name: `amplify-interview`
3. Format: **Docker**
4. Location: `us-central1`
5. Create
6. For local pushes, run the CLI auth command once: `gcloud auth configure-docker us-central1-docker.pkg.dev`

---

## Step 6 — Obtain API Keys

You need external API keys before creating secrets:

### LLM — OpenRouter (recommended in this repo)

1. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys) and create an API key (starts with `sk-or-v1-...`).
2. Pick model IDs on [Models](https://openrouter.ai/models) (e.g. `openai/gpt-4o-mini`, `openai/gpt-4o`). You will pass them to Cloud Run as `OPENAI_MODEL_DEFAULT` / `OPENAI_MODEL_ADVANCED` in Step 9.

### LLM — OpenAI (optional alternative)

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a secret key (`sk-...`). Leave `OPENAI_API_BASE` unset in Step 9 so the client uses the official OpenAI endpoint.

### Resend API Key (transactional email)

1. Go to [https://resend.com](https://resend.com) → sign up / log in
2. **API Keys** → **Create API Key**
3. Copy the key (starts with `re_...`)

---

## Step 7 — Secret Manager — Create All Secrets

Replace placeholder values with your real credentials.

```bash
# LLM API key — OpenRouter key (sk-or-v1-...) or OpenAI key (sk-...). Same secret name for either provider.
echo -n "sk-or-v1-YOUR_OPENROUTER_OR_OPENAI_KEY_HERE" | \
  gcloud secrets create amplify-openai-api-key \
    --data-file=- \
    --project=amplify-interview

# Resend (email)
echo -n "re_YOUR_RESEND_KEY_HERE" | \
  gcloud secrets create amplify-resend-api-key \
    --data-file=- \
    --project=amplify-interview

# Firebase Web App config (from Step 3d)
echo -n "AIzaSy_YOUR_API_KEY" | \
  gcloud secrets create amplify-firebase-api-key \
    --data-file=- \
    --project=amplify-interview

echo -n "amplify-interview.firebaseapp.com" | \
  gcloud secrets create amplify-firebase-auth-domain \
    --data-file=- \
    --project=amplify-interview

echo -n "amplify-interview.appspot.com" | \
  gcloud secrets create amplify-firebase-storage-bucket \
    --data-file=- \
    --project=amplify-interview

echo -n "YOUR_MESSAGING_SENDER_ID" | \
  gcloud secrets create amplify-firebase-messaging-sender-id \
    --data-file=- \
    --project=amplify-interview

echo -n "1:XXXXXXXXXX:web:YYYYYYYY" | \
  gcloud secrets create amplify-firebase-app-id \
    --data-file=- \
    --project=amplify-interview
```

**Firebase CI token** (used by Cloud Build to deploy Firebase Hosting):

```bash
firebase login:ci
# A browser window opens — authenticate.
# A token is printed to the terminal. Copy it.

echo -n "YOUR_FIREBASE_CI_TOKEN" | \
  gcloud secrets create amplify-firebase-token \
    --data-file=- \
    --project=amplify-interview
```

**Cloud Run URL** — you don't know it yet. Create the secret with a placeholder; you'll update it after Step 9:

```bash
echo -n "https://placeholder.run.app" | \
  gcloud secrets create amplify-cloud-run-url \
    --data-file=- \
    --project=amplify-interview
```

**GA4 Measurement ID** — placeholder for now; update after Step 10:

```bash
echo -n "G-PLACEHOLDER" | \
  gcloud secrets create amplify-ga4-measurement-id \
    --data-file=- \
    --project=amplify-interview
```

Verify all secrets exist:

```bash
gcloud secrets list --project=amplify-interview
```

You should see 10 secrets:

- `amplify-openai-api-key` (OpenRouter or OpenAI secret key)
- `amplify-resend-api-key`
- `amplify-firebase-api-key`
- `amplify-firebase-auth-domain`
- `amplify-firebase-storage-bucket`
- `amplify-firebase-messaging-sender-id`
- `amplify-firebase-app-id`
- `amplify-firebase-token`
- `amplify-cloud-run-url`
- `amplify-ga4-measurement-id`

### Option B — UI

GCP Console → **Security → Secret Manager**:

1. Click **Create secret**
2. Set **Name** exactly (example: `amplify-openai-api-key`)
3. Paste the secret value
4. Replication: **Automatic**
5. Create
6. Repeat for all 10 secrets listed above

---

## Step 8 — IAM Roles

### Find your project number

```bash
gcloud projects describe amplify-interview --format="value(projectNumber)"
# Example output: 123456789012
# Save this number as PROJECT_NUMBER
```

Set a variable for convenience (replace with your actual project number):

```bash
export PROJECT_NUMBER=123456789012
export PROJECT_ID=amplify-interview
```

### Grant Cloud Build service account the required roles

```bash
# Access secrets in Secret Manager
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy to Cloud Run
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Push images to Artifact Registry
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Act as the Cloud Run service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Grant Cloud Run service account the required roles

Cloud Run uses the Compute Engine default service account:

```bash
# Access secrets (backend reads secrets at startup)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Firestore read/write
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"

# Cloud Storage (resume uploads)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Cloud Speech-to-Text
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/speech.client"
```

### Option B — UI

GCP Console → **IAM & Admin → IAM**:

1. Click **Grant access**
2. Add principals:
   - Cloud Build SA: `$PROJECT_NUMBER@cloudbuild.gserviceaccount.com`
   - Cloud Run default SA: `$PROJECT_NUMBER-compute@developer.gserviceaccount.com`
3. Grant the same roles as in the CLI blocks above (roles are idempotent; safe to reapply).

---

## Step 9 — First Manual Backend Deploy

This step builds the Docker image, pushes it to Artifact Registry, and deploys to Cloud Run. Run these commands from the project root.

### Build the Docker image

```bash
docker build \
  -t us-central1-docker.pkg.dev/$PROJECT_ID/amplify-interview/backend:latest \
  ./backend
```

If you are on Apple Silicon (M1/M2/M3), Cloud Run needs a Linux/amd64 image. Recommended build+push:

```bash
export IMAGE="us-central1-docker.pkg.dev/$PROJECT_ID/amplify-interview/backend:latest"
docker buildx build --platform linux/amd64 -t "$IMAGE" --push ./backend
```

### Push to Artifact Registry

```bash
docker push us-central1-docker.pkg.dev/$PROJECT_ID/amplify-interview/backend:latest
```

### Deploy to Cloud Run

```bash
gcloud run deploy amplify-interview-backend \
  --image=us-central1-docker.pkg.dev/$PROJECT_ID/amplify-interview/backend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID,GCS_BUCKET_NAME=amplify-interview-uploads,FRONTEND_URL=https://$PROJECT_ID.web.app,OPENAI_API_BASE=https://openrouter.ai/api/v1,OPENAI_MODEL_DEFAULT=openai/gpt-4o-mini,OPENAI_MODEL_ADVANCED=openai/gpt-4o" \
  --set-secrets="OPENAI_API_KEY=amplify-openai-api-key:latest,RESEND_API_KEY=amplify-resend-api-key:latest" \
  --project=$PROJECT_ID
```

For **OpenAI directly** (no OpenRouter), use the same `gcloud run deploy` command as above but **drop** `OPENAI_API_BASE` from `--set-env-vars` and use plain model IDs (e.g. `gpt-4o-mini`, `gpt-4o`) so the backend uses the default `https://api.openai.com/v1`.

### Option B — UI

GCP Console → **Cloud Run → Create service**:

1. Choose “Deploy one revision from an existing container image”
2. Image: `us-central1-docker.pkg.dev/$PROJECT_ID/amplify-interview/backend:latest`
3. Service name: `amplify-interview-backend`
4. Authentication: **Allow unauthenticated**
5. Container port: `8080`
6. Add env vars + secrets matching the CLI deploy command above
7. Create

### Capture the Cloud Run URL

After deployment completes, the command prints:

```
Service URL: https://amplify-interview-backend-XXXXXXXX-uc.a.run.app
```

Copy that URL and update the secret:

```bash
echo -n "https://amplify-interview-backend-XXXXXXXX-uc.a.run.app" | \
  gcloud secrets versions add amplify-cloud-run-url --data-file=-
```

Verify the backend is healthy:

```bash
curl https://amplify-interview-backend-XXXXXXXX-uc.a.run.app/health
# {"status":"ok"}
```

### Update Firebase Auth action URL

Now that you have the Cloud Run URL, go back to:
Firebase Console → **Authentication** → **Templates** → **Password reset** → **Edit** → set Action URL to `https://amplify-interview-backend-XXXXXXXX-uc.a.run.app/api/auth/action`

---

## Step 10 — Verify `.firebaserc`

The repo root `**.firebaserc`** should name the default Firebase / GCP project:

```json
{
  "projects": {
    "default": "amplify-interview"
  }
}
```

If you deploy under a different GCP project ID, change `"default"` to that ID and use the same value in `firebase deploy --project ...`.

---

## Step 11 — Google Analytics 4

1. Go to [https://analytics.google.com](https://analytics.google.com)
2. Click **Start measuring** → create an **Account** (e.g., "Amplify Interview")
3. Create a **Property** (e.g., "amplify-interview"), timezone and currency as preferred
4. Under **Platform**, choose **Web**
5. Enter your Firebase Hosting URL: `https://amplify-interview.web.app`
6. Click **Create stream**
7. Copy the **Measurement ID** — it looks like `G-XXXXXXXXXX`

Update the secret:

```bash
echo -n "G-XXXXXXXXXX" | \
  gcloud secrets versions add amplify-ga4-measurement-id --data-file=-
```

---

## Step 12 — First Manual Frontend Deploy

### Create a local `.env.local` file

Create `.env.local` at the project root (this file is gitignored — never commit it):

```bash
cat > .env.local << 'EOF'
VITE_API_URL=https://amplify-interview-backend-XXXXXXXX-uc.a.run.app
VITE_FIREBASE_API_KEY=AIzaSy_YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=amplify-interview.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=amplify-interview
VITE_FIREBASE_STORAGE_BUCKET=amplify-interview.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=1:XXXXXXXXXX:web:YYYYYYYY
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
EOF
```

Replace all placeholder values with your real credentials.

### Build and deploy

### Option A — CLI

```bash
npm ci
npm run build
firebase deploy --only hosting --project amplify-interview
```

### Option B — UI (recommended alternative)

Firebase Hosting deployments are typically done via `firebase deploy`. If you want a UI-driven workflow, set up **Cloud Build** in Step 13 so builds and hosting deploys run automatically after pushes to `main`, and you can monitor the process in the Cloud Build UI.

Firebase will print the hosting URL:

```
Hosting URL: https://amplify-interview.web.app
```

Open that URL in your browser and verify the app loads.

### Update CORS (optional — recommended for production)

Now that you know your frontend URL, tighten the bucket CORS:

```bash
cat > /tmp/cors-prod.json << EOF
[
  {
    "origin": ["https://amplify-interview.web.app"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
EOF

gcloud storage buckets update gs://amplify-interview-uploads \
  --cors-file=/tmp/cors-prod.json
```

---

## Step 13 — Cloud Build CI/CD Trigger

After this step, every push to `main` will automatically build and deploy both the backend and frontend.

### Connect your GitHub repository

1. Open [https://console.cloud.google.com/cloud-build/triggers?project=amplify-interview](https://console.cloud.google.com/cloud-build/triggers?project=amplify-interview)
2. Click **Connect repository**
3. Source: **GitHub (Cloud Build GitHub App)**
4. Authenticate with GitHub and select your repository
5. Click **Connect**

### Create the trigger

1. Click **Create trigger**
2. Name: `deploy-on-main`
3. Event: **Push to a branch**
4. Branch: `^main$`
5. Configuration: **Cloud Build configuration file (yaml or json)**
6. Location: `cloudbuild.yaml` (repository)
7. Click **Create**

### Verify Cloud Build service account has all roles

Run the IAM grants from Step 8 again if you're unsure — they are idempotent.

### Test the trigger

Push a trivial change to `main`:

```bash
git commit --allow-empty -m "chore: trigger CI/CD test"
git push origin main
```

Open Cloud Build → **History** and watch the build. It runs these steps:

1. Build Docker image
2. Push image to Artifact Registry
3. Deploy to Cloud Run
4. `npm ci`
5. `npm run build` (reads secrets for VITE_ env vars)
6. `firebase deploy --only hosting`

---

## Step 14 — Firestore Security Rules

The backend accesses Firestore using its service account credentials — clients never touch Firestore directly. Lock the rules to prevent any direct client access:

1. Firebase Console → **Firestore Database** → **Rules** tab
2. Replace the default rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

1. Click **Publish**

---

## End-to-End Verification Checklist

Work through each item in order to confirm the full stack is operating correctly.

### Authentication

- Open `https://amplify-interview.web.app`
- Click **Sign Up** → create an account with email + password
- Check your inbox — welcome email received from Resend
- Sign out → Sign in with the same credentials
- Click **Sign in with Google** — Google OAuth flow completes, lands on dashboard

### Resume Upload

- From the dashboard, upload a PDF resume
- Open GCP Console → **Cloud Storage** → `amplify-interview-uploads` bucket
- Verify the file appears in the bucket

### Interview Flow

- Click **Start Interview** → configure job role and settings
- First question appears (generated by OpenAI via backend)
- Type a response and submit
- Follow-up question adapts to your answer (adaptive engine working)
- Voice input: click microphone → speak → transcript appears in the text box
- Complete all questions → processing screen → results page loads

### Results & Analytics

- Results page shows score, feedback, and recommendations
- Navigate to **Progress** → charts show data from the completed session
- Navigate to **Insights** → strengths and improvement areas populated

### CI/CD

- Make a minor frontend text change, commit, push to `main`
- Cloud Build trigger fires automatically
- Build completes successfully (~5-8 minutes)
- Reload the app — change is live

### Firestore Data

- Firebase Console → Firestore → browse collections
- Verify `users/{uid}`, `sessions/{sessionId}` documents were created
- Confirm no direct client access is possible (rules deny all)

---

## Troubleshooting

**`gcloud services enable` — billing / `UREQ_PROJECT_BILLING_NOT_FOUND`**

Link a billing account to **`amplify-interview`**: [Billing](https://console.cloud.google.com/billing) → your billing account → **Account management** → **Link a project** → choose **`amplify-interview`**. Or in GCP: **IAM & Admin → Settings** for that project → **Billing**. Then rerun Step 2.

**Console — "You need additional access" / missing `resourcemanager.projects.get`**

The browser Google account must match the one used for `gcloud auth login`. Check the profile menu in the console vs `gcloud auth list` (active account has `*`).

**Cloud Build fails at `firebase deploy` — "permission denied"**
The Firebase CI token has expired. Generate a new one:

```bash
firebase login:ci
echo -n "NEW_TOKEN" | gcloud secrets versions add amplify-firebase-token --data-file=-
```

**Cloud Run returns 500 — "PERMISSION_DENIED accessing secret"**
The Cloud Run service account is missing `roles/secretmanager.secretAccessor`. Re-run the IAM grant from Step 8 and redeploy.

**Frontend build fails — "VITE_FIREBASE_API_KEY is not defined"**
The `VITE_*` env vars in `cloudbuild.yaml` pull from secrets using `$$SECRET_NAME`. Verify each secret exists in Secret Manager with the exact name shown in Step 7.

**Speech transcription returns 400 — "Invalid audio encoding"**
The browser may send audio in a different format. The backend expects `WEBM_OPUS` at 48kHz. Check Chrome/Firefox — both support `audio/webm;codecs=opus`. Safari may require a different encoding; update `RecognitionConfig` in `backend/app/routers/speech.py` accordingly.

**Firebase Hosting shows old version after CI/CD**
Hard reload the browser (`Cmd+Shift+R` on Mac). Firebase Hosting sets a 1-year cache on hashed assets but no-cache on `index.html` — if you see the old shell, clear browser cache.

**`gcloud run deploy` fails — "Artifact Registry API not enabled"**

```bash
gcloud services enable artifactregistry.googleapis.com --project=amplify-interview
```

Then retry the deploy.

---

## Cost Estimates (us-central1, light usage)


| Service           | Free tier                         | Estimated cost at low usage |
| ----------------- | --------------------------------- | --------------------------- |
| Cloud Run         | 2M req/mo free                    | ~$0–5/mo                    |
| Firestore         | 1 GiB storage, 50K reads/day free | ~$0–2/mo                    |
| Cloud Storage     | 5 GB free                         | ~$0–1/mo                    |
| Speech-to-Text    | 60 min/mo free                    | ~$0–2/mo                    |
| Cloud Build       | 120 build-min/day free            | ~$0/mo                      |
| Artifact Registry | 0.5 GB free                       | ~$0/mo                      |
| Firebase Hosting  | 10 GB storage, 360 MB/day free    | ~$0/mo                      |
| Secret Manager    | 6 active secret versions free     | ~$0/mo                      |


Total for a portfolio/demo project with light traffic: **$0–10/month** (Google Cloud / Firebase only).

**OpenRouter / OpenAI:** LLM usage is billed by **OpenRouter** (or **OpenAI**) separately from GCP. Cost depends on model choice and interview volume; set limits in the OpenRouter or OpenAI dashboard.