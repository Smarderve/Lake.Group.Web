# PostgreSQL → Render Migration Runbook (Safe Data Move)

One-time runbook for moving the **existing local `lakegroup` database** (the source of
truth — real project data) into the new **Render managed PostgreSQL** instance
("Lake Group Web Database", PG 18, Singapore), so the hosted backend can serve the
same data without the developer's PC.

**Guiding rule: preservation, not rebuild.** The local database is never modified,
reset, or deleted. The Render database is filled by a verified `pg_dump` / `pg_restore`
copy — not by re-seeding or re-creating content.

```
Local PostgreSQL (lakegroup)  ──pg_dump──▶  verified backup  ──pg_restore──▶  Render PostgreSQL
        ▲ (source of truth, untouched)                                          │
                                                                                ▼
                                                         Render backend (staging) → hosted CMS/API
```

---

## 1. What is already done (evidence on disk)

Executed on 2026-08-17 and recorded here:

| Step | Result |
|---|---|
| Fresh backup | `backend/backups/lakegroup-20260817140630.dump` (custom format, 382 KB, unencrypted) |
| Restore drill (scratch DB) | **PASS** — 57 tables, 14 migrations, row counts identical, 67/67 media files present, backend boots against restored copy, 9/9 public endpoints return data |
| Render-command dry run (`--no-owner --no-privileges --exit-on-error`) | **PASS** — exit 0; 21 companies / 4 users / 67 media / 14 migrations / 57 tables; single owner (the connecting role) |
| MFA key compatibility | The local DB holds 1 sealed TOTP secret (`enc:v1:` on `cms-dev@lakegroup.com`), sealed with the `backend/.env` `MFA_ENCRYPTION_KEY`. **Render must use that exact key** — see §6. |
| Media binaries | All 67 media records point to repo `assets/` files (website static assets). The DB holds metadata only; no binary move is part of this migration (§7). |
| **Migration to Render — EXECUTED** | **2026-08-17**: connection verified (TLS, PG 18.4, `lake_group_database` empty) → `pg_restore --no-owner --no-privileges --exit-on-error` → **exit 0 in 129s** → integrity compare: **57/57 tables exact counts match** → MFA sealed data preserved (`cms-dev@lakegroup.com` `enc:v1`) → backend boot test against Render: `/health` `db: up`, `/api/public/companies` 200 with 21 published companies. Local DB untouched (21/4/67/14 re-verified). |
| Helper tool | `backend/scripts/_render_migrate.mjs` — one-off `verify | restore | compare | boottest` helper that reads secrets from `.env.render`/`.env` and never prints them. |

The dump contains ACL statements referencing the local roles `lake_user`/`lake_app`.
Those roles do not exist on Render, so the restore **must** skip privileges
(`--no-privileges`). The dry run above proves data integrity is unaffected.

---

## 2. Preconditions

- Render Postgres instance exists: **Lake Group Web Database** (PG 18, Singapore).
- The local `lakegroup` database is reachable at `127.0.0.1:5432` (role `postgres` or
  `lake_user`; password via `PGPASSWORD` — never on the command line).
- Render **External Database URL** copied from the dashboard (used for the one-time
  migration from this PC). The **Internal Database URL** is what the Render backend
  service should use in its env vars (private network, same region).

---

## 3. Restore the backup into Render (one-time)

Run from `backend/` on the dev PC. Use the **External** Render URL, adding
`?sslmode=require` (Render requires TLS for external connections).

```bash
cd backend
export PGPASSWORD='<render-db-password>'          # from the External URL, never argv
"/c/Program Files/PostgreSQL/18/bin/pg_restore.exe" \
  --no-owner --no-privileges --exit-on-error \
  -h <render-host> -p 5432 -U <render-user> -d <render-db> \
  backups/lakegroup-20260817140630.dump
```

- `--no-owner` — objects become owned by the Render role (it gets full access; there is
  no `lake_user`/`lake_app` on Render).
- `--no-privileges` — required: the dump's GRANTs reference local roles that do not
  exist on Render (verified in the TOC: `ACL public TABLE … lake_user`, `DEFAULT ACL …`).
- `--exit-on-error` — stop loudly on any unexpected failure instead of restoring a
  partial database.

**Expected:** exit 0. If it fails, stop and report the exact error — do not retry
blindly or "fix" it by re-seeding.

### Alternative: scripted restore via the existing tool

The repository's `npm run db:restore` does **not** pass `--no-privileges`, so it must
NOT be used against Render as-is (it would fail on the role GRANTs). Use the direct
`pg_restore` command above, or extend `restore-db.js` with a `--no-acl` option first.

---

## 4. Verify the migrated Render database

