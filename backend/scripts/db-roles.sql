-- SECURITY_ROADMAP Phase 6 — PostgreSQL least-privilege runtime role.
--
-- Idempotent; safe to re-run. Creates the application RUNTIME role
-- (`lake_app`) with pure DML privileges and revokes CREATE on the public
-- schema from PUBLIC so only the migration/DDL owner (`lake_user`) can
-- change the schema. The runtime role is what the backend uses in
-- production (DATABASE_URL_RUNTIME); the owner is used only by Prisma
-- Migrate, seeds, and backup/restore (DATABASE_URL).
--
-- Run via:  node scripts/db-roles.js   (or psql with :app_password set)
--
-- :app_password is interpolated by psql — the runner script passes it.

CREATE ROLE lake_app LOGIN PASSWORD :'app_password';

GRANT CONNECT ON DATABASE lakegroup TO lake_app;
GRANT USAGE ON SCHEMA public TO lake_app;

-- DML on existing objects.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lake_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lake_app;

-- Future tables/sequences created by migrations (as lake_user) inherit
-- the same grants — so the split survives every schema evolution.
ALTER DEFAULT PRIVILEGES FOR ROLE lake_user IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lake_app;
ALTER DEFAULT PRIVILEGES FOR ROLE lake_user IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO lake_app;

-- Deny-by-default: nobody but the schema owner can DDL in public.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
