-- SECURITY_ROADMAP Phase 6 — session table becomes migration-owned.
--
-- The backend now runs with a least-privilege runtime role (lake_app) that
-- has no DDL rights, so connect-pg-simple can no longer auto-create its
-- table at boot (createTableIfMissing is disabled). This migration owns the
-- exact schema connect-pg-simple expects; the store reads/writes it with
-- plain DML.
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "session_expire_idx" ON "session" ("expire");
