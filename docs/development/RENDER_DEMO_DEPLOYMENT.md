# Render Demo Deployment — Backend (Lake Group CMS)

Operational guide for running the existing backend as a long-running container on
Render for the demo architecture:

```
Public website  → lakegroup.vercel.app        (Vercel, static)
CMS             → <cms origin>                (Vercel, separate project rooted at cms/)
Backend API     → https://<render-service>.onrender.com   (Render, Docker)
PostgreSQL      → Render managed Postgres (or hosted Postgres reachable from Render)
```

The backend is intentionally a long-running Express/Prisma container. Do not move
it to Vercel serverless. The Dockerfile (`backend/Dockerfile`) is the build
source: it installs production deps, generates the Prisma client into
`/app/generated`, copies it into the runtime stage, and runs as the non-root
`node` user.

## Tier choice (read this first)

The application supports `NODE_ENV` of `development | testing | staging | production`.
The production tier has a fail-fast boot gate that **requires** S3 media storage
and a real GitHub release token. For a demo without those external accounts,
use the **staging tier** — it is a supported environment tier, not a validation
bypass, and it keeps the documented demo login working.

| | Demo (staging) | Full production posture |
|---|---|---|
| `NODE_ENV` | `staging` | `production` |
| S3 media | optional (default `local`, ephemeral uploads) | **required** |
| Public-release worker | off (`PUBLIC_RELEASE_ENABLED=false`) | **required** (GitHub token) |
| Demo login `cms-dev@lakegroup.com` | TOTP skipped via `DEV_MFA_SKIP_EMAILS` | requires real TOTP (dev skip is a boot failure) |
| Secure cookies | set `SESSION_COOKIE_SECURE=true` explicitly | enforced |
| MFA roles | set `MFA_REQUIRED_ROLES` explicitly | enforced (all roles) |

If you choose full production posture, you need a real S3-compatible bucket/CDN
and a GitHub fine-grained token (Contents write on the release repo) before the
gate passes. Everything below works for both; differences are marked.

## Render service setup

1. Render Dashboard → New → **Web Service** → connect the repo, root directory `backend`.
2. Environment: **Docker**; Render uses `backend/Dockerfile` automatically (Build from Dockerfile).
3. Health check path: `/health` (the Dockerfile HEALTHCHECK also probes it internally).
4. Add a **PostgreSQL** instance (Render managed) and use its internal connection string.
5. Set the environment variables below, then **Deploy**.

Migrations are NOT run by the container (owner credentials never enter the
runtime). After the first deploy, run migrations once from a machine that can
reach the database:

```bash
cd backend
DATABASE_URL="<owner connection string>" npm run db:migrate   # prisma migrate deploy
```

Optional demo data:

```bash
DATABASE_URL="<owner connection string>" npm run seed:content  # seed companies/news/etc.
```

## Environment variables (names only — generate your own values)

### Required, both tiers

| Variable | Purpose | How to generate |
|---|---|---|
| `NODE_ENV` | `staging` (demo) or `production` | — |
| `PORT` | Render injects this automatically | — |
| `DATABASE_URL` | owner/migration URL (release jobs only) | Render Postgres internal URL |
| `DATABASE_URL_RUNTIME` | runtime DML URL (the running server) | same database, runtime role |
| `SESSION_SECRET` | session signing secret (≥ 32 chars) | `openssl rand -hex 32` |
| `MFA_ENCRYPTION_KEY` | AES-256-GCM for TOTP seeds — **exactly 32 bytes, Base64** | `openssl rand -base64 32` |
| `SESSION_COOKIE_SECURE` | `true` (both tiers run behind TLS) | — |
| `TRUST_PROXY` | `1` (Render ingress is the single trusted hop) | — |
| `MFA_REQUIRED_ROLES` | `SUPER_ADMIN,EDITOR,REVIEWER,CONTACT_MANAGER,VIEWER` | — |
| `CMS_ALLOWED_ORIGINS` | exact HTTPS origin of the deployed CMS | e.g. `https://<cms-origin>` |
| `CSRF_ALLOWED_ORIGINS` | must include every CMS origin | same as above |

### Demo (staging) extras

| Variable | Purpose |
|---|---|
| `DEV_MFA_SKIP_EMAILS` | `cms-dev@lakegroup.com` — keeps the documented demo login TOTP-free. **Never set in production (boot failure).** |
| `MEDIA_STORAGE_DRIVER` | `local` (uploads are ephemeral on Render — acceptable for demo) |
| `BACKUP_ENCRYPTION_KEY` / `BACKUP_STORAGE_PREFIX` / `BACKUP_RETENTION_DAYS` | optional in staging; recommended |

### Full production posture extras (required by the gate)

| Variable | Purpose |
|---|---|
| `MEDIA_STORAGE_DRIVER=s3`, `MEDIA_PUBLIC_BASE_URL`, `S3_REGION`, `S3_BUCKET` | S3-compatible media with public CDN origin |
| `PUBLIC_RELEASE_ENABLED=true` | release worker on |
| `PUBLIC_RELEASE_GITHUB_REPOSITORY`, `PUBLIC_RELEASE_GITHUB_TOKEN` | owner/repo + fine-grained dispatch token |
| `PUBLIC_RELEASE_API_BASE_URL` | exact HTTPS API origin |

### Never set

- `DEV_MFA_SKIP_EMAILS` in production (hard boot failure)
- `*` in `CMS_ALLOWED_ORIGINS` / `CSRF_ALLOWED_ORIGINS` (credentials CORS requires exact origins)
- Any secret in source, the Dockerfile, or Git — Render env/secrets only

## Verifying the MFA key without revealing it

```bash
cd backend
node scripts/check-mfa-key.js .env.render     # validates the local key file
node scripts/check-mfa-key.js                 # validates the Render env value (run locally with the same value)
```

Output is metadata only: `VALID/INVALID — decoded byte length: N — canonical base64: yes/no`.
The service refuses to boot on an invalid key by design; the error names the
variable, the format, and the generation command without exposing anything.

## CMS → API wiring (after backend is healthy)

1. Deploy the CMS (`cms/` Vite project) to Vercel.
2. Set `VITE_API_BASE_URL=https://<render-service>.onrender.com` on the CMS project.
3. Set `CMS_ALLOWED_ORIGINS` and `CSRF_ALLOWED_ORIGINS` on the backend to the exact
   deployed CMS origin (e.g. `https://cms.lakegroup.com` or the Vercel URL).
4. Redeploy the backend so the origin lists take effect, then log in.

## Health and success criteria

- `GET /health` → `{"status":"ok","service":"lake-group-backend","db":"up",...}`
- Render shows the service as healthy and stable (no crash loop).
- Startup log contains `Lake Group backend listening` and no `secret-box.js` /
  `MFA encryption configuration` error and no `ERR_MODULE_NOT_FOUND`.
- Login, session, logout, and the browser-Back-after-logout behavior verified
  against the deployed API.
