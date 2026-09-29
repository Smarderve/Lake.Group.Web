# Phase 11 — Hardening & Production

> Source of truth for scope: *Lake Group Digital Platform — Master Delivery Plan v1.1*,
> Phase 11 summary: security testing, authorization testing, performance/load
> testing, accessibility, SEO, backup restoration, disaster recovery and
> controlled production migration. Phases 0–10 are complete
> (`docs/PHASE-8-PUBLIC-WEBSITE-MIGRATION.md`, `docs/PHASE-9-AI-KNOWLEDGE.md`,
> `docs/PHASE-10-ANALYTICS-INTELLIGENCE.md`).

---

## Objective

Take the governed platform to production-grade: prove the security and
authorization posture with tests, measure performance under load, pass an
accessibility audit, ship SEO artifacts, verify that backups can actually be
restored, and document a controlled production migration with rollback.

## Scope & status

### 11.1 — Security testing ✅

- **`backend/src/middleware/security-headers.js`** — every response now carries
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Content-Security-Policy: frame-ancestors 'none'`,
  `Referrer-Policy: strict-origin-when-cross-origin` and
  `Permissions-Policy` (camera/mic/geolocation/payment off). HSTS is emitted
  only over HTTPS (`cookieSecure`, production). `X-Powered-By` was already
  disabled.
- **Public write rate limiting** — `publicWriteLimiter` (120 writes / 15 min /
  IP) guards the unauthenticated `POST /api/public/analytics/events` and
  `POST /api/public/assistant/unanswered` endpoints against firehose/spam use
  (in addition to the existing login/MFA brute-force limits).
- Live verification: all headers present on the running backend; a POST
  storm returns `429 RATE_LIMITED` (tested).

### 11.2 — Authorization testing ✅

- **Real finding fixed**: the Phase 9/10 admin routes (`/admin/unanswered-questions`,
  `/admin/content-health`, `/admin/analytics/summary`) were `auth`-only — any
  logged-in VIEWER could read content gaps, health scores and analytics.
  Tightened to `auth + superAdmin`, matching admin.js's stated contract.
- **`tests/hardening.test.js`** (7 tests): security headers, HSTS-over-HTTPS,
  public write 429, **admin route sweep** (401 anonymous across the admin
  surface), role rejection (VIEWER/EDITOR → 403 on sensitive routes),
  SUPER_ADMIN reach, and **public DRAFT-leak guard** (`/api/public/companies`
  returns PUBLISHED only — DRAFT and ARCHIVED never leak).

### 11.3 — Performance / load testing ✅

- **`backend/scripts/load-check.js`** — `npm run perf:load`: concurrent GETs
  across the read-heavy public surface with throughput + p50/p95/max
  reporting and a configurable p95 gate (`--p95`, default 500 ms; exits
  non-zero above it so it can gate a release).
- **Live result (real backend, real Postgres)**: 300 req / 20 concurrent →
  **315 req/s, p50 43.5 ms, p95 169 ms, 0 failures — PASS**.

### 11.4 — Accessibility ✅

- **`scripts/_verify_accessibility.js`** — headless-Chrome audit across 18
  pages: `<html lang>`, h1 count, `alt` on every image, label/aria on every
  form control, accessible names on buttons, href on links.
- **Findings fixed**:
  - `contact.html` — 5 form controls now have `<label for>` + input `id`
    (Full Name, Email, Phone, Subject, Message).
  - `careers.html` — 6 controls labelled (Name, Email, Phone, Position
    select, Cover Message, CV upload).
  - `station-locator.html` — `#station-search` and `#service-filter` got
    `aria-label`s.
- Result: **all 18 pages PASS**. Known note (pre-existing, shared checkout):
  `index.html` has no `<h1>` (uncommitted hero-redesign work — QA standard is
  one h1 per page).

### 11.5 — SEO ✅

- **`scripts/build-sitemap.js`** — generates `sitemap.xml` (46 URLs, lastmod
  from file mtimes, dashboard/experimental pages excluded) + `robots.txt`
  (allow all, disallow `/admin/`, sitemap reference).
- `offline.html` gained a meta description (the last Phase 10 SEO finding);
  the content-health SEO score is now 99.5 (only informational gaps remain).

### 11.6 — Backup / restore / disaster recovery ✅

- **`backend/scripts/backup-db.js`** — `npm run db:backup`: pg_dump `-Fc`
  (custom format, blobs) to `backend/backups/lakegroup-<stamp>.dump`
  (auto-locates `pg_dump`, `PGBIN` override).
