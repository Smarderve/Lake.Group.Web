# Render PostgreSQL Recovery Audit (Read-Only)

**Date:** 2026-08-18
**Scope:** Audit of the new Render PostgreSQL database (old DB deleted) — expected schema vs new DB vs backups vs local PostgreSQL — and a recommended, safe migration plan.
**Constraint honored:** READ-ONLY. No writes to any database were performed. All recovery commands below are marked **NOT EXECUTED** and require explicit human approval.

---

## 1. Executive Summary

| Source | Status | Contents |
|---|---|---|
| **Local PostgreSQL 18** (`127.0.0.1:5432/lakegroup`) | **COMPLETE — original data intact** | 57 tables, 14/14 migrations applied, full CMS data (21 companies, 47 pages, 41 news, 4 users, 822 audit logs, 2784 analytics events, …) |
| **Backups** (`backend/backups/`) | 4 files — 3 plaintext custom-format dumps + 1 encrypted | Freshest: `lakegroup-20260817140630.dump` = full 57-table snapshot of the original database (taken 1 day before this session) |
| **New Render PostgreSQL** (`dpg-da1h72p5efls73ehbv40-a…render.com`) | **Empty (no application tables)** | Direct verification from this machine is **blocked by Render's IP allowlist / network policy** (server requires SSL, then drops the connection). User-reported `P2021 table does not exist` confirms no schema. |
| **Old Render DB** | Deleted | No snapshot available from Render side; data survives only via the local DB + dumps. |

**Conclusion:** The original database is **not lost**. The complete, authoritative copy lives in the local PostgreSQL 18 `lakegroup` database (the DB the backend `.env` points at), with 3 plaintext backups of it in `backend/backups/`. The new Render DB simply needs the schema + data restored into it — the repo already contains a purpose-built, safe helper for exactly this: `backend/scripts/_render_migrate.mjs`.

---

## 2. Expected Schema (from repository)

- `backend/prisma/schema.prisma`: **53 models**, **10 enums** (CareerListingStatus, ContactType, ContentBlockType, GovernedStatus, LeadershipEventType, MetricStatus, RelationshipType, Role, ScheduleStatus, VerificationStatus)
- Migrations: **14 applied** on the original DB (`0001_init` → `0014_user_preferences`; repo holds 15 SQL files including `0001_init` base)
- Total public tables: **57** = 53 model tables + `_prisma_migrations` + `rate_limit` + `session` + `user_preferences`
- Prisma 7 (`prisma.config.ts`), shadow DB `lakegroup_shadow`, runtime least-privilege role `lake_app` (`scripts/db-roles.sql`)

---

## 3. Current State — Verified Facts

### 3.1 Local PostgreSQL 18 — COMPLETE (audited read-only)
Server: PostgreSQL 18.4, database `lakegroup`, schema `public` only, **57 tables**, `_prisma_migrations` = **14 rows, all finished**, 10 enums.

Key row counts (read-only `count(*)`):

| Table | Rows | Table | Rows |
|---|---|---|---|
| Company / CompanyVersion | 21 / 21 | Page / PageVersion | 47 / 47 |
| News / NewsVersion | 41 / 45 | Metric | 6 |
| HistoryEvent | 10 | Leadership | 8 |
| Category | 13 | Project | 6 |
| Facility | 31 | Country | 10 |
| Media | 67 | ContentBlock | 1 |
| Contact | 16 | CareerListing | 5 |
| CSREntry | 6 | User | 4 |
| AuditLog | 822 | AnalyticsEvent | 2784 |
| UnansweredQuestion | 23 | PublicationEvent | 5 |
| Notification | 12 | user_preferences | 3 |

Empty tables (12): CompanyRelationship(+Version), LeadershipEvent, MediaFolder, MediaUsage, MetricVersion, Milestone, PageContentBlock, ProductService(+Version), PublishSchedule, session — expected for current content state.

Migrations applied locally: `0001_init` … `0014_user_preferences` (latest finished 2026-08-14T12:38:40Z) — matches repo migration set.

### 3.2 Backups — `backend/backups/`
| File | Size | Format | Contents |
|---|---|---|---|
| `lakegroup-20260812111606.dump.enc` | 311 KB | **ENCRYPTED** (AES-256-GCM envelope: `[12B IV][16B tag][ciphertext]`, magic `543fae367d`, not `PGDMP`) | Pre-0011-era snapshot; **cannot be decrypted** — `BACKUP_ENCRYPTION_KEY` is not present in `.env`, `.env.render`, or `.env.render.staging` (only a placeholder in `.env.example`) |
| `lakegroup-20260814112446.dump` | 387 KB | `PGDMP` custom format | 55 tables with data (pre-`0013_rate_limit`/`0014_user_preferences`) |
| `lakegroup-20260814120548.dump` | 389 KB | `PGDMP` custom format | 56 tables with data (after `0013`, pre-`0014`) |
| `lakegroup-20260817140630.dump` | 392 KB | `PGDMP` custom format | **57 tables with data — full snapshot, most recent (2026-08-17)** |

