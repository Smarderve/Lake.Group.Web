# Continuous Security

**SECURITY_ROADMAP Phase 25 — status: ✅ executed (standing process)**

Security work does not end at deployment. This document is the operational
checklist that keeps the Phases 0–24 controls working as the codebase
evolves: the per-feature flow, the 10 questions, the coding rules, the
completion protocol, the automated cadence, the triage scale, and the
incident-response process.

It is the single "process for handling future vulnerabilities" required by
the roadmap's Definition of Done (item 30). Every future security-sensitive
change is expected to walk this document, and the CI gates referenced here
make most of it mechanical.

---

## 1. The continuous flow

For every significant feature (security-sensitive or not):

```text
Feature design
      ↓
Threat analysis   ← Section 2 (the 10 questions)
      ↓
Implementation    ← Section 3 (the 15 coding rules)
      ↓
Security tests    ← Section 4 (suite + gate; Rule 15)
      ↓
Code review       ← human-style pass (Phase 23 pattern)
      ↓
Deployment        ← Phase 16 checklist + Phase 24 gate
      ↓
Monitoring        ← logs, audit trail, backup/restore cadence
```

A feature is not done until the **threat analysis is recorded** (in the PR
description or a phase-style report) and the **security tests pass**.

---

## 2. The 10 questions (threat analysis per feature)

Every new feature must answer all ten — in writing, before implementation.
If any answer is "yes" past the first, the feature needs explicit controls
and a regression test.

| # | Question | Where the control lives in this codebase |
|---|---|---|
| 1 | What data does it accept? | zod schema on the route (Phases 5/9) |
| 2 | Who can access it? | `requireAuth` / `requireRole` / recent-auth gate (Phase 4) |
| 3 | What resources can it modify? | ownership checks + governed workflow state machine (Phases 4/23) |
| 4 | Can users manipulate IDs? | IDOR/BOLA isolation tests; pagination caps on admin reads (Phases 4/10/23) |
| 5 | Can it execute external requests? | SSRF guard on the only outbound surface (Phase 12) |
| 6 | Can it access files? | shared `resolveStatic` / repoRoot containment; no uploads (Phases 11/14) |
| 7 | Does it introduce a new privilege? | role×route matrix + `ROLE_CHANGE` audit + last-admin guard (Phases 4/23) |
| 8 | Does it expose sensitive data? | minimal projections, output sweep, no secrets in logs (Phases 9/18) |
| 9 | Does it require rate limiting? | layered limits: login/MFA 5/15m, admin/auth 300/15m, public writes 120/15m (Phase 10) |
| 10 | Does it require audit logging? | AuditLog coverage tripwire — a new mutation without an audited path fails the suite (Phase 19) |

**Worked example — the Phase 23 self-role-change guard.** The question
"Who can access it / does it introduce a new privilege?" (2 & 7) on
`PATCH /admin/users/:id/role` surfaced that a SUPER_ADMIN could demote
themselves into an immediate, permanent admin lockout. The fix walked this
flow: threat analysis → `400 ROLE_SELF_CHANGE` + `ROLE_CHANGE_DENIED` audit
→ defense-in-depth `409 LAST_SUPER_ADMIN` → regression tests (8) → live
drill. That is the expected shape of every future finding.

---

## 3. The 15 security coding rules

Non-negotiable for all future development. The right-hand column is where
this codebase satisfies each rule.