- **`backend/scripts/restore-db.js`** — `npm run db:restore -- <file> [db]`:
  pg_restore `--clean --if-exists --no-owner`; **drill mode** = target a
  scratch database so production is untouched.
- **SECURITY_ROADMAP Phase 20 (2026-08-12)**: optional **AES-256-GCM
  encryption-at-rest** (`BACKUP_ENCRYPTION_KEY` — dumps become
  `<stamp>.dump.enc`, plaintext removed; decrypts in memory and streams to
  pg_restore via stdin, no plaintext on disk; wrong key/tamper aborts
  before SQL) and **retention** (`BACKUP_RETENTION_DAYS`, default 14 —
  expired dumps pruned after each successful backup). Full process,
  recovery order and verification: **`docs/security/disaster-recovery.md`**.
- **Live restore drill (real data, 2026-08-12)**: encrypted backup of the
  live `lakegroup` DB → restored into `lakegroup_restore_test` → row counts
  matched exactly (companies 18, countries 10, news 41, metrics 6,
  facilities 31, AuditLog 584, migrations 11) → scratch DB dropped;
  retention exercised live (3 expired pruned, newest kept). Backup/restore
  is proven, not assumed.

### 11.7 — Controlled production migration (runbook) ✅

Step-by-step, with rollback — see below.

## Runbook: controlled production migration

```bash
# 1. Preflight
cd backend
cp .env.example .env              # fill DATABASE_URL / SESSION_SECRET / PORT
npm install                       # postinstall regenerates the Prisma client
npm run db:migrate                # applies ALL migrations incl. 0009
npm run db:generate               # explicit client regen (schema changes)
npm run seed:metrics && npm run seed:content
npm run health:report             # content-health baseline (scores + findings)

# 2. Smoke the live stack before switching traffic
PORT=4000 npm run start &
npm run perf:load                 # load gate: p95 <= 500 ms
node ../scripts/_verify_live_backend.js   # 9/9 live E2E (metrics, entities, news,
                                          # map, assistant, analytics in real DB)
node ../scripts/_verify_accessibility.js  # 18/18 pages

# 3. Switch (reverse proxy / DNS / deploy the static site)
#    - static site: atomic swap of the repo root (assets versioned ?v=N)
#    - API: keep behind TLS; HSTS kicks in via SESSION_COOKIE_SECURE=true
#    - set TRUST_PROXY=1 behind the proxy: real client IPs for rate
#      limiting/audit, and the CSRF origin check trusts X-Forwarded-Host/Proto
#      ONLY when TRUST_PROXY>0 (otherwise a direct client could spoof them)
#    - rebuild sitemap/robots after adding pages: node scripts/build-sitemap.js

# 4. Post-cutover
npm run health:report             # confirm no new issues
PGPASSWORD=... psql ...           # spot-check /admin/analytics/summary signals
```

**Rollback**: restore the last backup into a fresh DB and point DATABASE_URL at
it, redeploy the previous static bundle — both halves are idempotent and the
public site degrades gracefully to static markup when the API is unreachable
(Phase 8 design), so rollback never blanks the site.

**Backup cadence**: nightly `pg_dump -Fc` offsite + a quarterly restore drill
(the drill script doubles as the checklist).

## Server hardening (SECURITY_ROADMAP Phase 16)

OS-level hardening is deployment-site work — **the runnable checklist with
verification commands lives in `docs/security/server-hardening-checklist.md`**
(non-root app user, systemd service, firewall 80/443-only, SSH keys,
private Postgres, security updates, and the post-release acceptance sweep).
The Phase 16 audit found this runbook covered TLS/HSTS/backups but none of
those criteria explicitly; the checklist closes that gap and doubles as the
acceptance test for the deployed host.

## Explicitly Out of Scope

- **Pen-testing / real credential attacks** — authorization posture is proven by
  tests; a licensed pentest is a client-side procurement decision.
- **axe-core / full WCAG 2.1 AA audit** — this audit covers the mechanical
  checks; a screen-reader walkthrough needs a human.
- **TLS termination / CDN config** — deployment-infra work, not repo code; the
  HSTS switch (`SESSION_COOKIE_SECURE=true`) is the documented handoff.

## Needs client/human sign-off

- The `index.html` missing `<h1>` (pre-existing hero redesign in this shared
  checkout) — QA standard requires exactly one h1 per page.
- Nightly backup scheduling + offsite storage destination.
- `backend/` remains untracked in git — **now urgent**: commit the whole tree
  (Phases 1–11) as the first release unit before production migration.
