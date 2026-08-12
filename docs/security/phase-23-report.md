# SECURITY_ROADMAP Phase 23 — Manual Security Review

**Date:** 2026-08-12 · **Phase source:** `SECURITY_ROADMAP.md` §23

## What this phase is

The human-style review pass: a fresh set of eyes over the accumulated
findings from Phases 0–22, hunting **business-logic / abuse-of-feature**
issues — the class automated scanners miss. Every externally reachable
surface was read end to end (routes + libs), not just the diff of prior
phases.

## Review scope (surfaces read)

- **Auth flows** — `routes/auth.js`, `lib/passwords.js`, `lib/password-policy.js`,
  `lib/mfa.js`: bcrypt-12, generic login errors, rate-limited login/MFA,
  policy (min-length, common-password, email-embedding), admin reset revokes
  target sessions, change-password reauth + revoke-others. No gap.
- **Session handling** — `lib/sessions.js`: Postgres store, regenerate-on-login,
  rolling idle expiry, per-session ownership-bound revocation. No gap.
- **Authorization** — `middleware/auth.js`: `requireAuth` **reloads the role
  from the DB on every request**, so demotions/promotions take effect
  immediately (no session-revocation race); `requireRole` + `requireRecentAuth`
  on every admin mutation. Verified across all routers.
- **Business logic** — `lib/governed.js`, `routes/governed.js`,
  `routes/children.js`, `routes/publish-schedules.js`, `lib/publisher.js`:
  separation of duties (approver ≠ submitter), governed transitions,
  lazy scheduled publishing, child resources with parent-existence +
  dual-key ownership checks, archived-not-deleted. No gap.
- **Public API** — `routes/public.js`: PUBLISHED-only + visibility hooks,
  rate-limited writes, explicit pagination caps, minimal projections.
  No gap.
- **Admin functions** — `routes/admin.js`: RBAC + recent-auth on every route,
  audited role changes / password resets / revocations.
- **Other libs** — `analytics.js`, `impact.js`, `metrics.js`, `knowledge.js`,
  `media-usage.js`, `security-log.js`, `audit.js`: reviewed, no gap.

## Findings

### Closed this phase (code gaps)

**FINDING 23-1 — Self-role-change lockout (business-logic, real, live-proven).**
`PATCH /admin/users/:id/role` allowed a SUPER_ADMIN to change **their own**
role. Because `requireAuth` reloads the role from the DB every request, the
demotion took effect immediately — a single mistaken or coerced call
permanently locks the admin surface (only a SUPER_ADMIN can promote again).
**Live proof:** before the fix, a probe SUPER_ADMIN demoted itself → 200, and
the very next admin call returned 403 — the exact self-inflicted denial of
service this guards against.
**Fix:** the endpoint now rejects self-role-change with
`400 ROLE_SELF_CHANGE` and writes a `ROLE_CHANGE_DENIED` audit row
(`reason: self_role_change`). Defense-in-depth: demoting a SUPER_ADMIN when
the change would leave **zero** active SUPER_ADMINs is refused
(`409 LAST_SUPER_ADMIN`), covering a stale-role race; the count excludes the
target so the harmless demotion of an **inactive** admin is not over-blocked.

**FINDING 23-2 — Unbounded admin read of a publicly-written table.**
`GET /admin/unanswered-questions` returned every row with no pagination,
while its rows are created by an **unauthenticated** public POST
(`/api/public/assistant/unanswered`, rate-limited but open). Every other
admin list received caps in Phase 10/19; this one was missed — an attacker
flooding the public channel could grow an unbounded, unindexed admin read.
**Fix:** the route now carries the same caps as the audit-log viewer
(`limit` 1–100, `offset` 0–10000, malformed → 400) and returns `total`.

### Verified clean (documented, no change)

- Role changes need no session revocation — the per-request DB reload makes
  them atomic. (Tested: demoted probe lost admin access on the next request.)
- Notifications (list / read / read-all / mark-read) are owner-scoped;
  cross-user access → 404 with no side effect.
- Public writes are rate-limited; public reads are PUBLISHED-only with
  per-entity visibility hooks (scheduling, publicDisplay, OPEN listings).
- Admin password reset revokes the target's sessions and is audited.
  Accepted residual: an admin can reset another admin's password — inherent
  to the feature; mitigated by recent-auth, audit trail, and revocation.
- Children (milestones/events) enforce parent existence and dual-key
  ownership; deletions are hard only for children (governed entities are
  archive-only by design).
- `ROLE_CHANGE_DENIED` joins `AUTHORIZATION_DENIED` / `RATE_LIMIT_TRIGGERED`
  as the third security-event family — denied *business-rule* attempts are
  now on the audit trail too.

## Tests added

`backend/tests/phase23-manual-review.test.js` (8 tests):

- self-demotion → 400 `ROLE_SELF_CHANGE`, role unchanged in the DB, and the
  `ROLE_CHANGE_DENIED` audit row exists with the reason;
- self-promotion equally refused;
- demoting another SUPER_ADMIN still works while an active admin remains
  (no over-blocking) and is audited `ROLE_CHANGE`;
- demoting an **inactive** SUPER_ADMIN is not over-blocked (regression for
  the guard's count semantics);
- ordinary non-admin role changes still work;
- unanswered-questions list is capped (limit/offset/total);
- malformed pagination → 400;
- non-admins still get 403 on the changed route.

Support: `user.count` added to the fake-DB user delegate and `count` to the
generic rows delegate in `tests/helpers.js`.

## Live verification (real Postgres, backend on :4000, 2026-08-12)

- Fresh restart pinned to the fixed code (the running instance predated the
  fix — the drill against it **demonstrated** the vulnerability, then the
  re-drill proved the fix).
- Probe A (SUPER_ADMIN) login → self-demotion → **400 ROLE_SELF_CHANGE**,
  A remains SUPER_ADMIN.
- Probe B (SUPER_ADMIN) demoted by A → **200**, B becomes EDITOR.
- Audit trail (psql-backed viewer): `ROLE_CHANGE_DENIED` (probe A,
  `self_role_change`) and `ROLE_CHANGE` (probe B → EDITOR) both present.
- Unanswered-questions: 2 rows planted via the public POST (201), capped
  read returned 1 row / total 25 / limit 1, `limit=999` → 400.
- Probes cleaned: 2 users + 2 planted questions deleted; backend healthy.

## Verification runs

- `tests/phase23-manual-review.test.js`: 8/8.
- Full backend suite: **268/268** (was 260; +8).
- `npm run lint`: 0 errors (119 documented security-plugin warnings).
- `npm run test:gate`: PASS (security suites 155 + audit gate).
- One self-caught issue: a pre-existing dead variable in `dast-probe.js`
  (Phase 22 file) surfaced in this phase's lint sweep — fixed.

## Residual risk

- 409 `LAST_SUPER_ADMIN` is defense-in-depth: not reachable via normal HTTP
  (the actor is always an active SUPER_ADMIN, so the self-check fires
  first) — it guards a stale-role race between auth load and the count.
- Admin-reset-of-admin remains an accepted, audited capability.