| # | Rule | Concrete manifestation here |
|---|---|---|
| 1 | Never trust frontend authorization | every route re-checks the session role server-side (`requireAuth` reloads from DB per request) |
| 2 | Never concatenate untrusted input into SQL | Prisma parameterization only |
| 3 | Never store plaintext passwords | bcrypt cost 12 (`DEFAULT_BCRYPT_COST`) |
| 4 | Never expose secrets to the frontend | minimal projections, `/api/public` strips admin metadata |
| 5 | Never commit secrets | `.env` gitignored + asserted by `secret:scan` every run |
| 6 | Never run the production Node app as root | Phase 16 checklist (dedicated system user) |
| 7 | Never use Postgres superuser credentials for the app | `lake_app` DML-only runtime role, `lake_user` migration owner (Phase 6) |
| 8 | Never return sensitive database fields unnecessarily | output projections + exposure sweep (Phase 9) |
| 9 | Never trust filenames or file extensions | no uploads; sitemap/file-read traversal guards (Phases 11/14) |
| 10 | Never execute user-controlled shell commands | spawn-only, no shell, literal argv, password via env; tripwire (Phase 13) |
| 11 | Never expose detailed production stack traces | error handler: 500 → generic message; DAST verifies |
| 12 | Never assume authentication means authorization | RBAC + recent-auth + ownership checks on every admin mutation |
| 13 | Never add a security package without understanding what it protects | dependency inventory (`dependency-inventory.md`) + Phase 17 review |
| 14 | Never disable a security control without documenting the review | e.g. CORS `*` is intentional, scoped to credential-less public reads (Phase 15) |
| 15 | Every security-sensitive change must have a test | suite + gate (Section 4); a change without a regression test is not done |

---

## 4. The automated cadence (test / CI)

| When | Command | What it enforces |
|---|---|---|
| Local, before any commit | `cd backend && npm run test:gate` | all security suites (18 files / 155 tests) + backend zero-vuln audit gate |
| Local, root | `node backend/scripts/audit-gate.js . --baseline docs/security/audit-baseline.json --scope root` | root gate — fails on any **new** advisory |
| Local, root | `npm run secret:scan` | full-tree credential sweep (534 files), `.env` ignore assertion |
| Local | `cd backend && npm test` | full suite (268 tests) — run before any merge |
| Local | `cd backend && npm run lint` | ESLint 0 errors (119 reviewed warnings) |
| Local, after deploy | `cd backend && node scripts/dast-probe.js` | 10 live non-destructive probes against the running server |
| Every PR/push touching `backend/**`, `docs/security/**`, or lockfiles | CI `.github/workflows/security.yml` | security-tests + audit-gate + secret-scan + dast (Postgres-16-backed) jobs |
| Every PR/push | CI `.github/workflows/backend.yml` | typecheck / lint / seed-verify / build (real scripts since Phase 22) |

Cadence rules:

- **A new advisory** in the backend tree is a release blocker — the backend
  baseline is empty by design. Root dev-toolchain advisories may be
  baselined only through the documented process in `automated-testing.md`.
- **The audit gate denies when it cannot verify** — a gate that can't parse
  its input must fail, not pass silently.
- **A new security finding ships with a regression test that failed before
  the fix** (red-green). No exception, per Rule 15.

---

## 5. Phase completion protocol

For every roadmap-style phase and every significant feature:

```text
1. Inspect    — read the existing implementation; identify conflicts
2. Plan       — smallest safe change; preserve legitimate behavior
3. Implement  — secure coding rules (Section 3); no unnecessary deps
4. Test       — failing test first; then the fix
5. Review     — human-style pass over the diff (Phase 23 pattern)
6. Fix        — close what the review found
7. Document   — update the phase report / this directory
8. Verify     — full suite + gate + live check where applicable
9. Mark complete
```

A phase is `COMPLETE` only when its acceptance criteria are verified — never
because the code compiles.

---

## 6. Severity triage

| Priority | Examples | Action |
|---|---|---|
| **Critical** | auth bypass, RCE, SQLi with impact, privilege escalation, secret exposure, full DB compromise | fix immediately |
| **High** | IDOR, stored XSS, broken authorization, account takeover, SSRF to sensitive infra, unsafe upload | fix before production |
| **Medium** | missing headers, weak rate limiting, info disclosure, insufficient logging | fix during hardening |
| **Low** | minor leakage, non-sensitive config, defense-in-depth | schedule appropriately |

