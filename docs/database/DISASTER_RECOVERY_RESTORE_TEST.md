# Disaster Recovery Restore Test — Phase 22

Status: **PASS** — completed live drill 2026-08-14 12:06 local

This document records the live disaster-recovery restore drill for the Lake Group
PostgreSQL foundation. It follows the Phase 22 procedure in
`Lake_Group_PostgreSQL_Central_Data_File_Foundation_Migration_Plan.md`.

PostgreSQL version: 18.4
Source database: `lakegroup`

---

## STEP 1 — Current state (recorded, unchanged)

| Item | Value |
|---|---|
| Database | `lakegroup` |
| Server version | PostgreSQL 18.4 |
| Size | 14 MB |
| Table count | 56 (public schema) |
| Prisma migrations applied | 13 (last applied 2026-08-14) |
| App DB role (DATABASE_URL) | `lake_user` @ 127.0.0.1:5432 |
| Superuser | `postgres` (only role with CREATEDB) |
| pg_hba | scram-sha-256 for all local/host entries (no trust fallback) |

Row counts (live `lakegroup`, recorded at drill time):

| Entity | Count | | Entity | Count |
|---|---|---|---|---|
| User | 4 | | Metric | 6 |
| Company | 21 | | Contact | 16 |
| News | 41 | | CareerListing | 5 |
| Category | 13 | | CSREntry | 6 |
| Leadership | 8 | | Page | 47 |
| Project | 6 | | AuditLog | 808 |
| Media | 67 | | AnalyticsEvent | 2784 |
| _prisma_migrations | 13 | | rate_limit | 0 (empty table, migration 0013) |
| session | 11 | | ContentBlock | 1 |

## STEP 2 — Backup verification

### Existing backup (kept, not deleted)
- File: `backend/backups/lakegroup-20260812111606.dump.enc`
- Size: 311,188 bytes (0.30 MB), created 2026-08-12 11:16
- Format: PostgreSQL custom (`-Fc`), AES-256-GCM encrypted envelope
- **Finding:** `BACKUP_ENCRYPTION_KEY` is **absent** from `backend/.env`. The
  envelope's key is unrecoverable from current config, so this dump cannot be
  restored with the current environment. It is also **stale** (data changed
  08-12 → 08-14). Per the plan it was **kept, not deleted**; it is recorded here
  as unrestorable under current config.

