# Phase 5 — Input Validation: Completion Report

**Date:** 2026-08-11 · **Source:** `SECURITY_ROADMAP.md` §Phase 5

---

## PHASE: 5 — Input Validation

### Audit result (every externally reachable endpoint)

**Public (unauthenticated)**

| Endpoint | Validation | Status |
| --- | --- | --- |
| `GET /api/public/map` | no input | ✅ |
| `GET /api/public/knowledge/facts` | no input | ✅ |
| `POST /api/public/analytics/events` | `normalizeEvent`: type allowlist, PAGE_VIEW requires page, others require query, length caps (page 200, query 300, sessionId 64, detail 2000) | ✅ |
| `POST /api/public/assistant/unanswered` | **formalized this phase** — `unansweredQuestionSchema` (question 1–500 trimmed, language 2–3 letter code, page ≤ 200) | ✅ (was hand-rolled) |
| `GET /api/public/metrics/:key` | key in parameterized lookup | ✅ equivalent |
| `GET /api/public/:entity` | entity name **allowlisted** against the PUBLIC_ENTITIES map | ✅ equivalent |
| `GET /api/public/:entity/:idOrSlug` | entity allowlist + parameterized lookup | ✅ equivalent |

**Authenticated (admin/auth)**

| Endpoint | Validation | Status |
| --- | --- | --- |
| Governed CRUD + transitions (registry/CMS/map/media) | zod create/update/transition schemas | ✅ |
| Metrics router (create/edit/verify/transitions) | zod schemas | ✅ |
| Children (milestones, leadership events) | zod schemas | ✅ |
| Media folders | zod schemas | ✅ |
| Auth (login, MFA, change-password) | zod schemas | ✅ |
| `PATCH /admin/unanswered-questions/:id` | **formalized this phase** — `unansweredResolveSchema` (boolean `answered`, `answerNote` ≤ 500); **unknown id now 404** (was 500 via Prisma P2025) | ✅ (was loose) |
| `GET /admin/analytics/summary?days=` | clamped 1–365, NaN → 30 | ✅ |
| Notifications / review-queue / publish-schedules / media-usage | no client body input; params in parameterized lookups | ✅ equivalent |

**Infrastructure**

| Control | Status |
| --- | --- |
| JSON body size | **explicit `express.json({ limit: '100kb' })`** + clean `413 PAYLOAD_TOO_LARGE` mapping in the error handler (was implicit default) | ✅ added |
| Headers | `user-agent` capped at 200 chars (session device capture) | ✅ |
| Uploaded files | N/A — no upload surface | ➖ |

### Implemented

- `unansweredQuestionSchema` + `unansweredResolveSchema` in
  `validators/auth.js`; both routes now zod-validated with the platform's
  standard `VALIDATION_ERROR` body.
- Admin PATCH on a missing id returns `404 NOT_FOUND` instead of a 500
  (Prisma P2025 would previously surface as a server error).
- Explicit `express.json({ limit: '100kb' })` and an
  `entity.too.large → 413 PAYLOAD_TOO_LARGE` mapping so oversized bodies
  fail with a consistent, documented response.
- Endpoint inventory documented in this report (schema/allowlist/parameterized
  per route) — the roadmap's "every externally reachable endpoint has an
  explicit input schema or equivalent validation" is now evidenced per route.

### Modified

- `backend/src/validators/auth.js` (2 new schemas)
- `backend/src/routes/public.js` (schema-driven unanswered POST)
- `backend/src/routes/admin.js` (schema-driven PATCH + 404)
- `backend/src/app.js` (explicit body limit)
- `backend/src/middleware/error-handler.js` (413 mapping)
- `backend/tests/knowledge.test.js` (stale `VALIDATION` → `VALIDATION_ERROR` expectation)

### Created

- `backend/tests/phase5-validation.test.js` — **9 tests**

### Security controls

- Schema validation on every client-writable body (types, length, format, enums)
- Entity allowlist for public reads (unknown → 404, never raw rows)
- Explicit request-size limit with a clean 413
- Fail-secure 404s on manipulated ids (no 500 leakage)

### Tests

- **155/155 backend suite** (9 new: analytics event rejection/capping, unanswered
  POST schema, admin PATCH schema + 404, days clamp, entity allowlist, 413).
- **Live on the real backend**: missing question → `400 VALIDATION_ERROR`
  with field details; valid → `201`; 200 KB body → `413`. Probe row cleaned up.

### Failures

- One stale pre-existing expectation (`knowledge.test.js` asserted the old
  hand-rolled `VALIDATION` code; the schema returns the platform-standard
  `VALIDATION_ERROR` — updated).

### Remaining risks

- Public single-record lookups accept arbitrary `:idOrSlug` strings — safe
  because they are always used in parameterized queries with the PUBLISHED
  filter (no injection or leak), but an explicit UUID/format check would be
  a defense-in-depth nicety (not required).
- Query parameters on public list endpoints are not consumed, so there is
  nothing to validate there yet; pagination (roadmap Phase 10) will add
  explicit `limit`/`offset` schemas when it lands.

### Status

**COMPLETE** — every externally reachable endpoint now has a schema,
allowlist, or parameterized-equivalent validation, verified by tests and
live probes; input validation is a distinct layer (SQL parameterization,
output encoding, authorization, CSRF remain separate, per the roadmap).