Current standing: **0 known Critical or High** (Phases 0–24). Any new
finding is triaged with this scale and its resolution tracked in
`roadmap-review.md` "Remaining risks".

---

## 7. Incident response (future vulnerabilities)

1. **Triage** — classify per Section 6; if Critical/High, stop feature work.
2. **Reproduce** — write a failing regression test that demonstrates the
   bug (the systematic-debugging discipline used across Phases 12–23).
3. **Fix at the root** — one change, at the source; never a symptom patch.
4. **Verify** — red-green, then full suite + gate + live probe where
   applicable.
5. **Audit trail** — record the finding, fix, and tests in the phase-style
   report; update `roadmap-review.md` remaining risks.
6. **Scan** — if the advisory is dependency-related, run the audit gates;
   if it is code-related, run lint + DAST against the fix.
7. **Backup check** — if the incident touches data, confirm the latest
   backup is restorable (see `disaster-recovery.md`).

---

## 8. Definition of Done — current standing

The roadmap's §10 checklist, with where each item is satisfied as of
Phase 25 (all verified in Phases 21–24; item 30 is this document):

```text
 1 Authentication reviewed/tested        ✅ phase-02/03 + phase2/3 suites
 2 Sessions secure                      ✅ phase-03 + phase3 suite
 3 Authorization server-side            ✅ phase-04 + phase4 suite
 4 Ownership/permission checks          ✅ phase-04/23 + phase4/23 suites
 5 Parameterized queries                ✅ by construction (Prisma-only)
 6 PostgreSQL least privilege           ✅ phase-06 + db-security integration suite (live)
 7 Input validation                     ✅ phase-05 + phase5 suite
 8 XSS protections                      ✅ phase-07 (CSP 49 pages, textContent)
 9 CSRF per auth architecture           ✅ phase-08 (SameSite=Lax + Origin/Sec-Fetch-Site)
10 API endpoint security requirements   ✅ phase-09 inventory + sweep
11 Rate limiting                        ✅ phase-10 + phase10 suite
12 File uploads secured                 ✅ N/A verified + regression-locked (phase-11)
13 SSRF addressed                       ✅ phase-12 + phase12 suite (fail-closed guard)
14 Command injection prevented          ✅ phase-13 + tripwire
15 Path traversal prevented             ✅ phase-14 + guards
16 HTTPS enforced                       ✅ proxy + secure cookies + HSTS flag (phase-15, deployment)
17 Security headers configured          ✅ phase-15 + DAST check
18 CORS intentional                     ✅ credential-less public reads only (phase-15)
19 Server privileges minimized          ✅ phase-16 checklist
20 Dependencies monitored               ✅ phase-21/22 audit gates + CI
21 Secrets protected                    ✅ `.env` gitignored + secret:scan CI
22 Security events logged               ✅ phase-18 (RATE_LIMIT_TRIGGERED / AUTHORIZATION_DENIED / CSRF_REJECTED)
23 Admin actions auditable              ✅ phase-19 (AuditLog + tripwire + viewer)
24 Backups exist                        ✅ db:backup (AES-256-GCM)
25 Backups restored in testing          ✅ live drill 2026-08-12 (disaster-recovery.md)
26 Automated security tests pass        ✅ 268/268 suite; gate 18 files/155 tests
27 Manual security review performed     ✅ phase-23
28 Production configuration reviewed    ✅ phase-24 gate (38 items re-verified)
29 No known Critical/High              ✅ 0 known, standing
30 Process for future vulnerabilities  ✅ this document
```

---

## 9. Where this fits

- `README.md` — the index and posture summary for the whole `docs/security/`
  tree.
- `roadmap-review.md` — the authoritative phase-by-phase status (row 25 =
  this process).
- `automated-testing.md` — the exact scripts, baseline, and CI jobs this
  process depends on.
- `disaster-recovery.md` — the recovery half of monitoring/backups.
