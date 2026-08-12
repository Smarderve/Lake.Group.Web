# Automated Security Testing

**SECURITY_ROADMAP Phase 21 — status: ✅ executed**

This document is the map from the security roadmap to repeatable tests, plus
the gate that makes them run automatically. Every phase that produced code
changes shipped a `tests/phaseNN-*.test.js` suite (fake-DB behavioral tests,
no Postgres required); the audit gate turns `npm audit` into a release
control with an explicit, monitored baseline.

## Roadmap phase → test suite map

| Phase | Suite | What it locks down |
|---|---|---|
| 2 Authentication | `phase2-auth.test.js` | bcrypt, password policy, MFA/TOTP, admin reset logging |
| 3 Session | `phase3-session.test.js` | fixation, expiry, revocation, multiple sessions |
| 4 Authorization | `phase4-authorization.test.js` | RBAC + resource ownership, IDOR/BOLA guards |
| 5 Input Validation | `phase5-validation.test.js` | zod schemas on reachable endpoints |
| 6 PostgreSQL | `db-security.integration.test.js` | least-privilege role split, grants (real DB) |
| 7 XSS | `hardening.test.js` + static-site probes | CSP enforcement, per-page analysis |
| 8 CSRF | `phase8-csrf.test.js` | Origin/Sec-Fetch-Site guard, SameSite belt-and-suspenders |
| 9 API security | `phase9-api-security.test.js` | exposure sweep, minimal projections |
| 10 Rate Limiting | `phase10-ratelimit.test.js` | admin limiter, pagination caps |
| 11 Hardening | `hardening.test.js` | production config fail-fast, env knobs, no-upload guards |
| 12 SSRF | `phase12-ssrf.test.js` | outbound-fetch restrictions, redirects, timeouts |
| 13 Command Injection | `phase13-command-injection.test.js` | spawn-without-shell on backup/restore |
| 14 Path Traversal | `phase14-path-traversal.test.js` | sitemap/file-read escapes |
| 15 HTTPS & Headers | `phase15-https-headers.test.js` | CORS, HSTS, proxy headers |
| 16 Server Hardening | `server-hardening-checklist.md` | deployment-site checklist (docs, executed on the host) |
| 17 Supply Chain | `supply-chain.md` + audit-gate | inventory, lockfile, audit baseline |
| 18 Security Logging | `phase18-security-logging.test.js` | RATE_LIMIT_TRIGGERED / AUTHORIZATION_DENIED / CSRF_REJECTED events, **no secrets in logs (request AND response side)** |
| 19 Audit Trail | `phase19-audit-trail.test.js` | AuditLog actor/action/resource/ip/metadata, indexes, viewer, **coverage tripwire** |
| 20 Backup & DR | `phase20-backup-dr.test.js` | AES-256-GCM envelope, retention, restore drill |
| 23 Manual review | `phase23-manual-review.test.js` | self-role-change lockout (`ROLE_SELF_CHANGE` + `ROLE_CHANGE_DENIED` audit), last-admin defense-in-depth, unanswered-questions pagination caps |

## The gate

Three npm scripts (backend/package.json) + one CI workflow:

| Script | Runs |
|---|---|
| `npm run test:security` | `node scripts/run-security-tests.js` — expands `tests/hardening.test.js tests/phase*.test.js` (fs globbing, vitest programmatic API), all security suites, fake DB, no Postgres |
| `npm run test:audit` | `node scripts/audit-gate.js . --baseline ../docs/security/audit-baseline.json --scope backend` — backend tree must stay at **zero** vulnerabilities |
| `npm run test:gate` | both of the above |

`.github/workflows/security.yml` runs four jobs on every PR and push
touching `backend/**`, `docs/security/**`, or the lockfiles:

- `security-tests` — `npm run test:security` (above)
- `audit-gate` — backend + root baseline gates (above)
- `secret-scan` — root `npm run secret:scan` (Phase 22: full-tree credential
  sweep, `.env` gitignore assertion; `scripts/check-secrets.mjs`)
- `dast` — Phase 22: live DAST probe against a Postgres-16-backed backend
  (`scripts/dast-probe.js`, 10 checks; see `phase-22-report.md`)

`backend.yml` runs the four plain checks (typecheck / lint / seed-verify /
build) — all previously phantom, now backed by real scripts (Phase 22).

### The audit baseline (docs/security/audit-baseline.json)

The gate fails on **any** advisory id not listed in the baseline:

- **backend**: baseline is empty — the deployed runtime tree must stay at
  zero. A new advisory here is a release blocker, never a baseline candidate.
- **root**: baseline lists the two documented dev-toolchain moderates
  (GHSA-8988-4f7v-96qf, GHSA-w5hq-g745-h8pq — firebase-tools emulator cloud
  SDK subtree; no published fix without unpublished google majors, and no
  firebase.json exists so the tooling is inert). Only **new** advisories
  break the gate.

### Adding a new advisory to the baseline (root scope only)

1. Fix it if a patched version exists; prefer `npm audit fix` or an
   `overrides` pin (Phase 17 process).
2. If no fix exists, document why (unpublished upstream major, dev-only
   tooling) in `supply-chain.md` and add the GHSA id to the root list.
3. Re-run `npm run test:audit` and the root gate to confirm the change is
   deliberate.

### Local runs

```bash
cd backend
npm run test:security   # suites
npm run test:audit      # backend zero-vuln gate
cd .. && node backend/scripts/audit-gate.js . --baseline docs/security/audit-baseline.json --scope root
npm test                # full backend suite (currently 268 tests)
```

## Regression discipline

Every security bug found during the roadmap has a regression test that
failed before the fix and passes after — see each phase report. The Phase 19
coverage tripwire extends this to the whole mutation surface: a new mutation
model without an audited path fails the suite by construction.

## CI status notes

- The security suites need no Postgres (in-memory fake DB in
  tests/helpers.js), so the gate runs on stock ubuntu-latest with `npm ci`.
- `npm ci` runs `postinstall: prisma generate` (schema-only, no DB
  connection required).
- The audit gate spawns `npm audit --json` without a shell (Phase 13
  pattern) and **denies when it cannot verify** — a security gate that
  cannot parse its input fails rather than passing silently.
