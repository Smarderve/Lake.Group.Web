# CMS Final Phases Implementation Plan

> **For agentic workers:** Execute tasks inline in dependency order. Every
> behavior change follows red → green → refactor. Do not commit or deploy.

**Goal:** Complete unfinished tracker prerequisites, specification Phase 18
production readiness, and the specification §61 final UI quality gate.

**Architecture:** Keep the existing public Vercel site, deploy the Vite CMS as
a separate static Vercel project, and package the Express backend as a
container-ready Node service behind a TLS-terminating platform/reverse proxy.
The CMS uses the existing cookie API; the backend adds a closed,
credential-aware CORS allowlist for CMS origins while preserving wildcard CORS
only for public reads.

**Tech Stack:** React 18, Vite 8, TypeScript, TanStack Query, Express 5,
PostgreSQL/Prisma, Vitest, Playwright, axe-core, GitHub Actions, Vercel,
OCI/Docker.

## Global Constraints

- Preserve all unrelated uncommitted work and completed Phase 16/17 changes.
- Backend remains the authorization and data authority.
- No invented persistent settings or deployment domains.
- No browser secrets; only `VITE_API_BASE_URL` is public.
- No deployment, commit, database migration, or production mutation.

---

### Task 1: Close tracker Phase 16 — Metrics

**Files:**
- Test: `cms/test/MetricsPage.test.tsx`
- Modify: `docs/CMS-PROGRESS.md`

**Interfaces:**
- Consumes: `/admin/metrics*`, existing `metricApi`, `MetricsPage`,
  `MetricEditorPage`.
- Produces: regression coverage for verification state, stale state, and
  role-gated metric actions.

- [ ] Render metrics with authenticated test users and literal API fixtures.
- [ ] Verify stale/verified labels and editor/reviewer action visibility.
- [ ] Run the focused test and close the tracker row with evidence.

### Task 2: Tracker Phase 17 — Administration

**Files:**
- Create: `cms/src/features/admin/api.ts`
- Create: `cms/src/features/admin/UsersPage.tsx`
- Create: `cms/src/features/admin/NotificationsPage.tsx`
- Create: `cms/src/features/admin/AuditLogPage.tsx`
- Create: `cms/src/features/admin/SettingsPage.tsx`
- Modify: `cms/src/app/router.tsx`
- Test: `cms/test/AdminPages.test.tsx`

**Interfaces:**
- Consumes: `GET /admin/users`, role/password/session mutations,
  `/admin/notifications*`, `GET /admin/audit-log`, `GET /admin/ping`,
  `GET /health`.
- Produces: role-aware user operations, notification inbox, paginated audit
  trail, and truthful read-only system settings/health.

- [ ] Write failing page tests for users, notifications, audit pagination,
  settings health, and mutation feedback.
- [ ] Implement typed API contracts and the four screens using shared
  primitives.
- [ ] Wire lazy routes and preserve SUPER_ADMIN gates for users/audit/settings.
- [ ] Run component, type, build, and browser smoke verification.

### Task 3: Specification Phase 18 — Production Deployment

**Files:**
- Modify: `backend/src/config.js`, `backend/src/app.js`, `backend/src/index.js`
- Create: `backend/src/middleware/cms-cors.js`
- Test: `backend/tests/phase24-production-deployment.test.js`
- Create: `backend/Dockerfile`, `backend/.dockerignore`
- Create: `cms/vercel.json`
- Create: `.github/workflows/cms.yml`
- Modify: `backend/.env.example`, `cms/.env.example`
- Create: `docs/CMS-PRODUCTION-DEPLOYMENT.md`
- Create: `docs/CMS-OPERATIONS-RUNBOOK.md`

**Interfaces:**
- Consumes: `CMS_ALLOWED_ORIGINS`, `CSRF_ALLOWED_ORIGINS`, secure session
  configuration, `/health`, production build scripts.
- Produces: credentialed CORS for exact CMS origins, production configuration
  validation, reproducible backend image, static CMS routing/headers, CI
  pipeline, deployment and rollback runbooks.

- [ ] Write failing backend tests for allowed/disallowed origins, preflight,
  credential headers, public-CORS preservation, and production config errors.
- [ ] Implement the minimal origin allowlist middleware/config.
- [ ] Add container/static-hosting/CI artifacts without deploying.
- [ ] Validate configs, image build when Docker is available, and environment
  documentation.

### Task 4: Final UI Quality Gate

**Files:**
- Create: `cms/e2e/visual-quality.mjs`
- Modify: affected shared components/pages only when evidence identifies a
  defect.
- Modify: `docs/CMS-UI-AUDIT.md`

**Interfaces:**
- Consumes: isolated backend fixture, CMS dev server, Playwright, axe-core.
- Produces: desktop/mobile page matrix with screenshots/DOM checks, overflow,
  landmarks, headings, controls, empty/error states, and serious axe findings.

- [ ] Cover login, dashboard, every completed content domain, metrics, users,
  notifications, audit, settings, review, publishing, and preview routes.
- [ ] Write a failing regression test for each observed defect before fixing.
- [ ] Re-run the matrix at desktop and mobile widths and document results.

### Task 5: Release Verification & Documentation

**Files:**
- Modify: `docs/CMS-PROGRESS.md`, `docs/CMS-API-MAP.md`
- Create: `docs/CMS-RELEASE-CHECKLIST.md`

**Interfaces:**
- Consumes: all CMS/backend/public/security checks.
- Produces: release gate evidence and explicit external-only blockers.

- [ ] Run CMS tests, test typecheck, production build, performance budget,
  critical-flow E2E, and visual-quality matrix.
- [ ] Run backend syntax, lint, full tests, security gate, audit gate, and
  production-config tests.
- [ ] Run public-site hydration/build checks and secret scan.
- [ ] Reconcile tracker/spec numbering and record final evidence without
  committing or deploying.
