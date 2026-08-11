# Phase 4 — Authorization: Completion Report

**Date:** 2026-08-11 · **Source:** `SECURITY_ROADMAP.md` §Phase 4

---

## PHASE: 4 — Authorization

### Audit result (every authenticated route, ownership/permission checked)

| Surface | Gate | Ownership / IDOR check |
| --- | --- | --- |
| `/admin/*` (users, roles, password, revoke, content-health, analytics, unanswered-questions) | SUPER_ADMIN + recent-auth | Lookup happens after the role gate; manipulated/unknown ids → 404 |
| `/admin/publish-schedules/:id/cancel` | SUPER_ADMIN + recent-auth | 404 unknown schedule; 409 non-PENDING |
| Governed mutations (create/edit/submit) | EDITOR+ + recent-auth | zod whitelist → no mass assignment; unknown id → 404 |
| Governed approve/publish/reject/unpublish | REVIEWER+ + recent-auth + separation of duties (approver ≠ submitter, tested) | status-machine guards (409 on illegal transitions) |
| Governed rollback/archive | SUPER_ADMIN + recent-auth | — |
| `GET /admin/review-queue` | REVIEWER+ | — |
| `GET /admin/notifications` | auth | **scoped `userId: req.user.id`** (list, mark-read, read-all) — the only per-user resource |
| `DELETE /auth/sessions/:sid` | auth | ownership inside the store (sid + userId both constrained, Phase 3) |
| `/auth/change-password`, `/auth/revoke-sessions`, `/auth/sessions` | auth | operate on `req.user`/`req.session` only |
| `POST /admin/media-folders`, children (milestones/events) | EDITOR+ + recent-auth | — |
| `GET /admin/media/:id/usages` | auth (read-only introspection) | consistent with governed GET being auth-only (staff CMS visibility — documented design) |
| Role/`isAdmin`-style fields | — | **no client path sets them**; only the SUPER_ADMIN role endpoint, which is itself whitelisted via zod |

### Findings

- **No IDOR/BOLA gaps found.** The only per-user private resource is the
  notification inbox, and every notification query is scoped by `userId`
  server-side (list, mark-one-read with `id AND userId`, read-all over
  `userId: mine`). No route returns another user's rows based on a
  manipulated id.
- **No privilege-escalation path.** There is no self-service role endpoint;
  the only role-mutation surface is SUPER_ADMIN-gated and the role body is
  zod-whitelisted. Governed create/edit schemas strip smuggled fields
  (zod), so a client-supplied `status: 'PUBLISHED'` never sticks — rows are
  always created DRAFT.
- **Moderator → admin operation is blocked**: REVIEWER gets 403 on every
  SUPER_ADMIN-only route (role change, password reset, session revoke,
  publish-schedule cancel, content-health, analytics, unanswered-questions).

### Implemented (this phase)

- **`backend/tests/phase4-authorization.test.js` — 11 regression tests**
  turning the audit into a repeatable authorization matrix:
  - 8-route × 3-role sweep → every SUPER_ADMIN-only operation returns 403
    for VIEWER/EDITOR/REVIEWER
  - SUPER_ADMIN reaches the surface; manipulated/unknown user id → 404
  - EDITOR+ create gates (news, media-folders) reject VIEWER with 403
  - REVIEWER+ review-queue rejects VIEWER/EDITOR with 403
  - Privilege escalation blocked (role body `SUPER_ADMIN` as EDITOR → 403,
    role unchanged)
  - Mass assignment blocked (smuggled `status: 'PUBLISHED'` → row is DRAFT)
  - Recent-auth gate applies to governed mutations too (`REAUTH_REQUIRED`)
  - **IDOR isolation**: notification list contains only the caller's rows;
    read-all marks only mine; marking another user's → 404 with no side
    effect; manipulated governed entity ids → 404, never another record

### Modified

- `backend/tests/phase4-authorization.test.js` (new — no application code
  changes were required; the audit confirmed existing controls)

### Security controls

- Server-side ownership scoping (notifications), role gates on every
  privileged route, recent-auth on mutations, zod whitelists (no mass
  assignment), separation of duties (approver ≠ submitter)

### Tests

- **146/146 backend suite** (11 new). Live on the real backend: VIEWER →
  `403` on `/admin/users` and `/admin/analytics/summary`, anonymous → `401`,
  VIEWER → `200` on own notification list. Probe user cleaned up.

### Failures

- None. (One fixture fix: media-folder create requires a `slug`.)

### Remaining risks

- Governed GET list/detail is intentionally VIEWER-readable (staff CMS);
  if a future role needs read-restriction on DRAFT content, that gate would
  go here.
- `GET /admin/media/:id/usages` is auth-only introspection — consistent
  with governed read access; revisit if media metadata becomes sensitive.
- Authorization is role-based, not resource-permission-based; the current
  five-role model fits the team (documented in `security-architecture.md`).

### Status

**COMPLETE** — all roadmap acceptance cases tested: user → another user's
resource (notifications: isolated, 404), user → admin endpoint (403),
moderator → admin operation (403), user → private file (N/A — no file
surface), user → privileged API (403), manipulated resource IDs (404/403,
never another record).
