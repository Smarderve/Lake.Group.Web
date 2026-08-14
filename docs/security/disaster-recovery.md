# Disaster Recovery — Lake Group Platform

**Document Type:** Recovery documentation (SECURITY_ROADMAP Phase 20)
**Last verified:** 2026-08-12 (live drill on the real Postgres 18 instance)

> A backup is not considered reliable until restoration has been tested.
> The restore procedure below is the tested one — it was executed against a
> real dump of the live database on 2026-08-12 (see "Recovery verification").

---

## 1. What is backed up

- **PostgreSQL `lakegroup` database** — all application data: governed
  content and its version history, users, sessions, metrics, news, media
  metadata, audit log (`AuditLog`), publish schedules, analytics events.
- The dump is **custom format** (`pg_dump -Fc`, includes large objects) —
  restorable selectively or fully, and portable across PostgreSQL versions.
- Backups land in `backend/backups/` (gitignored — dumps must never be
  committable) and, when `BACKUP_STORAGE_PREFIX` is set, are copied through
  the configured object-storage adapter after encryption.
- Uploaded media binaries live in S3-compatible object storage. Enable bucket
  versioning and provider replication/backup; PostgreSQL contains their
  governed metadata and immutable object keys, not the binary bytes.
- The application **code and static site are version-controlled** (git) —
  the database is the only state that needs a backup pipeline.

## 2. Backup process

```bash
cd backend
npm run db:backup                # → backups/lakegroup-<UTC stamp>.dump
```

With encryption-at-rest (recommended — the only way a stolen backup file
yields nothing):

```bash
BACKUP_ENCRYPTION_KEY='<long random passphrase>' npm run db:backup
# → backups/lakegroup-<stamp>.dump.enc   (AES-256-GCM; plaintext removed)
```

**Automatic backups:** run the command above on a schedule. On Linux:
`cron`/`systemd-timer` daily or the platform scheduler. Provide
`BACKUP_ENCRYPTION_KEY`, `BACKUP_STORAGE_PREFIX`, and the S3/workload identity
through the job's secret manager. On Windows, use Task Scheduler.

### Encryption key handling (deployment decision)

- `BACKUP_ENCRYPTION_KEY` is a passphrase; the 256-bit key is derived via
  SHA-256. **Without it, backups are stored unencrypted and a warning is
  printed** — encryption is deliberately optional so local dev works, but
  production must set it.
- Store the key OUTSIDE the server (password manager / secret store).
  **Losing the key makes every backup unrestorable** — GCM auth-tag
  verification rejects a wrong key before any SQL runs.
- Rotation: keep the old key available until all backups encrypted under it
  have expired from retention.

### Retention

- `BACKUP_RETENTION_DAYS` (default **14**, `0` = keep everything). After a
  successful backup, dumps older than the window are pruned automatically.
- Production recommendation: daily backups × 14 days on the server **plus**
  one offsite copy per week kept 3 months (see "Separate location").

### Separate location

- On-server backups protect against corruption/deletion/application
  compromise, but **not** server failure or ransomware.
- `scripts/backup-db.js` automatically writes the completed encrypted dump to
  `<BACKUP_STORAGE_PREFIX>/<dump-name>` with private/no-store cache semantics.
  Production startup refuses a missing prefix or weak encryption key.
- Use a backup bucket or replicated account/failure domain separate from the
  database host. Configure provider lifecycle retention and alerts outside the
  repository. Download the selected object into `backend/backups/` before
  running `db:restore`.
- The backup file itself is now encrypted by default when a key is set, so
  offsite storage does not need its own encryption layer (belt and
  suspenders: still use an encrypted bucket if available).

## 3. Restore process

```bash
cd backend

# Plain dump:
npm run db:restore -- backups/lakegroup-20260812.dump

# Encrypted dump (must set the same key used at backup time):
BACKUP_ENCRYPTION_KEY='<the key>' npm run db:restore -- backups/lakegroup-20260812.dump.enc

# DR drill / staging (NEVER point at a live DB by accident — see below):
BACKUP_ENCRYPTION_KEY='<the key>' npm run db:restore -- backups/lakegroup-20260812.dump.enc lakegroup_restore_test
```

- Restore uses `pg_restore --clean --if-exists --no-owner`.
- **DANGER**: restoring into an existing database **drops its contents**
  (`--clean`). The command prints a warning when the target is the main
  database (`MAIN DATABASE — will drop contents!`). For drills, always
  target a scratch database.
- Encrypted dumps are decrypted **in memory and streamed to pg_restore via
  stdin** — plaintext never touches disk (verified live). A wrong key or
  corrupted dump aborts before any SQL runs.
- Restores run with the migration role (`lake_user` / `DATABASE_URL`);
  ownership is not forced (`--no-owner`). After restoring the main DB,
  re-run `npm run db:migrate` if the dump predates a migration, then
  regenerate the Prisma client if the schema changed.

## 4. Recovery order

In a full server-loss scenario:

1. **Provision** a new server and complete the Phase 16 hardening checklist
   (non-root user, firewall, private Postgres on 127.0.0.1, TLS proxy).
2. **Restore the code**: `git clone` the repo (or restore from CI
   artifacts); `npm install`; copy `.env` (secrets from the vault — the
   backup key, `SESSION_SECRET`, `DATABASE_URL`).
3. **Create the database** with the migration role:
   `createdb lakegroup` (as a CREATEDB role) then run
   `npm run db:migrate` to lay down the schema.
4. **Restore the data** (Section 3) from the newest verified offsite
   backup — or if the server itself is intact, from the on-server backups.
5. **Verify** (Section 5) — row counts, a smoke test against the public
   API, and the health endpoint.
6. **Switch traffic** per the Phase 11 runbook (reverse proxy → backend,
   deploy static site, HSTS via `SESSION_COOKIE_SECURE=true`).

Deployment-failure recovery (rollback): the Phase 11 runbook covers it —
keep the previous release's code and DB state; a pre-migration backup makes
a bad migration fully reversible by restoring the pre-change dump.

## 5. Recovery verification

**A backup is not reliable until restoration has been tested.** Procedure
(executed 2026-08-12 against the live DB — this is what "verified" means):

```bash
# 1. Baseline: capture row counts of the live DB
# 2. Backup (with encryption key)
# 3. Create a scratch DB:  CREATE DATABASE lakegroup_restore_test OWNER lake_user
# 4. Restore into the scratch DB (Section 3, encrypted path)
# 5. Compare every table's row count between live and scratch — must match
# 6. Drop the scratch DB
```

2026-08-12 drill result (real data, live Postgres 18):

| Table | Live | Restored |
| --- | --- | --- |
| Company | 18 | 18 ✅ |
| Country | 10 | 10 ✅ |
| News | 41 | 41 ✅ |
| Metric | 6 | 6 ✅ |
| Facility | 31 | 31 ✅ |
| User | 0 | 0 ✅ |
| AuditLog | 584 | 584 ✅ |
| PublishSchedule | 0 | 0 ✅ |
| _prisma_migrations | 11 | 11 ✅ |

The encrypted file was verified opaque on disk (`PGDMP` magic absent) and a
valid `PGDMP` custom-format dump after decryption; retention pruning was
also exercised live (3 expired backups pruned, newest kept).

**Cadence:** re-run this drill quarterly and after any change to the
backup/restore scripts or the schema.
