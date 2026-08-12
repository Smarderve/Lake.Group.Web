-- SECURITY_ROADMAP Phase 19 — queryable audit trail.
--
-- AuditLog is the durable record of sensitive actions (Phase 2, Task 2.8).
-- The Phase 19 review surface (GET /admin/audit-log) queries by action,
-- by actor, and by time window; without indexes every one of those is a
-- full table scan that grows with the trail. Every related history table
-- (versions, publication events) already carries its indexes — AuditLog
-- was the gap.
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog" ("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog" ("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt");
