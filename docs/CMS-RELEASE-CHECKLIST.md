# CMS Release Candidate Checklist

Verified locally on 2026-08-13. This is a release-candidate gate, not evidence
of a production deployment.

## Completed gates

- [x] CMS unit/component suite: 10 files, 32 tests.
- [x] CMS application and test TypeScript check.
- [x] CMS production build: 100 JavaScript chunks.
- [x] CMS performance budget: 291.1 KiB raw / 91.2 KiB gzip entry,
  43.5 KiB CSS.
- [x] CMS critical browser flow: login → draft → review → approve → publish →
  public visibility; viewer denial, mobile drawer, and axe checks.
- [x] CMS final UI gate: 40 completed routes at desktop/mobile widths with
  heading, placeholder, overflow, control-bound, axe, and browser-error checks.
- [x] Backend full suite: 41 files, 292 tests.
- [x] Backend security gate: 21 files, 169 tests, including binary uploads.
- [x] Backend production syntax/build check.
- [x] Focused lint on every backend deployment file changed in the final phase.
- [x] Backend dependency audit: 0 known vulnerabilities.
- [x] CMS dependency audit: 0 known vulnerabilities.
- [x] Root dependency audit: 5 known findings, all within the existing
  monitored 2-advisory baseline.
- [x] Repository secret scan: 733 files, clean; `.env` ignored.
- [x] Public-site hydration/fallback verification: companies, leadership,
  projects, history, contacts, media, CSR, careers, facilities, news, map.
- [x] Git diff whitespace check.
- [x] CMS/backend workflow YAML parsed and formatted by Prettier.
- [x] Vercel configuration JSON parsed successfully.

## Release-readiness completion

- [x] Production boot validates encrypted offsite backups, S3-compatible media
  storage, and protected public release configuration.
- [x] Governed publication dispatches the atomic snapshot/Vercel workflow with
  durable status, bounded retries, deterministic idempotency, and CMS-visible
  diagnostics.
- [x] Seven missing Our Story scene paths now use verified existing
  repository-controlled photography with accurate alternative text.
- [x] Backend/CMS binary uploads enforce authorization, signature-based MIME
  validation, generated keys, size limits, metadata persistence, progress and
  error states, governed publication, and safe draft-only deletion.
- [x] `backend/_cleanup-news.cjs` passes repository ESLint without changing its
  cleanup sequence.

The public hydration verifier reports expected baseline missing-resource 404
messages while serving representative pages. Its business-content assertions,
governed map routes, zero live content requests, and clean-browser outage proof
pass.

## External release blockers

- [ ] Choose/approve production and preview domains.
- [ ] Provision Vercel CMS project, container service, private PostgreSQL,
  backup storage, DNS, and TLS.
- [ ] Generate and store production database/session/backup secrets.
- [ ] Approve alert destinations, on-call ownership, RPO/RTO, and maintenance
  window.
- [ ] Start a Docker engine or rely on the added Ubuntu CI container-build job.
  The local Docker CLI is installed, but its Linux engine was not running, so
  the image could not be built locally.
- [ ] Run production migration, deploy, and post-deployment smoke checks only
  after explicit operator authorization.
- [ ] Run the Phase 22 staging sequence with real CMS edits, controlled
  backend/database shutdown, separate clean browsers, recovery, and a second
  publication.
