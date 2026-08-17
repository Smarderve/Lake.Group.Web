-- Persistent rate-limit store (login limiter) — migration-owned table.
--
-- The login limiter's 24h per-IP budget used to live in express-rate-limit's
-- in-memory MemoryStore, so a backend restart silently reset everyone's
-- budget (and two backend instances did not share one). This table backs a
-- PostgreSQL store instead; the runtime role (lake_app) has no DDL rights,
-- so the schema is owned here exactly like the session table in 0010 and the
-- store only issues DML.
CREATE TABLE IF NOT EXISTS "rate_limit" (
  "key" text NOT NULL,
  "hits" integer NOT NULL DEFAULT 0,
  "reset_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key")
);

-- Lets an eventual janitor query prune expired windows cheaply.
CREATE INDEX IF NOT EXISTS "rate_limit_reset_at_idx" ON "rate_limit" ("reset_at");
