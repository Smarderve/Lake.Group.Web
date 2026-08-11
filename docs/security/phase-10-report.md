# Phase 10 — Rate Limiting & Abuse Prevention: Completion Report

**Date:** 2026-08-11 · **Source:** `SECURITY_ROADMAP.md` §Phase 10

---

## PHASE: 10 — Rate Limiting & Abuse Prevention

### Audit result vs. acceptance criteria

| Control | Before | After |
| --- | --- | --- |
| Login / MFA limits | ✅ 5 per 15 min per IP | ✅ unchanged |
| Public write limits | ✅ 120 per 15 min per IP | ✅ unchanged |
| **Authenticated admin/auth limit** | ⚠️ none (the tracked gap) | ✅ **300 per 15 min per IP** on /admin + /auth |
| Request-size limit | ✅ 100kb (Phase 5) | ✅ unchanged |
| **Pagination limits** | ⚠️ none (uncapped public lists) | ✅ **limit 1–100 / offset 0–10000, rejected when malformed** |
| Query limits | 🟡 `days` clamped 1–365 | ✅ + pagination caps |
| Upload-size limits | ➖ no upload surface | ➖ |
| Timeouts | ✅ external-link check has 4s HEAD timeout | ✅ documented (proxy/server-side for the rest) |

### Implemented

1. **`adminRateLimiter`** — per-IP, 300 / 15 min (≈20/min), mounted on
   `/admin` and `/auth` after the CSRF guard. Generous on purpose: the small
   admin team must never be DoS'd by its own limiter (roadmap: "must not
   create an easy denial-of-service mechanism against legitimate users"),
   while automated floods (post-login scraping, buggy client loops) are
   throttled. Login still has its stricter 5/15m limiter on top.
2. **Public list pagination** — `?limit` (1–100) / `?offset` (0–10000) on
   `GET /api/public/:entity`, zod-validated: malformed values (0, negative,
   >100, non-numeric, oversized offset) → `400 VALIDATION_ERROR`. Absent
   params preserve the uncapped behavior (tables are small today; the cap
   exists before they grow). Single-record, map, and facts routes are
   unaffected.
3. **Query limits** — `days` clamp (Phase 9) + the new pagination caps cover
   the query surface.

### Modified

- `backend/src/middleware/rate-limit.js` (`adminRateLimiter`)
- `backend/src/app.js` (mount on /admin + /auth)
- `backend/src/routes/public.js` (`listQuerySchema`, take/skip)
- `backend/tests/helpers.js` (fake DB `findMany` take/skip support)

### Created

- `backend/tests/phase10-ratelimit.test.js` — **7 tests**
- `docs/security/phase-10-report.md`

### Security controls

- Authenticated-surface throttling (admin + auth) per IP
- Explicit pagination caps with strict rejection (no silent clamping of
  malformed input)
- Layered limits: CSRF guard → admin limiter → login/MFA limiters

### Tests

- **182/182 backend suite** (7 new: admin-surface 429, /auth 429, per-IP
  budget sharing, limit/offset slicing, malformed-pagination 400s, uncapped
  default, single-record/map unaffected).
- **Live on the real backend**: `/admin/ping` carries
  `RateLimit-Policy: 300;w=900` + `RateLimit-Remaining: 299` (limiter
  mounted and budget decrementing); `?limit=2` returns 2 rows; `?limit=999`
  → 400. Live E2E **PASS** (uncapped default preserved).

### Failures

- None. (Two test-fixture fixes: the login in `makeCtx` consumes budget, so
  tight test limits had to account for it; pagination seeds needed explicit
  `createdAt` for deterministic ordering.)

### Remaining risks

- The admin limiter is per-IP (shared office NAT is one bucket) — the 300/15m
  headroom covers this; a per-user key becomes relevant if the team grows.
- Timeouts beyond the external-link check (proxy-level request timeouts,
  DB connection timeouts) are deployment-site configuration — documented in
  the Phase 11 runbook.
- No upload surface exists (careers CV is a mock form) — file-size limits
  remain N/A until real uploads land.

### Status

**COMPLETE** — strict limits for login/MFA, moderate limits for admin and
public writes, explicit pagination/query caps, request-size limit in place;
automatic abuse is throttled without denying legitimate team use.
