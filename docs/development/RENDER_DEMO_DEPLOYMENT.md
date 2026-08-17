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

## Why the service crashes at startup (read this first)

The Dockerfile's runtime stage sets `ENV NODE_ENV=production` — a secure
container default. That means **unless the Render service explicitly sets
`NODE_ENV=staging`, the image boots in the production tier**, and the production
fail-fast gate (`productionConfigProblems` in `src/config.js`) refuses to start:

```text
DATABASE_URL is not set ...
refusing to start: insecure production configuration
```

followed by the full production checklist (DATABASE_URL_RUNTIME, SESSION_SECRET,
CMS_ALLOWED_ORIGINS, BACKUP_*, MEDIA_STORAGE_DRIVER=s3, S3_*, PUBLIC_RELEASE_*,
…). The Docker build is fine — this is purely a tier-configuration issue.

Render injects service environment variables at container runtime, and runtime
environment variables **override** the image's `ENV` defaults. So the fix is
exactly one dashboard setting:

**Proof the service is in production mode:** the startup log now prints the tier
*before* the gate, so the Render log shows exactly why the gate ran:

```text
{"env":"production","isProduction":true,...,"msg":"boot environment"}
{"level":60,...,"problems":["DATABASE_URL is required in production",...],"msg":"refusing to start: insecure production configuration"}
```

If the log shows `"env":"production"`, the service env (or the Dockerfile
default) is forcing production. The fix:

```text
KEY:   NODE_ENV
VALUE: staging
```

Do NOT change the Dockerfile to remove the production default — production-by-
default is correct for any container, and a deployment that forgets `NODE_ENV`
should fail closed (as it does now) rather than silently boot in development
mode. The boot log now always prints the active tier, so the Render log shows
instantly which mode the service is in:

```text
{"env":"staging","port":10000,...,"msg":"Lake Group backend listening"}
```

## Tier choice (read this first)

The application supports `NODE_ENV` of `development | testing | staging | production`
— this is the repository's own configuration contract (`src/config.js`), not a
workaround. The production tier has a fail-fast boot gate that **requires** S3
media storage and a real GitHub release token. For a demo without those external
accounts, the **staging tier** is the supported pre-production tier; it keeps the
documented demo login working and still enforces secure cookies, MFA roles, and
origin allowlists when set explicitly. Only the S3/release requirements are
relaxed, and the release worker stays off (`PUBLIC_RELEASE_ENABLED=false`).

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

> **Database gotcha:** `GET /health` returns **503** whenever the database is
> unreachable or `DATABASE_URL` is unset. The Dockerfile HEALTHCHECK treats a
> non-200 as failure, so a service deployed without a reachable database is
> marked unhealthy and restarted by Render in a loop. The demo therefore needs
> `DATABASE_URL`/`DATABASE_URL_RUNTIME` pointing at a reachable Postgres from
> the first deploy. A fresh empty Render Postgres is enough for boot and
> `/health` (`SELECT 1` works on an empty database); tables (migrations) and
> seed data are a separate step below.

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

> **Migration already complete (2026-08-17):** the Render database already
> contains the full migrated local database — all **14/14 migrations are
> present** in `_prisma_migrations`, so `npm run db:migrate` will be a **no-op**.
> **Do NOT reseed** (`seed:content` upserts by slug — harmless but unnecessary)
> and never run `migrate reset`/`migrate dev` against it.

## Environment variables (names only — generate your own values)

### Required, both tiers

| Variable | Purpose | How to generate |
|---|---|---|
| `NODE_ENV` | `staging` (demo) or `production` | — |
| `PORT` | Render injects this automatically | — |
| `DATABASE_URL` | owner/migration URL (release jobs only) | Render Postgres internal URL |
| `DATABASE_URL_RUNTIME` | runtime DML URL (the running server) | same database, runtime role |
| `SESSION_SECRET` | session signing secret (≥ 32 chars) | `openssl rand -hex 32` |
| `MFA_ENCRYPTION_KEY` | AES-256-GCM for TOTP seeds — **exactly 32 bytes, Base64** | **Migrated DB: copy the raw value from `backend/.env`** (the key that sealed the existing MFA secrets — do NOT generate a new one). Fresh DB: `openssl rand -base64 32` |
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

## Setting MFA_ENCRYPTION_KEY in the Render dashboard (exact structure)

Render env vars are **key/value pairs** — the value field takes the raw value,
never a shell-style assignment:

```text
KEY:   MFA_ENCRYPTION_KEY
VALUE: <the actual Base64-encoded 32-byte value, raw — no quotes, no "KEY=", no spaces>
```

Common mistakes that produce exactly the `secret-box.js` failure:

- pasting `MFA_ENCRYPTION_KEY=...` (with the `KEY=` prefix) into the value field
- pasting the value with surrounding double quotes (from a `.env` file line)
- pasting `openssl rand -base64 32` (the command, not its output)
- pasting a hex string (64 hex chars decode to 48 bytes, not 32)
- leaving the `.env.example` placeholder `change_me_generate_exactly_32_base64_bytes`
- pointing Render at the file path `backend/.env.render` (Render never reads local files)
- trailing whitespace/newline copied from a terminal
- a value that decodes to **31 bytes** (the diagnostic reports
  `decodedBytes:31`) — the base64 was truncated/edited while pasting; the app
  requires exactly 32 decoded bytes. Re-paste the full raw value from
  `backend/.env` without any edits.

