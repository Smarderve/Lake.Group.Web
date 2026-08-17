-- Per-user CMS preferences (Settings Center redesign) — migration-owned table.
--
-- Like `session` (0010) and `rate_limit` (0013), this is a runtime table:
-- the app role (lake_app) has no DDL rights, so the schema is created here
-- and the backend only issues DML through a parameterized store. Preferences
-- are JSON-scalar columns so future settings need no migration; the boolean
-- columns the UI actually toggles are real columns (queryable, indexable).
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "user_id" text NOT NULL,
  "theme" text NOT NULL DEFAULT 'system',
  "language" text NOT NULL DEFAULT 'en',
  "timezone" text NOT NULL DEFAULT 'UTC',
  "date_format" text NOT NULL DEFAULT 'en-GB',
  "number_format" text NOT NULL DEFAULT 'en-US',
  "compact_mode" boolean NOT NULL DEFAULT false,
  "sidebar_collapsed" boolean NOT NULL DEFAULT false,
  "density" text NOT NULL DEFAULT 'comfortable',
  "notification_settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "dashboard_settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "accessibility_settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id")
);
