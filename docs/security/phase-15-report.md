# SECURITY_ROADMAP Phase 15 — HTTPS & Headers

**Date:** 2026-08-11 · **Status:** ✅ COMPLETE

## Audit

Three areas audited against the roadmap's acceptance criteria:

1. **Security headers** — already correct and complete: `securityHeaders`
   middleware on every response (nosniff, `X-Frame-Options: DENY`,
   `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy:
   strict-origin-when-cross-origin`, `Permissions-Policy` camera/mic/
   geolocation/payment off), `x-powered-by` disabled. HSTS is **conditional**
   — emitted (`max-age=31536000; includeSubDomains`) only when
   `SESSION_COOKIE_SECURE=true` (HTTPS deployment), never in local dev.
   Verified on error paths too (global middleware precedes handlers).

2. **CORS `*` on public reads** — correct by construction: the wildcard is
   set ONLY on `/api/public` (the static site's cross-origin read surface),
   and public routes never use credentials, which is the one combination the
   Fetch spec allows with `*`. Preflight answers
   `GET, POST, OPTIONS` / `Content-Type` / `Max-Age 86400` so the
   JSON-body POSTs aren't silently blocked. Admin/auth surfaces carry **no**
   CORS headers at all (they are same-origin cookie surfaces, guarded by the
   CSRF origin check instead).

3. **Proxy-header story** — **real gap found and fixed**: `csrf-guard`
   read `X-Forwarded-Host` / `X-Forwarded-Proto` **unconditionally**. A
   direct client (not behind a proxy) could send both spoofed headers plus
   a matching `Origin` and make the guard treat any attacker-controlled
   origin as "the request's own origin" — defeating the belt-and-suspenders
   CSRF layer (SameSite=Lax remained the primary defense, but the second
   layer was bypassable).

## Implemented

- **`csrf-guard.js`** — `X-Forwarded-*` is honored ONLY when
  `TRUST_PROXY > 0`; otherwise the check uses `req.headers.host` and the
  socket protocol (`req.secure`). Multi-value forwarded headers take the
  **first** value (proxy chains append to the right).
- **`app.js`** — `trustProxy` (already a config knob for rate limiting /
  audit IPs) is now threaded into the CSRF guard.
- **`index.js`** — production boot warning when `TRUST_PROXY` is 0:
  client IPs and `X-Forwarded-*` are untrusted, so rate limiting sees the
  proxy and the CSRF check ignores forwarded headers. Warn, not fail —
  direct deployments are valid.
- **`.env.example`** — TRUST_PROXY comment documents the CSRF gating.
- **Runbook** (`docs/PHASE-11-HARDENING-PRODUCTION.md`) — proxy paragraph
  added.

## Tests — `backend/tests/phase15-https-headers.test.js` (8)

- Public POST → `Access-Control-Allow-Origin: *`, no
  `Access-Control-Allow-Credentials` (the safe wildcard combination).
- Admin 401 and login responses carry **no** CORS headers.
- Preflight: 204 with methods/headers/max-age.
- Headers on error paths (404).
- HSTS present only with `cookieSecure` (exact header value incl.
  includeSubDomains), absent in dev.
- **CSRF proxy gating**: `trustProxy=0` + spoofed `X-Forwarded-Host/Proto`
  + matching Origin → 403 CSRF_REJECTED; `trustProxy=1` (proxy mode) →
  trusted; first-forwarded-host-wins chain semantics.

## Live verification (real backend)

- Spoofed forwarded host/proto + matching Origin on `/auth/login` →
  **403 CSRF_REJECTED** (this exact request passed the guard before the
  fix); a normal login still → 200. Probe cleaned.
- `/health` carries nosniff / DENY / frame-ancestors 'none' /
  Referrer-Policy / Permissions-Policy; no HSTS (dev), no x-powered-by,
  no ACAO. Public POST → 201 with ACAO `*`; admin unauthenticated → 401
  without ACAO.
- Backend suite **225/225**.

## Status

**COMPLETE** — headers complete and conditional-HSTS verified, CORS `*`
confirmed correctly scoped to the credential-less public surface, and the
spoofable `X-Forwarded-*` CSRF bypass closed with the trust-proxy gate,
regression tests, live proof, and a production boot warning.