```bash
# 1. Structural + row-count comparison (local vs Render) — metadata only
PGPASSWORD='<local-password>' "/c/Program Files/PostgreSQL/18/bin/psql.exe" \
  -h 127.0.0.1 -U postgres -d lakegroup -c \
  "SELECT 'users', count(*) FROM \"User\" UNION ALL SELECT 'companies', count(*) FROM \"Company\" UNION ALL SELECT 'news', count(*) FROM \"News\" UNION ALL SELECT 'media', count(*) FROM \"Media\" UNION ALL SELECT 'audit_logs', count(*) FROM \"AuditLog\";"

PGPASSWORD='<render-password>' PGSSLMODE=require "/c/Program Files/PostgreSQL/18/bin/psql.exe" \
  -h <render-host> -U <render-user> -d <render-db> -c \
  "SELECT 'users', count(*) FROM \"User\" UNION ALL SELECT 'companies', count(*) FROM \"Company\" UNION ALL SELECT 'news', count(*) FROM \"News\" UNION ALL SELECT 'media', count(*) FROM \"Media\" UNION ALL SELECT 'audit_logs', count(*) FROM \"AuditLog\";"
```

Expected: **users 4, companies 21, news 41, media 67, audit_logs 820** (must match local).

```bash
# 2. Prisma state — all 14 migrations present, no drift, nothing to apply
cd backend
DATABASE_URL="<render-external-url>?sslmode=require" npx prisma migrate status
# → "Database schema is up to date!" (all 14 migrations already in _prisma_migrations)
# Do NOT run `prisma migrate reset` or `prisma migrate dev` against Render.
```

```bash
# 3. MFA data preserved (metadata only — never print secrets)
... -c "SELECT email, \"mfaEnabled\", left(\"mfaSecret\", 6) FROM \"User\";"
# → cms-dev@lakegroup.com  t  enc:v1   (must match local)
```

---

## 5. Render backend environment (names only — generate/paste your own values)

| KEY | VALUE | Secret? |
|---|---|---|
| `NODE_ENV` | `staging` (demo tier; production tier requires S3 + GitHub token) | no |
| `PORT` | Render sets it automatically | no |
| `DATABASE_URL` | Render Postgres **Internal** connection string | yes |
| `DATABASE_URL_RUNTIME` | same URL (staging allows owner = runtime) | yes |
| `SESSION_SECRET` | `openssl rand -hex 32` output | yes |
| `MFA_ENCRYPTION_KEY` | **raw value from `backend/.env`** (see §6) | yes |
| `SESSION_COOKIE_SECURE` | `true` | no |
| `TRUST_PROXY` | `1` | no |
| `MFA_REQUIRED_ROLES` | `SUPER_ADMIN,EDITOR,REVIEWER,CONTACT_MANAGER,VIEWER` | no |
| `CMS_ALLOWED_ORIGINS` | exact deployed CMS origin (e.g. `https://<cms>.vercel.app`) | no |
| `CSRF_ALLOWED_ORIGINS` | same origin(s) | no |
| `DEV_MFA_SKIP_EMAILS` | `cms-dev@lakegroup.com` (demo login; **never** in production) | no |
| `MEDIA_STORAGE_DRIVER` | `local` (ephemeral uploads, fine for demo) | no |

Never use `*` in the origin lists; never commit any secret.

---

## 6. MFA encryption key — MUST NOT rotate

The migrated database contains `cms-dev@lakegroup.com`'s TOTP secret sealed as
`enc:v1:` with the **`backend/.env`** `MFA_ENCRYPTION_KEY`. Render's
`MFA_ENCRYPTION_KEY` must be that exact raw value — `.env.render` holds a different
(also valid) key that would make the secret undecryptable. Validating locally:

```bash
cd backend && node scripts/check-mfa-key.js .env      # must report 32 bytes, canonical
```

Never rotate the key on a database that already holds `enc:v1:` secrets without
re-enrolling the affected user first.

---

## 7. Media storage — separate from the database

- The 67 media records are **metadata**; their `url` values are repo-relative
  `assets/...` paths — the binaries ship with the public website (Vercel).
- `backend/uploads/` is empty; `MEDIA_STORAGE_DRIVER=local` (demo).
- **No media file was moved or deleted** by this migration, and none should be.
  Media/object storage migration is a separate task (e.g. S3 + `MEDIA_PUBLIC_BASE_URL`).

---

## 8. Safety rules (read before executing)

1. Never run `prisma migrate reset`, `DROP DATABASE`, or destructive commands against
   `lakegroup` (local or Render) — the Render database is disposable, the local one is not.
2. Never run `npm run db:restore` against Render until it passes `--no-privileges`
   (the current script does not; §3).
3. Never rotate `MFA_ENCRYPTION_KEY` on a migrated database (§6).
4. Never commit secrets: the Render URL belongs in `backend/.env.render` (gitignored),
   not in tracked files.
5. Keep the local database running until Render is verified; the PC remains the
   fallback source of truth until backups/DR are proven from Render.
