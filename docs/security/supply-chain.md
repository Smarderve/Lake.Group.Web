# Dependency & Supply-Chain Security — SECURITY_ROADMAP Phase 17

**Date:** 2026-08-11 · **Status:** ✅ executed (audit + fixes + process)

## Dependency inventory (verified used, 2026-08-11)

**Backend runtime** (`backend/package.json`, 14 deps) — every one imported
or exercised by `src/`:

| Package | Role |
| --- | --- |
| express / express-session / connect-pg-simple | API + Postgres sessions |
| pg / @prisma/client / @prisma/adapter-pg | PostgreSQL (Prisma client is generated; `@prisma/client` feeds the generator) |
| bcrypt, otplib, qrcode | password hashing, TOTP MFA, MFA QR |
| express-rate-limit | brute-force / abuse limiting |
| zod | request validation |
| pino / pino-http | structured + request logging |
| dotenv | env loading |

**Backend dev** (3): prisma (migrations), supertest, vitest.

**Site tooling** (`package.json`, root): esbuild (hero-globe bundle),
firebase-tools (hosting deploy — currently unconfigured, no `firebase.json`),
playwright (verification harnesses), sharp (image optimization);
react / react-dom / react-globe.gl (bundled by esbuild into
`assets/hero-globe.bundle.js` — build-time only), animejs (gallery tooling;
also vendored in `assets/vendor/`), docx (report generators).
**`lake-3d/`** is a separate Next.js experiment with its own manifest.

No unused dependencies found. No unnecessary security packages: no helmet
(headers are hand-rolled, fewer deps), CSRF via SameSite+Origin validation,
validation via existing zod.

## npm audit (real runs, 2026-08-11)

- **Backend: 0 vulnerabilities** (the served application is clean).
- **Root toolchain: 14 → 5 moderate.** All were in the firebase-tools /
  google-cloud subtree (dev + deploy tooling — none ship to the browser or
  run on the server). Actions:
  - `npm audit fix` (non-breaking) cleared brace-expansion, fast-uri,
    ip-address, js-yaml, re2.
  - **Reviewed major bump applied:** `firebase-tools ^13.35.1 → ^15.26.0`
    (the only direct-dep change) cleared the **critical `tar`** advisory and
    the high-severity items. Verified after the bump: `firebase --version`
    → 15.26.0, hero-globe rebuild OK, `npm ls` clean, react stayed 18.
    (No `firebase.json` exists yet, so the deploy script is inert.)
  - **Deferred (5 moderate, documented):** `@google-cloud/pubsub` /
    `@opentelemetry/core` (W3C Baggage unbounded-memory), `gaxios`/`uuid`
    (buffer bounds) — deep in the firebase emulator/cloud SDK; clearing them
    requires unpublished google-cloud majors with poor risk/reward for
    emulator-only tooling. **Re-audit gate:** before the first real
    `firebase deploy`, run `npm audit` again and re-decide.

## Lockfile

- Root `package-lock.json` — **tracked** (lockfileVersion 3, reproducible
  via `npm ci`).
- Backend `package-lock.json` — **exists but NOT committed**: the entire
  `backend/` tree is untracked (`git ls-files backend` = 0 files). This is
  the runbook's flagged "backend/ remains untracked — now urgent" item:
  committing the tree (including the lockfile) is required before
  production so installs are reproducible and exact versions are auditable.
- Backend installed tree verified consistent (`npm ls --depth=0` clean).

## Updates & major-change review

- **Cadence:** `npm outdated` + `npm audit` at least before every release
  (`npm run security:audit` wraps `npm audit --audit-level=high`).
- **Applied this phase:** esbuild 0.28.1→0.28.2, playwright 1.62.0→1.62.1
  (patches); firebase-tools 13→15 (reviewed, see above).
- **Deferred majors (reviewed):** react/react-dom 18→19 — build-time only,
  needs a react-globe.gl peer compatibility check before adoption.
- **Process:** any major dependency change is a standalone reviewed commit:
  `npm audit fix --force` output, a toolchain verification (version print +
  build + `npm ls`), and rollback via the git-tracked manifest+lockfile
  before production deployment.

## Repo / CI / credentials protection

- `.env` / `.env.*` are gitignored; Phase 1 scanned 1359 files + git history
  for secrets — clean. No secrets are read from package scripts.
- No CI/CD exists in this checkout. **Guardrails for when CI lands:**
  - Never expose CI/CD or deployment secrets to untrusted pull requests or
    builds — scope secrets to protected branches/merge events only.
  - Branch protection + require review before merge; treat lockfile changes
    as reviewable artifacts (dependabot-style PRs are the ideal shape).
  - `npm audit` as a CI check with `--audit-level=high` (backend) and a
    monitored baseline for the root toolchain.
  - Package-manager credentials (npm token) scoped to publish-only, never
    readable by builds.

## Status

**COMPLETE** — inventory verified (no unused deps), backend audit clean,
root toolchain critical/high cleared via a reviewed firebase-tools major
(5 moderate deferred with a re-audit gate), lockfile situation documented
(backend tree commit is the one blocking action), update cadence + major-
change review process + CI secret guardrails defined.
