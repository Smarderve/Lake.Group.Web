# Phase 6 — PostgreSQL Security: Completion Report

**Date:** 2026-08-11 · **Source:** `SECURITY_ROADMAP.md` §Phase 6

---

## PHASE: 6 — PostgreSQL Security

### Audit result vs. acceptance criteria

| Criterion | Before | After |
| --- | --- | --- |
| Application doesn't use superuser | ✅ `lake_user` (rolsuper=f) | ✅ + runtime role `lake_app` is DML-only |
| Queries are parameterized | ✅ Prisma / parameterized SQL only | ✅ unchanged |
| Database isn't unnecessarily publicly exposed | ⚠️ `listen_addresses = '*'` | ✅ **bound to 127.0.0.1** (verified) |
| Least privilege | 🟡 app role was DB **owner** (full DDL) | ✅ **runtime vs migration role split** |
| SQL injection tests pass | ✅ | ✅ (161/161 suite) |

### Implemented

1. **Runtime vs migration role split (least privilege)**
   - `lake_app` — the application RUNTIME role: `LOGIN`, no superuser /
     createdb / createrole, no DDL. Grants: USAGE on schema, SELECT/INSERT/
     UPDATE/DELETE on all tables, USAGE+SELECT on sequences, plus
     `ALTER DEFAULT PRIVILEGES FOR ROLE lake_user` so every future
     migration-owned table inherits the same DML grants.
   - `REVOKE CREATE ON SCHEMA public FROM PUBLIC` — deny-by-default: only
     the schema owner can change the schema.
   - The running server + session store now connect as `lake_app`
     (`DATABASE_URL_RUNTIME`); `DATABASE_URL` (owner) is reserved for Prisma
     Migrate, seeds, and backup/restore. `config.js` falls back to
     `DATABASE_URL` when the split is not configured (local dev).
   - `backend/scripts/db-roles.js` + `db-roles.sql` — idempotent,
     reproducible provisioning (superuser creds via `--super-url` /
     `PG_SUPER_URL`, never stored).
2. **Session table migration-owned** — the connect-pg-simple store no longer
   auto-creates its table at boot (the runtime role has no DDL rights).
   Migration `0010_runtime_roles` owns the exact `session` schema; the store
   runs with `createTableIfMissing: false`.
3. **PostgreSQL bound to localhost** — `postgresql.conf` patched
   (`listen_addresses = '127.0.0.1'`), service restarted, verified via
   `pg_settings`. Backup at `postgresql.conf.bak-phase6` (temporary elevated
   one-shot, script removed).

### Modified

- `backend/src/config.js` (`databaseUrlRuntime`)
- `backend/src/index.js` (runtime connection for db + session store)
- `backend/src/db.js` (`createTableIfMissing: false`)
- `backend/.env` + `.env.example` (`DATABASE_URL_RUNTIME`)
- `C:\Program Files\PostgreSQL\18\data\postgresql.conf` (listen_addresses; backup kept)

### Created

- `backend/scripts/db-roles.js` + `db-roles.sql`
- `backend/prisma/migrations/0010_runtime_roles/migration.sql`
- `backend/tests/db-security.integration.test.js` — **6 tests** (real-DB, `skipIf` pattern)

### Security controls

- Least-privilege database account (DML only — a compromised app cannot
  change the schema, add roles, or create databases)
- Database not exposed beyond the local machine (5432 no longer reachable
  on the LAN/internet)
- Deny-by-default schema (CREATE revoked from PUBLIC)
- Migration-owned schema objects (no runtime DDL path)

### Tests

- **161/161 backend suite.** Live-verified on real Postgres:
  - `lake_app`: `CREATE TABLE` → `permission denied for schema public`; DML
    (INSERT/DELETE on session) works; full login → session → list flow works
    through the runtime role
  - integration tests: non-superuser attrs, DML round-trip, DDL denial,
    session-store init without DDL, `listen_addresses = 127.0.0.1`
  - backend healthy after the service restart; probe data cleaned up

### Failures

- None. (One script bug fixed: dashed CLI flags were read as camelCase.)

### Remaining risks

- The runtime role is cluster-local to this machine; the same script
  (`db-roles.js`) provisions the split on the production server before
  deployment.
- `postgresql.conf` is patched on this dev machine; the production reverse
  proxy + firewall remain deployment-site tasks (runbook).

### Status

**COMPLETE** — all acceptance criteria verified: no superuser, parameterized
queries, localhost-only binding (live), least-privilege runtime role with
migration-owner split, SQL injection tests passing.