If the value was pasted into the wrong variable name (for example under a
`DATABASE_URL` or a typo'd key), the app reports the key as absent.

### Choosing the right key value (rotation rule)

- **Migrated/copied local database** (this project's situation): the local
  database already contains **1 sealed MFA secret** (`enc:v1:` on
  `cms-dev@lakegroup.com`, verified with a count query), sealed with the local
  `backend/.env` key. The Render `MFA_ENCRYPTION_KEY` **must be the raw value
  from `backend/.env`** — using any other key (including the `.env.render`
  value, which is a different valid key) makes that secret undecryptable. The
  two local keys are different; `keysMatch: false` is expected and confirms
  the choice matters.
- **Fresh demo database** (no copied users): either valid key works, but there
  is no reason to risk it — use the `backend/.env` key.
- Never rotate a key on a database that already holds `enc:v1:` secrets without
  re-enrolling the affected users.

## Exact Render dashboard steps (10 minutes)

1. Open **Render** → open the backend **Web Service**.
2. Click **Environment** (left sidebar).
3. Add/change **every** variable from the checklist below — each is one
   `KEY` / `VALUE` pair (the value field takes the raw value only).
   - **Database values:** copy from Render → your PostgreSQL ("Lake Group Web
     Database") → **Connections → Internal Database URL**.
   - **MFA key:** copy from this PC → `backend/.env` → the raw value after
     `MFA_ENCRYPTION_KEY=` (validated: 32 bytes). Never `.env.render`'s key.
4. Click **Save Changes**, then **Deploy** (or Manual Deploy → Deploy latest commit).
5. Wait for the build, then open `https://<service>.onrender.com/health`.
6. Expected: `{"status":"ok",...,"db":"up"}` and a startup log ending in
   `{"env":"staging",...} "Lake Group backend listening"`. The first log
   lines must show `"mfaKey":{"present":true,"formatValid":true,"decodedBytes":32}`
   and `"env":"staging","isProduction":false`.
7. If it fails, copy the startup log back to the agent — the first lines show
   whether the tier, the MFA key, or the database is the problem.

### Checklist (KEY / VALUE — generate your own secrets)

| KEY | VALUE | Secret? |
|---|---|---|
| `NODE_ENV` | `staging` | no |
| `PORT` | Render sets this automatically (leave blank) | no |
| `DATABASE_URL` | **Copy this from Render → your PostgreSQL → Connections → Internal Database URL** (NOT the External URL — that was only for the one-time migration) | **yes** |
| `DATABASE_URL_RUNTIME` | same Internal URL (staging allows owner = runtime) | **yes** |
| `SESSION_SECRET` | `openssl rand -hex 32` output (new value for Render; old local sessions simply become invalid, users re-login) | **yes** |
| `MFA_ENCRYPTION_KEY` | **Copy this from `backend/.env`** (raw value after `=` — already validated: 32 bytes). Do NOT paste `.env.render`'s key and do NOT generate a new one — the migrated DB's MFA secret is sealed with the `.env` key | **yes** |
| `SESSION_COOKIE_SECURE` | `true` | no |
| `TRUST_PROXY` | `1` | no |
| `MFA_REQUIRED_ROLES` | `SUPER_ADMIN,EDITOR,REVIEWER,CONTACT_MANAGER,VIEWER` | no |
| `CMS_ALLOWED_ORIGINS` | exact CMS origin, e.g. `https://<cms-origin>` | no |
| `CSRF_ALLOWED_ORIGINS` | same CMS origin(s) as above | no |
| `DEV_MFA_SKIP_EMAILS` | `cms-dev@lakegroup.com` (demo login; **never** in production) | no |
| `MEDIA_STORAGE_DRIVER` | `local` (ephemeral uploads — fine for demo) | no |

Migrations and seed data are NOT run by the container. **This database is
already migrated (2026-08-17) — all 14/14 migrations are present**, so nothing
needs to be applied; do not reseed and never run `migrate reset`/`migrate dev`
against it (see the migration-complete note above).

## Verifying the MFA key without revealing it

```bash
cd backend
node scripts/check-mfa-key.js .env.render     # validates the local key file
node scripts/check-mfa-key.js                 # validates the Render env value (run locally with the same value)
```

Output is metadata only: `VALID/INVALID — decoded byte length: N — canonical base64: yes/no`.
The service refuses to boot on an invalid key by design; the error names the
variable, the format, and the generation command without exposing anything.

### Startup diagnostic (log, metadata only)

Every boot logs a one-line diagnostic before validation, so the Render log
immediately distinguishes the three cases — never the key itself:

```text
"mfaKey":{"present":false,...}                      # variable missing/empty
"mfaKey":{"present":true,"formatValid":false,"decodedBytes":48}   # malformed (e.g. hex)
"mfaKey":{"present":true,"formatValid":true,"decodedBytes":32}    # correct
```

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