### Fresh backup #1 (created 2026-08-14 11:24) — used for first drill attempt
- File: `backend/backups/lakegroup-20260814112446.dump` (0.37 MB, custom format)
- **Finding:** pre-dated migration `0013_rate_limit` (live had 56 tables/13
  migrations; dump had 55/12). The first drill run caught this as a real
  mismatch (below) — exactly what the drill is for. Per the plan ("if the
  backup is old, create a NEW backup first"), a fresh backup was taken.

### Fresh backup #2 (created 2026-08-14 12:05) — the verified backup
- File: `backend/backups/lakegroup-20260814120548.dump`
- Size: 389,100 bytes (0.38 MB), custom format (`-Fc`), created 2026-08-14 12:05
- Encryption: **none** (no `BACKUP_ENCRYPTION_KEY` set → tool warns). This is a
  deliberate current-config choice; production encryption-at-rest requires the
  key to be set at both backup and restore time.
- Integrity: custom-format dumps carry per-object checksums; `pg_restore`
  validated on restore (exit 0).

## STEP 3 — Isolated scratch database

- Created: `lakegroup_restore_test_20260814120557` via `CREATE DATABASE` as
  `postgres` (superuser). Completely separate from `lakegroup`; no existing
  database was overwritten.

## STEP 4 — Restore

- Command: `pg_restore --clean --if-exists --no-owner -h 127.0.0.1 -p 5432 -U postgres -d lakegroup_restore_test_20260814120557 backups/lakegroup-20260814120548.dump`
- Start: 2026-08-14 12:05:57 | End: 12:05:58 | **Duration: 1.2 s** | Exit code: 0
- Errors/warnings: none

### First drill attempt (recorded for completeness)
The 11:24 dump restored successfully but the verification step reported real
differences vs live: `table_count 56 → 55`, `migrations 13 → 12`, `rate_limit`
absent, `AuditLog 808 → 803`, `session 11 → 10`. Root cause: the dump predated
migration `0013_rate_limit` and 5 audit entries. The drill aborted cleanly
(scratch DB dropped by the `finally` guard), a fresh backup was created, and
the drill was re-run against it. No production data was modified.

## STEP 5 — Database structure verification

| Check | Live `lakegroup` | Restored scratch | Result |
|---|---|---|---|
| Database exists / accepts connections | ✓ | ✓ | PASS |
| Table count | 56 | 56 | IDENTICAL |
| Prisma migrations applied | 13 | 13 | IDENTICAL |
| Per-table row counts (all 56 tables) | — | — | IDENTICAL (zero diffs) |
| Indexes / FKs / constraints | — | — | Restored via dump (custom-format schema replay); no differences reported by pg_restore |

## STEP 6 — Data integrity verification

All **56 tables** row-compared between live and restored scratch — **zero
differences**. Key entity spot checks (also verified via the live API read test
in STEP 8/9):

| Entity | Restored count |
|---|---|
| companies | 21 |
| news | 41 |
| leadership | 8 |
| projects | 6 |
| pages | 47 |
| media | 67 |
| career-listings | 5 |
| csr-entries | 6 |
| contacts | 16 |
| metrics | 6 |

## STEP 7 — Media references

- 67 `Media` records restored in the scratch DB.
- All 67 `url` references resolved to **real files on disk** (repo-relative
  `assets/images/...` paths) — **0 missing**.
- Architecture confirmed as designed: PostgreSQL = structured data + media
  metadata; object storage = binaries. Complete DR = database dump **+**
  `assets/` + `backend/uploads/`. Both layers documented here as required.

## STEP 8 — Application connection test

- The backend was booted against the **scratch** database on a separate port
  (4099) using an isolated env override (`DATABASE_URL` → scratch,
  `PORT=4099`). The normal `backend/.env` was **not** modified.
- `/health` → `{"status":"ok","service":"lake-group-backend","db":"up"}`
- Prisma queries + representative API endpoints work against restored data.

## STEP 9 — Website/CMS read test (against restored data)

| Endpoint | Status | Items |
|---|---|---|
| /api/public/metrics | 200 | 6 |
| /api/public/companies | 200 | 21 |
| /api/public/news | 200 | 41 |
| /api/public/leadership | 200 | 8 |
| /api/public/projects | 200 | 6 |
| /api/public/pages | 200 | 47 |
| /api/public/career-listings | 200 | 5 |
| /api/public/csr-entries | 200 | 6 |
| /api/public/contacts | 200 | 16 |

**9/9 endpoints OK** — the restored database contains sufficient data for the
application to function. Read-only; no production content was published or
modified.

## STEP 10 — Results (this document)

Complete evidence above. Final result: **PASS**.

## STEP 11 — Cleanup

- Isolated test backend stopped (SIGTERM + process kill, port 4099 released).
- Scratch database `lakegroup_restore_test_20260814120557` **dropped** (name
  prefix asserted before DROP).
- Post-cleanup check: `pg_database` lists **only `lakegroup`** — live database,
  real backups, media, and application data all untouched.

## STEP 12 — Final report

> **PHASE 22: PASS**

Evidence: restore 1.2 s exit 0 → 56 tables + 13 migrations + all 56 per-table
row counts identical to live → 67/67 media references resolve to real files →
backend booted against the scratch DB with `/health` db:up → 9/9 public read
endpoints return restored data → scratch DB dropped, live `lakegroup` untouched.

## Findings surfaced by this phase

1. **Backup encryption gap:** the only encrypted dump (08-12) is unrestorable —
   `BACKUP_ENCRYPTION_KEY` is missing from `backend/.env`. Backups are
   currently unencrypted at rest. Either set the key (and re-key old backups)
   or document the key vault.
2. **Backup freshness:** backups must be re-taken after each migration — the
   first drill attempt proved an 11:24 dump missed migration `0013_rate_limit`
   (applied later that day). The verified backup (12:05) is current.
3. **Complete DR = DB + media:** the database dump must be paired with
   `assets/` + `backend/uploads/` (media binaries live outside Postgres — the
   sanctioned architecture).

## Reusable drill tooling

`backend/scripts/_p22_drill.mjs` — one-shot drill (captures baseline, creates
scratch, restores timed, diffs schema + all row counts, verifies media
references, boots backend against scratch on :4099 and probes 9 endpoints,
drops only the scratch DB, prints PASS/FAIL). Safe to re-run after future
migrations:

```bash
cd backend
PGPASSWORD=<postgres-superuser-password> node scripts/_p22_drill.mjs backups/lakegroup-<latest>.dump
```