Provenance: all dumps' TOC owner = `lake_user` = the local DB user in `backend/.env` (Render user is `lake_group_database_user`) → **all dumps are backups of the local `lakegroup` database**. Tooling: `scripts/backup-db.js` (`pg_dump -Fc`), `scripts/restore-db.js` (`pg_restore --clean --if-exists --no-owner`).

### 3.3 New Render PostgreSQL — NOT verifiable from this machine
- Target: `dpg-da1h72p5efls73ehbv40-a.singapore-postgres.render.com:5432/lake_group_database` (user `lake_group_database_user`)
- Probe results (read-only, 3 SSL modes): `SSL disable` → `28000 SSL/TLS required`; `SSL require` / `no-verify` → **`Connection terminated unexpectedly`** (connection dropped after handshake)
- Interpretation: Render PostgreSQL **IP-allowlist / network policy** blocks clients outside Render's network. The Render-deployed backend can reach it (`/health` → `db: up`), but the app fails with `P2021 table does not exist` → **no application tables** (fresh DB, schema never applied).
- Consequence: verification/restore must run from **inside Render's network** (e.g., a one-off Render shell service) or after adding this machine's public IP to the DB's **IP Allowlist** in the Render dashboard.

### 3.4 Old Render DB
Deleted. Render PostgreSQL does not retain snapshots of deleted databases. Data survives only via 3.1/3.2.

---

## 4. Recommended Recovery (NOT EXECUTED — requires approval)

The repo already ships `backend/scripts/_render_migrate.mjs` (safety-first helper: secrets never printed; refuses to restore over a non-empty DB; `verify` → `restore` → `compare` → `boottest`). Recommended path:

1. **Unblock connectivity** — either
   - (a) add this machine's public IP to the Render DB **IP Allowlist** (Render dashboard → DB → Settings → Access), or
   - (b) run step 2 from a one-off Render service (same network as the backend).
2. **Verify** (read-only): `node scripts/_render_migrate.mjs verify` — expects `No public tables — database is fresh/empty.`
3. **Restore** (WRITE — approval required): `node scripts/_render_migrate.mjs restore backups/lakegroup-20260817140630.dump`
   - Uses `pg_restore --no-owner --no-privileges --exit-on-error` with `PGSSLMODE=require`; auto-blocks if the Render DB already has any public tables.
4. **Compare** (read-only): `node scripts/_render_migrate.mjs compare` — exact per-table `count(*)` local vs Render; expects `ALL TABLE COUNTS MATCH local === render` + MFA metadata spot-check (email / mfaEnabled / 6-char prefix only).
5. **Boottest** (read-only): `node scripts/_render_migrate.mjs boottest` — boots the backend on port 4105 against Render; expects `/health` OK and `/api/public/companies` = 21.
6. **Deploy env on Render** — ensure the Render service env includes the migrated data prerequisites: `MFA_ENCRYPTION_KEY` (must equal the local key that sealed the MFA data), `SESSION_SECRET`, `SESSION_COOKIE_SECURE`, `CSRF_ALLOWED_ORIGINS`, `DATABASE_URL` (Render internal URL, `sslmode=require`).

### Fallback options (NOT recommended)
- **B — rebuild from seed scripts** (`prisma migrate deploy` + `seed:metrics` + `seed:content` + `create-user`): produces a schema + seed content but **loses** users/passwords, MFA, media, contacts, audit logs, analytics, unanswered questions, publication events, and all CMS-authored edits.
- **C — keep using local DB**: fine for development; not a production deployment.

---

## 5. Risks & Notes

- **Encrypted dump** (`…12111606.dump.enc`) is not usable without the original `BACKUP_ENCRYPTION_KEY` (not in the repo). It is superseded by the Aug 17 plaintext dump anyway.
- **MFA data**: `User.mfaSecret` is sealed with `MFA_ENCRYPTION_KEY` from local `.env`. After restore, the Render backend must use the **same key**, or MFA verification will fail for those users.
- **Restore over non-empty DB is blocked by the helper** — good; if the Render DB ever gets partial schema (e.g., a failed `prisma migrate deploy`), restore is refused and the DB must first be reset (requires human decision; not included here).
- **`--no-owner --no-privileges`** means the `lake_app` least-privilege runtime role must be (re)created on Render and granted per `scripts/db-roles.sql` semantics; Render's DB user owns the objects after restore.
- 14 migrations vs 15 repo SQL files is normal (`0001_init` is the base).

## 6. Read-Only Compliance

Audit performed: schema/table/enum/migration listing, row counts, dump TOC listing, env-file metadata parsing, connection probes. **No INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE executed on any database.** All recovery commands in §4 are `NOT EXECUTED` pending approval.