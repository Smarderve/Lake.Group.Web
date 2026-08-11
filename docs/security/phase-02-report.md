# Phase 2 — Authentication: Completion Report

**Date:** 2026-08-11 · **Source:** `SECURITY_ROADMAP.md` §Phase 2

---

## PHASE: 2 — Authentication

### Audit result (existing implementation vs. acceptance criteria)

| Acceptance criterion | Status | Evidence |
| --- | --- | --- |
| Passwords securely hashed | ✅ | bcrypt cost **12** (`src/lib/passwords.js`); never MD5/SHA1/reversible |
| Login is rate limited | ✅ | `loginLimiter` 5 attempts / 15 min per IP (tested, `auth.test.js`) |
| Auth errors do not leak account existence | ✅ | Generic `Invalid email or password` for unknown email, wrong password, inactive account (tested) |
| Reset tokens are secure | ➖ | No email-based reset surface exists — resets are admin-initiated only (no token to secure) |
| Sessions handled securely | ✅ | Postgres-backed, `regenerate()` on login, TTL, logout, revocation (Phase 3 territory) |
| Authentication events logged | ✅ | `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `MFA_*`, `PASSWORD_RESET` in `AuditLog` |
| Registration abuse prevention | ➖ | No self-service registration surface (users created by script/admin) |

### Implemented

- **Password policy** (`src/lib/password-policy.js`) — per the roadmap: minimum
  length 8, maximum 128, **common-password rejection** (bundled list of the
  most-breached passwords, case-insensitive, offline — no new dependency),
  **predictable-password rejection** (passwords embedding the email
  local-part), and strong hashing (existing bcrypt-12). Deliberately no
  arbitrary complexity rules.
- **Self-service password change** — `POST /auth/change-password`:
  - reauthentication via the current password (roadmap: "For sensitive
    accounts/actions, require reauthentication")
  - new password checked against the policy (`WEAK_PASSWORD` 400 on failure)
  - **revokes every other session** for the account, keeps the current one
    (`revokeAllForUserExcept` in `src/lib/sessions.js` + real-SQL variant)
  - audits `PASSWORD_CHANGED`; failed reauthentication audits
    `PASSWORD_CHANGE_FAILED`
- **Policy enforced at every set-point**:
  - admin password reset (`PATCH /admin/users/:id/password`) now rejects
    weak passwords with `WEAK_PASSWORD` (was accepting anything ≥ 8 chars)
  - `scripts/create-user.js` refuses weak passwords at the CLI
- **Session revocation helper** — `revokeAllForUserExcept(userId, keepSid)`
  added to the live connect-pg-simple store and the in-memory test store.

### Modified

- `backend/src/lib/password-policy.js` (new)
- `backend/src/routes/auth.js` (`/auth/change-password`)
- `backend/src/routes/admin.js` (policy on reset)
- `backend/src/lib/sessions.js` (`revokeAllForUserExcept`)
- `backend/src/validators/auth.js` (`changePasswordSchema`)
- `backend/scripts/create-user.js` (policy gate)
- `backend/tests/helpers.js` (fake-store `revokeAllForUserExcept`)

### Created

- `backend/tests/phase2-auth.test.js` — **13 tests**

### Security controls

- Password policy (common/predictable-password rejection) at every set-point
- Reauthentication for privileged self-service action
- Session revocation on password change (stolen-session containment)
- Security-event logging for change success and failure

### Tests

- **127/127 backend suite** (13 new: policy unit tests, change-password flow
  incl. revocation + audit, admin-reset policy)
- **Live verification on real Postgres**: created user via CLI (weak password
  rejected by the script) → login → change-password → old password rejected,
  new password works, session survives → `PASSWORD_CHANGED` row confirmed in
  the real `AuditLog` table (FK is `ON DELETE SET NULL`, so the audit trail
  survives account deletion — verified). Probe user cleaned up.

### Failures

- None. (Two early test-fixture issues: `qwerty`/`letmein` are < 8 chars so
  they hit the min-length branch before the common-password check — correct
  behavior, fixtures fixed; and the admin-reset fixture used a 6-char common
  password that zod rejects first — fixture fixed.)

### Remaining risks

- No **email-based password reset** (forgot-password) flow — a UX gap, not a
  security gap (no reset-token attack surface exists). Needs an SMTP decision
  before it can ship.
- Compromised-password checking is a bundled common-password list; a live
  HIBP-style breach check is a future enhancement (network dependency,
  deferred deliberately).
- No registration rate limit — no self-service registration surface exists.

### Status

**COMPLETE** — all applicable acceptance criteria verified (hashed ✅, login
rate-limited ✅, no enumeration ✅, reset-token surface N/A ✅ documented,
sessions ✅, events logged ✅), with policy and self-service change added.
