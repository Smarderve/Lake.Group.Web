# Phase 9 — API Security: Completion Report

**Date:** 2026-08-11 · **Source:** `SECURITY_ROADMAP.md` §Phase 9

---

## PHASE: 9 — API Security

### Audit result vs. acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| API security inventory (endpoint / auth / authorization / input / output / rate limit / sensitive data / ownership) | ✅ **created this phase** | `docs/security/api-security.md` — every public, auth, and admin endpoint |
| Excessive data exposure prevented | 🟡 → ✅ | **Real findings fixed this phase** (below); sweep test added |
| Mass assignment never blindly accepts client fields | ✅ | zod whitelists on every client-writable body (Phase 5 + Phase 4 escalation tests) |
| Safe, consistent API errors | ✅ | uniform `{error:{code,message}}`; 5xx generic; 503/413 mapped (Phase 5) |

### Excessive-data-exposure findings (fixed this phase)

1. **`GET /api/public/media`** leaked `uploadedBy` (internal user id) and
   `folderId` (organizational structure) — the public gallery only needs
   url/altText/caption/tags/variants/license. **Fixed** with an explicit
   media projection.
2. **`GET /api/public/contacts`** leaked `verificationStatus`,
   `verificationDate` (internal verification workflow) and `order` (internal
   sort). **Fixed** with an explicit contact projection (kept the directory
   fields + content refs).
3. The remaining public entities use `publicRow`/explicit `format`/map
   projections — sweep test now asserts **no public response carries
   `passwordHash`, `mfaSecret`, or `uploadedBy`**.

### Implemented

- **`backend/src/routes/public.js`** — explicit `format` projections for
  `media` and `contacts` (strip administrative/internal fields).
- **`backend/tests/phase9-api-security.test.js`** — 4 regression tests:
  media list + single never leak uploader/folder; contacts never leak
  verification/sort metadata; cross-entity sweep for credentials + internal
  user refs; admin user list exposes only public fields.
- **`docs/security/api-security.md`** — the roadmap's API security
  inventory (24 endpoints × auth/authorization/schema/rate-limit/sensitive-
  data/ownership).

### Modified

- `backend/src/routes/public.js` (2 projections)
- `docs/security/api-security.md` (new)

### Created

- `backend/tests/phase9-api-security.test.js`
- `docs/security/api-security.md`
- `docs/security/phase-09-report.md`

### Security controls

- Minimal public projections (only fields the site renders)
- Administrative metadata (uploader, verification, sort) never leaves the
  CMS surface
- Sweep test guards every public entity

### Tests

- **175/175 backend suite** (4 new). **Live on real Postgres**:
  `/api/public/media` keys = `id,url,altText,caption,mimeType,sizeBytes,
  width,height,copyright,license,tags,variants,updatedAt` (no
  uploadedBy/folderId); `/api/public/contacts` keys =
  `id,name,type,companyId,locationId,phone,email,publicDisplay,updatedAt`
  (no verification/sort). Backend restarted with the fix.

### Failures

- None. (One test-fixture fix: the contact visibility hook requires
  `publicDisplay === true`, which the fake DB doesn't default.)

### Remaining risks

- **Admin API has no rate limiter** (tracked — Phase 10 target).
- Governed admin responses include version history (`changedBy` user ids) —
  staff-only surface, acceptable; revisit if a read-restricted role is
  introduced.
- Public registry entities (companies, facilities, …) keep content FK ids —
  deliberate content-model choice (they are references, not credentials);
  consistent across the API.

### Status

**COMPLETE** — inventory documented, exposure leaks fixed + live-verified,
mass assignment blocked, errors sanitized; every endpoint's output is a
minimal, reviewed projection.
