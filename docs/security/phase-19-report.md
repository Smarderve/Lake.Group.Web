# SECURITY_ROADMAP Phase 19 — Audit Trail: Completion Report

**Date:** 2026-08-12 · **Phase:** 19 — Audit Trail · **Status:** COMPLETE

## Acceptance criteria (roadmap)

A durable audit trail covering every sensitive action with **actor, action,
resource, ip, metadata**, plus an immutable/queryable history and no secrets
in the trail.

## Audit findings

1. **Coverage** — every sensitive mutation is audited through the shared
   `writeAudit` helper (`src/lib/audit.js`): authentication events
   (LOGIN_SUCCESS/FAILED, LOGOUT, PASSWORD_CHANGED, MFA_*), authorization
   (AUTHORIZATION_DENIED via Phase 18), admin user lifecycle
   (USER_CREATED/UPDATED/ROLE_CHANGED/ACTIVATED/DEACTIVATED, password reset),
   governed content lifecycle (COMPANY_*/PROJECT_*/PEOPLE_*/MEDIA_*/...,
   create/update/transition/publish), metrics, publish schedules, children,
   media folders, and session revocation. Full mutation-model inventory
   checked against the governed registry: every mutation model is either
   covered by an audited path or is a documented system/derived write.
   **One gap found and fixed**: `publishEntityNow` (manual publish) built its
   own action context **without the request IP**, so manual publishes dropped
   the request context (the scheduled publisher correctly has none). The
   request IP now flows through.
2. **No queryable index** — `AuditLog` had only the primary key; every other
   table carries query indexes, but the "reliable history" itself had none.
   **Fixed**: migration `0011_audit_log_indexes` adds
   `AuditLog_createdAt_idx`, `AuditLog_actorId_createdAt_idx`,
   `AuditLog_action_createdAt_idx` (the viewer's filter+sort patterns).
3. **No read surface** — the trail was write-only; nobody could query it.
   **Fixed**: `GET /admin/audit-log` (SUPER_ADMIN + recent-auth, pagination
   capped, filters by actorId/action, metadata included).
4. **Secrets in the trail** — the audit rows themselves carry no secrets
   (verified by test). **Separate live finding during this phase**: pino-http
   was logging response headers too — the full session ID landed in the logs
   via `set-cookie` on every authenticated response (the Phase 18 fix covered
   request headers only). **Fixed**: response headers are now allowlisted as
   well (`safeResSerializer`); `set-cookie`/`authorization` never reach the
   logs. Regression-locked in the Phase 18 suite.

## Implemented

- `prisma/schema.prisma` + `migrations/0011_audit_log_indexes/migration.sql`
  — three query indexes on `AuditLog` (applied to the real Postgres,
  verified via `pg_indexes`).
- `src/routes/admin.js` — `GET /admin/audit-log` viewer (SUPER_ADMIN,
  recent-auth, `limit` 1–100 / `offset` 0–10000, filters, no secrets in
  projections).
- `src/lib/governed.js` — manual publish now carries the request IP into the
  audit context.
- `src/logger.js` — `safeResSerializer`: response headers allowlisted,
  `set-cookie` dropped (session IDs stay out of the logs entirely).
- `backend/tests/helpers.js` — fake-DB `auditLog` delegate extended with
  `findMany` so the viewer is testable.

## Tests — `phase19-audit-trail.test.js` (10)

- Behavioral rows: login success, role change, password reset, project
  create/update, publish — each with actor id, action, resource, ip,
  metadata, timestamp.
- Manual publish carries the request IP (regression for the governed fix).
- Coverage tripwire: the mutation-model inventory (imported from the
  governed registry) stays 1:1 with audited paths — a new mutation model
  without an audit path fails the suite.
- No-secrets sweep: an action with sensitive payload fields never lands in
  an audit row.
- Viewer: SUPER_ADMIN sees rows; non-admin 403; pagination caps enforced;
  filters applied.
- Response-side leak regression (Phase 18 suite, extended): a request whose
  response sets `lakegroup.sid` leaves no `set-cookie`/session value in any
  log line.

## Verification

- Backend suite **244/244** (was 232 before Phase 19; +10 audit-trail, +2
  response-leak).
- Live on the real backend (Postgres 18, migration 0011 applied): login →
  200 + `LOGIN_SUCCESS` row in psql with actor/ip/metadata `{"mfa":false}`;
  `GET /admin/audit-log` → 200 for SUPER_ADMIN; indexes confirmed in
  `pg_indexes`; cookie/token-carrying requests → **0** cookie/authorization/
  set-cookie/session-id hits in the live log (the exact flow that leaked
  before the fix). Probe users/rows cleaned; backend healthy on :4000.

## Failures

- None in the final state. Self-caught during the phase: (a) a first-draft
  viewer test promoted the wrong fixture user (test bug, not app bug);
  (b) the `publishEntityNow` IP gap above was caught by the suite and fixed;
  (c) the response-side `set-cookie` leak was found in the live log sweep
  and closed with its own regression test.

## Remaining risks

- Session cookies in active sessions are stored server-side in Postgres
  (salted/opaque, as designed) — only their *presence* in logs was the
  issue, now closed on both the request and response side.
- The audit viewer is SUPER_ADMIN-only; if broader (auditor) roles are ever
  added, the endpoint's role gate should be revisited with an explicit
  read-only role.
- Log file access control remains a deployment-site item (Phase 16
  checklist: logs owned by `lakeapp`, not world-readable).
