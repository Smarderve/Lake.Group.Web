# Threat Model — Lake Group Platform

Grounded in the actual codebase (2026-08-11). Scope: `backend/` (Express +
Prisma + PostgreSQL 18) and the static site it serves.

## Assets

| Asset | Sensitivity | Where |
| --- | --- | --- |
| User accounts (bcrypt hashes, TOTP secrets) | High | `User` table (`backend/prisma/schema.prisma`), `MfaSecret` |
| Session cookies (`lakegroup.sid`) | High | connect-pg-simple (Postgres) |
| Governed corporate data (metrics, registry, CMS) | High — "corporate truth" | governed tables + version history |
| Content-gap intelligence (unanswered questions, analytics) | Medium | `UnansweredQuestion`, `AnalyticsEvent` |
| SESSION_SECRET / DATABASE_URL | Critical | `backend/.env` (gitignored) |
| Audit log | Medium (integrity) | `AuditLog` table |
| Backups | High | `backend/backups/*.dump` |

## Trust boundaries

1. **Browser → static site** — untrusted client; CSP missing (see gaps).
2. **Static site → `/api/public/*`** — intentionally unauthenticated, CORS `*`;
   PUBLISHED-only projection (`src/routes/public.js`), public writes rate
   limited (120/15m/IP).
3. **Client → `/auth/*` + `/admin/*`** — authenticated surface; admin requires
   SUPER_ADMIN + recent-auth window; session cookie httpOnly/SameSite=Lax.
4. **Node → PostgreSQL** — parameterized queries via Prisma; app role is
   `lake_user` (non-superuser) but owns the database (DDL rights for
   migrations — see gaps).
5. **PostgreSQL → network** — `listen_addresses = '*'` (see gaps).
6. **Node → external URLs** — only the admin-triggered broken-link check with
   `LAKE_CHECK_EXTERNAL_LINKS=true` (off by default); HEAD + 4s timeout.

## Threat categories (roadmap list) → posture

| Threat | Posture | Evidence |
| --- | --- | --- |
| Credential attacks | Mitigated | bcrypt cost 12 (`src/lib/passwords.js`); login + MFA rate limited (5/15m, `src/middleware/rate-limit.js`); generic `Invalid email or password` (`src/routes/auth.js:18`) |
| Authentication bypass | Tested | `tests/auth.test.js` (MFA, session flow), `rbac.test.js` |
| Session attacks / fixation | Mitigated | `req.session.regenerate()` on login (`auth.js:70,78,178`); Postgres-backed sessions; httpOnly+SameSite=Lax (`src/app.js:70-72`); revocation (`/auth/revoke-sessions`, `/admin/users/:id/revoke-sessions`) |
| Authorization bypass | Tested | `hardening.test.js` admin sweep (401/403), Phase 11 VIEWER-overreach fix |
| IDOR / BOLA | Low surface | No per-user resource ownership in the domain; `/admin/users/:id` is SUPER_ADMIN-only; governed routes are role-gated, not ID-keyed |
| SQL injection | Not exploitable | Prisma parameterization only; no string-built SQL (`grep` for template SQL: none in routes) |
| XSS (stored/reflected/DOM) | Mostly mitigated | Chat + i18n render via `textContent` (`assets/assistant.js`, `assets/i18n.js`); no `eval`; **no CSP on static site → defense-in-depth gap** |
| CSRF | Mitigated | SameSite=Lax + httpOnly; state changes are POST/PATCH/DELETE; **no explicit Origin check / CSRF tokens** (accepted mitigation, documented) |
| SSRF | Low | No user-supplied-URL fetch endpoint; the only outbound fetch (admin link checker) runs through a fail-closed guard: protocol/IP/DNS allowlists, DNS-rebinding defense, redirect re-validation, timeouts (Phase 12, `lib/ssrf-guard.js`) |
| Command injection | Not exploitable | No user input reaches `exec`/`spawn`; backup/restore CLIs use fixed binaries + env-derived args |
| Path traversal | N/A | Backend serves no static files; static server in test harnesses guards `startsWith(ROOT)` |
| File upload attacks | N/A | No upload endpoint (careers CV is a mock form); media is URL-referenced |
| API abuse / rate-limit bypass | Partial | Public writes limited; **admin API has no limiter** |
| Privilege escalation / mass assignment | Mitigated | zod create/update schemas whitelist fields (`src/validators/*`); role/password changes are dedicated SUPER_ADMIN routes |
| Business-logic abuse | Reviewed | Governance workflow (submit→review→approve→publish) with separation of duties (`governance.test.js`) |
| Information disclosure | Mitigated | Sanitized errors (`error-handler.js`: 500 → `Internal server error`); PUBLISHED-only public API; audit rows carry no secrets |
| Secret exposure | Mitigated | `.env`/`.env.*` gitignored; no secrets in source; `npm audit` clean |
| Database compromise | Partial | Non-superuser role; **DB owner role, `listen_addresses='*'`** (prod gaps) |
| Denial of service | Partial | Rate limits + request timeouts; no body-size limit on JSON (`express.json()` default 100kb — acceptable); **admin unlimited** |
| Data loss | Mitigated | Phase 11: `db:backup` (pg_dump -Fc) + restore drill passed on real data |

## Highest-value gaps (by roadmap priority)

1. **Static-site CSP** — High-ish (defense-in-depth; the app already avoids
   innerHTML-with-user-data, so exploitability is limited today).
2. **PostgreSQL `listen_addresses='*'`** — High for production (bind to
   127.0.0.1/private; firewall).
3. **Admin API rate limiting** — Medium.
4. **App role least privilege** (separate migration role vs runtime role) — Medium.
5. **Origin validation for admin state changes** (belt-and-suspenders on top of
   SameSite=Lax) — Low/Medium.
