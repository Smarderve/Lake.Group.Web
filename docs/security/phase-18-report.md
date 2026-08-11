# SECURITY_ROADMAP Phase 18 — Security Logging

**Date:** 2026-08-11 · **Status:** ✅ COMPLETE

## Audit findings

1. **REAL SECRET LEAK — session IDs and tokens were being logged.**
   pino-http's default serializer copies **every** request header into the
   log line. Live proof: a request carrying
   `Cookie: lakegroup.sid=...` and `Authorization: Bearer ...` produced a
   log line containing both values verbatim. The roadmap-review's
   "No secrets logged (session IDs are not logged)" claim was wrong.
2. **Missing events:** RATE_LIMIT_TRIGGERED and AUTHORIZATION_DENIED were
   not logged anywhere (the roadmap's explicit list). CSRF rejections (the
   app's suspicious-request signal) were silent too.

## Implemented

- **`src/logger.js` — header ALLOWLIST serializer** (`safeReqSerializer`):
  request logs now keep only debugging-safe headers (host, user-agent,
  accept, content-type, origin, referer, sec-fetch-\*, x-forwarded-\*, …).
  `cookie`, `authorization`, `proxy-authorization` and every other header
  are dropped by default (deny-by-default, not redact-listing).
- **`src/lib/security-log.js`** — `securityLog(logger, {action, req,
  detail})`: structured warn-level `security: true` lines with
  ip/method/path + explicit safe details. No headers, cookies, tokens or
  bodies — ever.
- **RATE_LIMIT_TRIGGERED** — every limiter (login, mfa, public-write,
  admin) logs limiter/limit/windowMs/ip/route on trip, then 429.
- **AUTHORIZATION_DENIED** — requireAuth (401, reason no-session /
  inactive / unknown-user), requireRole (403, role + requiredRoles),
  requireRecentAuth (403 REAUTH_REQUIRED). Original HTTP semantics
  preserved (401 vs 403).
- **CSRF_REJECTED** — csrf-guard logs origin + expected host on rejection
  (the roadmap's "suspicious request" signal).

## Tests — `backend/tests/phase18-security-logging.test.js` (7)

- **Secrets sweep:** a request with Cookie + Authorization + custom secret
  headers produces a log whose req.headers contain none of them and whose
  corpus contains none of the values.
- `safeReqSerializer` unit: allowlist only.
- RATE_LIMIT_TRIGGERED (ip/route/limiter/limit on 429), AUTHORIZATION_DENIED
  on role rejection (actor/role/required roles), on REAUTH_REQUIRED, and on
  unauthenticated 401 (no actor); CSRF_REJECTED with origin.
- **Suite 232/232** — the change to auth.js intentionally preserved the
  401/403 semantics (one intermediate version regressed 401→403; caught by
  the suite and fixed).

## Live verification (real backend, real log)

- Request with `Cookie: lakegroup.sid=LIVE-SECRET-COOKIE` +
  `Authorization: Bearer LIVE-SECRET-TOKEN` → **0 hits** of either value in
  the live log (allowlist working end to end).
- Unauthenticated `/admin/analytics/summary` → 401 + AUTHORIZATION_DENIED
  in the log; evil-origin login → 403 + CSRF_REJECTED; 6th failed login →
  429 + RATE_LIMIT_TRIGGERED (limit 5). All three events confirmed in the
  live log. Probe rate-limit budget reset via clean restart; backend
  healthy on :4000.

## Status

**COMPLETE** — the session-ID/token leak is closed (allowlist serializer,
regression-tested + live-proven), the two missing roadmap events are
logged (plus CSRF_REJECTED), no secret ever reaches the pino layer, and
the durable per-action AuditLog rows (LOGIN_*, ROLE_CHANGED, ADMIN_ACTION,
SESSION_*, PASSWORD_*, publish events) remain the Phase 19 audit trail.
