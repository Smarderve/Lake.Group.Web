# Phase 8 — CSRF Protection: Completion Report

**Date:** 2026-08-11 · **Source:** `SECURITY_ROADMAP.md` §Phase 8

---

## PHASE: 8 — CSRF Protection

### Audit result vs. acceptance criteria

| Criterion | Before | After |
| --- | --- | --- |
| SameSite cookies | ✅ `SameSite=Lax` (Phase 2) | ✅ unchanged |
| State changes never on GET | ✅ admin API is POST/PATCH/DELETE only | ✅ unchanged (lazy scheduled promotion on public GET is server-side, cookie-free, documented) |
| CSRF tokens | N/A | N/A — token-injected UI doesn't exist yet; Origin/site validation is the appropriate control for this API |
| **Origin / Sec-Fetch-Site validation** | ⚠️ absent (SameSite was the only layer) | ✅ **implemented + live-verified** |

### Implemented

- **`backend/src/middleware/csrf-guard.js`** — mounted on `/admin` and `/auth`
  for all state-changing methods (POST/PUT/PATCH/DELETE):
  1. **Origin present** → must equal the request's own origin
     (Host / X-Forwarded-Host, protocol-aware) **or** be in the configured
     allowlist (`CSRF_ALLOWED_ORIGINS`) — the static admin UI legitimately
     lives on another origin (dev: 127.0.0.1:8796 / localhost:8977-8979;
     prod: cms.example.com). Mismatch → `403 CSRF_REJECTED`.
  2. **Origin absent** (curl, old browsers, same-site forms) → a
     `Sec-Fetch-Site: cross-site` signal is rejected; same-origin /
     same-site / none / absent are accepted (non-browser clients are not
     CSRF targets; SameSite=Lax still covers cross-site cookie use).
  3. GET / HEAD / OPTIONS (preflight) always pass through.
- Covers the login endpoint too (login-CSRF protection).
- `config.js` `csrfAllowedOrigins` (env `CSRF_ALLOWED_ORIGINS`,
  comma-separated), wired through `createApp`; documented in `.env.example`.

### Modified

- `backend/src/app.js` (guard mounted on /admin + /auth)
- `backend/src/middleware/csrf-guard.js` (new)
- `backend/src/config.js` (`csrfAllowedOrigins`), `backend/src/index.js`
- `backend/.env.example` (+ live `.env` allowlist for the dev/test origins)

### Created

- `backend/src/middleware/csrf-guard.js`
- `backend/tests/phase8-csrf.test.js` — **10 tests**
- `docs/security/phase-08-report.md`

### Security controls

- Defense-in-depth over SameSite=Lax: server-side rejection of cross-site /
  foreign-origin state changes independent of cookie policy
- Rejects sibling-subdomain and legacy-browser CSRF that SameSite cannot
  cover
- No-action guarantee tested (a rejected request performs no state change)

### Tests

- **171/171 backend suite** (10 new: matching origin ok; no-origin ok;
  same-origin Sec-Fetch-Site ok; foreign origin → 403 + role unchanged;
  cross-site Sec-Fetch-Site → 403; configured-origin allowlist ok; GET/
  OPTIONS never blocked; /auth change-password guarded; login guarded;
  protocol-mismatch rejected).
- **Live on the real backend**: login with evil Origin → 403, matching →
  200, no Origin → 200; authenticated change-password with evil Origin →
  403, no Origin → 200 (old password dead, new works). Probe cleaned up.
- Live E2E: **PASS** (public surface unaffected).

### Failures

- None.

### Remaining risks

- CSRF tokens are not issued (no token-injected UI exists). If a
  token-carrying admin UI is ever built, adding `X-CSRF-Token` header
  validation would be a further hardening step — not needed today given
  SameSite + Origin/site validation.
- The allowlist must include the real admin-UI origin(s) at deployment
  (`.env.example` documents it); same-origin is always accepted.

### Status

**COMPLETE** — cross-origin unauthorized state-changing requests are
rejected (403 CSRF_REJECTED) with regression tests and live verification;
GET/PATCH/DELETE-only state changes, SameSite=Lax, and Origin/site
validation now layer together.
