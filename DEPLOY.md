# Deploying Detailing Labs to Railway

This guide covers everything needed to deploy the full Detailing Labs stack to [Railway](https://railway.app) — completely independent of Manus hosting.

---

## Architecture Overview

```
Railway Project
├── Web Service  (this app — built via Dockerfile)
│   ├── Express API       /api/*
│   ├── tRPC endpoints    /api/trpc/*
│   ├── Health check      /api/health
│   └── React SPA         all other routes
└── MySQL Service         (provisioned by Railway)

External Services (you configure):
├── Cloudflare R2 or AWS S3   — photo/media storage
└── SendGrid                  — transactional email
```

---

## Prerequisites

- A [Railway](https://railway.app) account
- Your code pushed to a GitHub repository
- A SendGrid account (free tier works — [sendgrid.com](https://sendgrid.com))
- A Cloudflare account for R2 storage (free tier — [cloudflare.com](https://cloudflare.com)) **or** an AWS S3 bucket

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/detailing-labs.git
git push -u origin main
```

---

## Step 2 — Create a Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo** → select your repository
3. Railway detects the `Dockerfile` automatically — click **Deploy**

---

## Step 3 — Add a MySQL Database

1. In your Railway project dashboard, click **+ New Service → Database → MySQL**
2. Once provisioned, click the MySQL service → **Connect** tab
3. Copy the **`DATABASE_URL`** — it looks like:
   ```
   mysql://root:PASSWORD@containers-us-west-XXX.railway.app:PORT/railway
   ```

---

## Step 4 — Set Environment Variables

In your Railway **web service** → **Variables** tab, add all of the following:

### Required — Core App

| Variable | Value / Description |
|---|---|
| `DATABASE_URL` | MySQL connection string from Step 3 |
| `JWT_SECRET` | Random 64-char secret (see generator below) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('"crypto"').randomBytes(32).toString('"hex"'))"
```

---

### Required — Email (SendGrid)

| Variable | Value / Description |
|---|---|
| `SENDGRID_API_KEY` | Your SendGrid API key (starts with `SG.`) |
| `EMAIL_FROM` | Verified sender email, e.g. `noreply@detailinglabswi.com` |

> **Important:** In SendGrid, go to **Settings → Sender Authentication** and verify your sending domain or single sender before emails will deliver.

---

### Required — File Storage (Cloudflare R2 — Recommended)

Cloudflare R2 has **no egress fees** and is S3-compatible. Free tier: 10 GB storage, 1M operations/month.

**Setup R2:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Create bucket** (name: `detailing-labs-media`)
2. Go to **R2 → Manage R2 API Tokens** → **Create API Token** with **Object Read & Write** permissions
3. Note the **Access Key ID**, **Secret Access Key**, and **Account ID**
4. Enable **Public Access** on the bucket to get a public URL (e.g. `https://pub-XXXX.r2.dev`)

| Variable | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | R2 Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | R2 Secret Access Key |
| `AWS_REGION` | `auto` |
| `AWS_S3_BUCKET` | Your bucket name, e.g. `detailing-labs-media` |
| `AWS_S3_ENDPOINT` | `https://ACCOUNT_ID.r2.cloudflarestorage.com` |
| `STORAGE_PUBLIC_URL` | Public bucket URL, e.g. `https://pub-XXXX.r2.dev` |

**Alternative — AWS S3:**

| Variable | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_S3_BUCKET` | Your bucket name |
| `AWS_S3_ENDPOINT` | *(leave blank for standard AWS S3)* |
| `STORAGE_PUBLIC_URL` | e.g. `https://BUCKET.s3.us-east-1.amazonaws.com` |

---

### Optional — Google Maps (Route Planner)

The admin Route Planner uses Google Maps. On Railway, provide your own Google Maps API key:

| Variable | Value |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Your Google Maps JavaScript API key |

Then update `client/src/components/Map.tsx` line 89:
```ts
// Change from:
const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
// To:
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
```

Enable these APIs in Google Cloud Console: Maps JavaScript API, Places API, Directions API, Geocoding API.

---

### Variables NOT Needed on Railway

The following were Manus-platform-specific and can be safely omitted:

`VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `OWNER_NAME`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID`

---

## Step 5 — Run Database Migrations

After your first successful deploy, create all 19 database tables.

**Option A — Railway Shell (first deploy):**
1. Railway web service → **Shell** tab
2. Run:
   ```bash
   node scripts/migrate.mjs
   ```

**Option B — Auto-migrate on every deploy** (update `railway.toml`):
```toml
[deploy]
startCommand = "node scripts/migrate.mjs && node dist/index.js"
```

> Safe to run repeatedly — skips already-applied migrations automatically.

---

## Step 6 — Create Your First Admin Account

1. Visit your Railway app URL → go to `/register`
2. Create your account
3. Open Railway → MySQL service → **Query** tab and run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
   ```
4. After first admin is set, use **Admin → Users** to promote future admins — no database access needed.

---

## Step 7 — Set a Custom Domain

1. Railway → web service → **Settings → Networking → Custom Domain**
2. Add your domain (e.g. `detailinglabswi.com`)
3. Add the DNS records Railway shows (typically a CNAME pointing to Railway)
4. Railway provisions an SSL certificate automatically

---

## Step 8 — Verify the Deployment

| URL | Expected Result |
|---|---|
| `https://your-domain.com` | Home page loads |
| `https://your-domain.com/api/health` | `{"status":"ok","timestamp":"..."}` |
| `https://your-domain.com/login` | Login page |
| `https://your-domain.com/admin` | Admin login gate |
| `https://your-domain.com/booking` | Booking wizard |

---

## Complete Variables Reference (copy into Railway bulk edit)

```
DATABASE_URL=mysql://root:PASSWORD@HOST:PORT/railway
JWT_SECRET=GENERATE_64_CHAR_HEX_HERE
NODE_ENV=production
PORT=3000
SENDGRID_API_KEY=SG.YOUR_KEY_HERE
EMAIL_FROM=noreply@yourdomain.com
AWS_ACCESS_KEY_ID=YOUR_R2_OR_S3_KEY
AWS_SECRET_ACCESS_KEY=YOUR_R2_OR_S3_SECRET
AWS_REGION=auto
AWS_S3_BUCKET=detailing-labs-media
AWS_S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_PUBLIC_URL=https://pub-XXXX.r2.dev
```

---

## Troubleshooting

**Health check fails / deploy stuck**
Check the **Logs** tab in Railway. Ensure `DATABASE_URL` is set and the MySQL service is running. The health check hits `/api/health` — it must return `200 OK`.

**Photos not uploading**
Verify all `AWS_*` variables are set. For Cloudflare R2, confirm `AWS_S3_ENDPOINT` includes your Account ID. Ensure the bucket has public access enabled.

**Emails not sending**
Confirm `SENDGRID_API_KEY` starts with `SG.`. Verify `EMAIL_FROM` is authenticated in SendGrid. Check SendGrid Activity Feed for delivery errors.

**Database connection errors**
Ensure `DATABASE_URL` includes the full connection string with database name. Railway MySQL URLs use a non-standard port — copy it exactly from the Connect tab.

**Login not working**
Confirm `JWT_SECRET` is set and at least 32 characters. Clear browser cookies and try again.

---

## Updating the App

```bash
git add .
git commit -m "Update: description of changes"
git push origin main
```

Railway automatically rebuilds and redeploys on every push to `main`.
