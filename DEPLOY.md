# Deploying Detailing Labs to Railway

This guide walks you through deploying the full Detailing Labs stack to [Railway](https://railway.app) using the included `Dockerfile` and `railway.toml`.

---

## Prerequisites

- A [Railway](https://railway.app) account
- Your code pushed to a GitHub repository
- A MySQL database (Railway provides one, or use PlanetScale / Aiven)

---

## Step 1 — Create a Railway Project

1. Go to [railway.app](https://railway.app) and click **New Project**
2. Choose **Deploy from GitHub repo** and select your repository
3. Railway will detect the `Dockerfile` automatically

---

## Step 2 — Add a MySQL Database

1. In your Railway project, click **+ New Service → Database → MySQL**
2. Once provisioned, click the MySQL service and copy the **`DATABASE_URL`** from the **Connect** tab
3. It will look like: `mysql://root:password@containers-us-west-xxx.railway.app:6543/railway`

---

## Step 3 — Set Environment Variables

In your Railway web service, go to **Variables** and add the following:

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string from Step 2 |
| `JWT_SECRET` | Random 64-char secret — run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | Set to `production` |

### Manus OAuth (Authentication)

The app uses Manus OAuth for sign-in. You need a Manus app configured with your Railway domain as the callback URL.

| Variable | Value |
|---|---|
| `VITE_APP_ID` | Your Manus App ID |
| `OAUTH_SERVER_URL` | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | `https://auth.manus.im` |
| `OWNER_OPEN_ID` | Your Manus OpenID (to auto-assign admin role) |
| `OWNER_NAME` | Your name |

**Update your Manus OAuth callback URL:**
After Railway assigns your domain (e.g. `https://detailing-labs.up.railway.app`), go to your Manus app settings and add:
```
https://your-railway-domain.up.railway.app/api/oauth/callback
```

### File Storage (for photo uploads)

The media gallery and job photos require S3-compatible storage.

| Variable | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS / Cloudflare R2 access key |
| `AWS_SECRET_ACCESS_KEY` | AWS / Cloudflare R2 secret key |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_S3_BUCKET` | Your bucket name |
| `STORAGE_PUBLIC_URL` | Public base URL for files, e.g. `https://your-bucket.s3.amazonaws.com` |

> **Recommended:** Use [Cloudflare R2](https://developers.cloudflare.com/r2/) — it has no egress fees and is S3-compatible.

### Optional (Manus Platform Features)

If you want LLM features and owner notifications to work outside of Manus hosting:

| Variable | Description |
|---|---|
| `BUILT_IN_FORGE_API_URL` | Manus Forge API URL |
| `BUILT_IN_FORGE_API_KEY` | Server-side Forge API key |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend Forge API key |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend Forge API URL |

---

## Step 4 — Run Database Migrations

After your first deploy, run the database migrations. In Railway, open the **Shell** tab of your service and run:

```bash
pnpm drizzle-kit migrate
```

Or add it as a start command prefix in `railway.toml`:

```toml
[deploy]
startCommand = "pnpm drizzle-kit migrate && node dist/index.js"
```

---

## Step 5 — Set Your Custom Domain

1. In Railway, go to your service → **Settings → Networking → Custom Domain**
2. Add your domain (e.g. `detailinglabswi.com`)
3. Follow the DNS instructions to point your domain to Railway

---

## Step 6 — Seed Initial Data (First Deploy Only)

After migrations, seed the initial services, packages, and settings by running the SQL from `drizzle/seed.sql` (if present) or via the Railway database console.

---

## Build & Start Commands (already in railway.toml)

```toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/api/health"
```

---

## Troubleshooting

**Login redirects to wrong URL after sign-in**
Make sure your Manus OAuth app's allowed callback URLs include your exact Railway domain.

**Photos not uploading**
Check that all `AWS_*` and `STORAGE_PUBLIC_URL` variables are set correctly.

**Database connection errors**
Verify `DATABASE_URL` is the full connection string including the database name, and that Railway's MySQL service is running.

---

## Architecture on Railway

```
Railway Project
├── Web Service (this app — Dockerfile)
│   ├── Express API  (/api/*)
│   ├── tRPC         (/api/trpc/*)
│   └── Vite SPA     (all other routes)
└── MySQL Service
```
