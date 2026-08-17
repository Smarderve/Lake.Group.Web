# Local Development Setup — Lake Group CMS

How to start the whole stack on this PC (Windows) and sign in to the CMS with
the demo account. This documents the manual start/stop workflow; nothing here
requires Docker, cloud credentials, or anything beyond the local PostgreSQL
already installed.

## Prerequisites (already installed)

| Piece | Where | Port |
|---|---|---|
| PostgreSQL 18 | Windows service `postgresql-x64-18` | 5432 (loopback only) |
| Backend API | `backend/` (Express + Prisma) | 4000 |
| CMS frontend | `cms/` (React + Vite) | 5173 |
| Public site (optional) | repository root (static, Vercel-served in prod) | 4173 local preview |

## START LOCAL DEVELOPMENT

Open a PowerShell (or Git Bash) terminal in the repository root
(`C:\Users\USER\Documents\lake.group.web`).

### 1. Start PostgreSQL

```powershell
Get-Service postgresql-x64-18        # check status
Start-Service postgresql-x64-18      # start if stopped
```

If you prefer the Services UI: `services.msc` → `postgresql-x64-18` → Start.

### 2. Start the backend/API

```powershell
cd backend
npm run dev
```

- Listens on `http://127.0.0.1:4000`
- Health check: `http://127.0.0.1:4000/health` should return `{"status":"ok",...,"db":"up"}`
- `--watch` reloads on file changes; leave this terminal open.

### 3. Start the CMS frontend

```powershell
cd cms
npm run dev
```

- Listens on `http://127.0.0.1:5173` (Vite default; prints the exact URL).

### 4. Open the CMS

Browse to `http://127.0.0.1:5173`.

### 5. Sign in as the demo account

| Field | Value |
|---|---|
| Email | `cms-dev@lakegroup.com` |
| Password | `LakeDev2026!` |

The account is `SUPER_ADMIN`. In development it **skips the TOTP step**
(`DEV_MFA_SKIP_EMAILS=cms-dev@lakegroup.com` in `backend/.env`) — the password
is still verified; only the authenticator prompt is bypassed so the demo
account works without an app. The skip is recorded in the audit log
(`devMfaSkip: true`) and is a **boot failure in production** — it can never
apply to real accounts.

## STOP LOCAL DEVELOPMENT

```powershell
# Stop the CMS (Ctrl+C in the cms terminal, or)
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*vite*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# Stop the backend (Ctrl+C in the backend terminal, or find the node process on :4000)
netstat -ano | findstr ":4000"
Stop-Process -Id <PID> -Force

# Stop PostgreSQL (optional — leave running for next time)
Stop-Service postgresql-x64-18
```

## Rebuilding / reseeding (only if needed)

```powershell
cd backend
npm run db:migrate    # apply Prisma migrations
npm run seed:all      # metrics + governed content (idempotent upserts)
```

## Accounts

- `cms-dev@lakegroup.com` / `LakeDev2026!` — SUPER_ADMIN demo account
  (TOTP enrolled but skipped in development via `DEV_MFA_SKIP_EMAILS`).
- Other governed accounts (`approver@lakegroup.com`, `viewer@lakegroup.com`)
  exist in the database; their passwords are not stored anywhere in the repo
  and were not reset by this setup. Use `npm run create-user -- --email <addr> --role <role> --password '<pw>'` to set a known password if needed.

## Security notes

- `DEV_MFA_SKIP_EMAILS` must **never** be set with `NODE_ENV=production` —
  the backend refuses to boot (fail-fast) if it is.
- Production MFA posture is unchanged: all CMS roles require enrollment and
  the TOTP step at login.
- The login limiter (10 failed attempts per 24h per IP) is **persistent**: it
  lives in the `rate_limit` PostgreSQL table (migration `0013_rate_limit`)
  instead of memory, so a backend restart never resets the budget. Only
  failed logins count; the MFA limiter stays in-memory (5 failed codes per
  15 min).
- If you lock yourself out during local testing, clear the budget for your
  IP:
  ```sql
  DELETE FROM rate_limit WHERE "key" = 'login:127.0.0.1';
  ```
