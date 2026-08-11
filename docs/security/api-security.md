# API Security Inventory

**Source:** SECURITY_ROADMAP.md Phase 9 · **Reviewed:** 2026-08-11 (Phases 0–11 + security Phases 1–8 complete)

Conventions: **PUBLIC** = unauthenticated; **AUTH** = session cookie required;
`zod` = explicit zod schema; **allowlist** = value checked against a fixed
server-side map; **param** = parameterized query (Prisma / pg, no string
interpolation). All errors are the uniform `{ error: { code, message } }`
shape; server errors never leak stack traces (Phase 5).

## Public API (`/api/public`)

| Endpoint | Auth | Authorization | Input schema | Output | Rate limit | Sensitive data | Ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /map` | none | none (public) | none | explicit projection (countries→regions→locations→facilities, coords only) | none | none | n/a |
| `GET /knowledge/facts` | none | PUBLISHED-only | none | explicit facts (text/source/verification/url) | none | none | n/a |
| `POST /analytics/events` | none | none | zod-equivalent `normalizeEvent` (type allowlist, required fields, length caps) | `{ok,id}` | **120/15m per IP** | none (no PII) | n/a |
| `POST /assistant/unanswered` | none | none | `unansweredQuestionSchema` (zod) | `{ok}` | **120/15m per IP** | question text (public feedback) | n/a |
| `GET /metrics/:key` | none | PUBLISHED-only | param | `{metric}` public projection | none | none | n/a |
| `GET /:entity` | none | PUBLISHED + visibility hook | **allowlist** (entity name) | per-entity projection; **Phase 9: media/contacts strip admin metadata** | none | none | n/a |
| `GET /:entity/:idOrSlug` | none | PUBLISHED + visibility hook | allowlist + param | single record, same projection | none | none | n/a |

## Auth API (`/auth`)

| Endpoint | Auth | Authorization | Input schema | Output | Rate limit | Sensitive data | Ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `POST /login` | none | none | `loginSchema` (zod) | `{user}` public projection or `{mfaRequired}` | **5/15m per IP** | none (generic errors) | n/a |
| `POST /mfa/verify` | session (pending MFA) | self | `mfaCodeSchema` (zod) | `{user}` | **5/15m per IP** | none | self only |
| `POST /logout` | optional | self | none | `{ok}` | none | none | self session |
| `GET /me` | AUTH | self | none | `publicUser` (no hash/secret) | none | none | self |
| `POST /mfa/setup` | AUTH | self | none | secret/QR (shown once) | none | TOTP secret (returned exactly once) | self |
| `POST /change-password` | AUTH | self + current password | `changePasswordSchema` + policy | `{ok}` | none | none | self; revokes other sessions |
| `GET /sessions` | AUTH | self | none | session list w/ device info | none | ip/user-agent (own sessions) | self |
| `DELETE /sessions/:sid` | AUTH | self | param | `{ok}` | none | none | **ownership in SQL (sid+userId)** |
| `POST /revoke-sessions` | AUTH | self | none | `{ok}` | none | none | self |

## Admin API (`/admin`)

| Endpoint | Auth | Authorization | Input schema | Output | Rate limit | Sensitive data | Ownership |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Governed CRUD + transitions (`/admin/:route`) | AUTH | EDITOR+/REVIEWER+/SUPER_ADMIN by action + **recent-auth** + separation of duties | zod create/update/transition | entity + version history (staff) | none | staff-only content (incl. DRAFT) | workflow state machine |
| `GET /admin/users` | AUTH | SUPER_ADMIN + recent-auth | none | `publicUser` only | none | **no hashes/secrets** | n/a |
| `PATCH /admin/users/:id/role` | AUTH | SUPER_ADMIN + recent-auth | `roleSchema` | `{user}` | none | role metadata | target user; audited |
| `PATCH /admin/users/:id/password` | AUTH | SUPER_ADMIN + recent-auth | `passwordResetSchema` + policy | `{ok}` | none | none | target user; revokes sessions; audited |
| `POST /admin/users/:id/revoke-sessions` | AUTH | SUPER_ADMIN + recent-auth | param | `{ok}` | none | none | target user; audited |
| `GET /admin/unanswered-questions` | AUTH | SUPER_ADMIN | none | rows | none | question text (internal) | n/a |
| `PATCH /admin/unanswered-questions/:id` | AUTH | SUPER_ADMIN | `unansweredResolveSchema` | row | none | question text | n/a; audited |
| `GET /admin/content-health` | AUTH | SUPER_ADMIN | none | report | none | internal scores | n/a |
| `GET /admin/analytics/summary` | AUTH | SUPER_ADMIN | `days` clamped 1–365 | aggregates | none | analytics (no PII) | n/a |
| `GET /admin/notifications` | AUTH | self | none | own rows | none | own notifications | **scoped userId** |
| `POST /admin/notifications/:id/read` | AUTH | self | param | row | none | own notification | **scoped id+userId** |
| `POST /admin/notifications/read-all` | AUTH | self | none | `{markedRead}` | none | own notifications | **scoped userId** |
| `GET /admin/review-queue` | AUTH | REVIEWER+ | none | aggregates | none | submitter emails (staff) | n/a |
| `GET /admin/publish-schedules` | AUTH | AUTH (read) | none | schedules | none | schedule metadata | n/a |
| `POST /admin/publish-schedules/:id/cancel` | AUTH | SUPER_ADMIN + recent-auth | param | schedule | none | none | n/a; audited |
| `POST /admin/media-folders` / `PATCH` | AUTH | EDITOR+ + recent-auth | zod | folder | none | none | n/a; audited |
| `GET /admin/media/:id/usages` | AUTH | AUTH (read-only) | param | usages | none | content references | n/a |
| `GET /admin/metrics` + transitions | AUTH | EDITOR+/REVIEWER+/VERIFIER by action + recent-auth | zod | metric + versions | none | staff-only figures | workflow |

## Cross-cutting controls (Phase 9 checklist)

- **Mass assignment**: every client-writable body goes through a zod schema;
  privileged fields (`role`, `status`, `verificationStatus`, …) are never
  client-settable (Phase 5 tests prove a smuggled `status` lands as DRAFT).
- **Excessive data exposure**: `publicUser` strips `passwordHash`/`mfaSecret`;
  Phase 9 tightened `media` (drops `uploadedBy`/`folderId`) and `contacts`
  (drops `verificationStatus`/`verificationDate`/`order`); public map/facts
  use explicit projections. Sweep test asserts no public row carries
  `passwordHash`/`mfaSecret`/`uploadedBy`.
- **API errors**: single error shape; 4xx messages are intentional,
  5xx are generic `Internal server error`; DB-unavailable → 503; oversized
  body → 413 `PAYLOAD_TOO_LARGE` (Phase 5).
- **Sensitive data**: no tokens/secrets/hashes on any response; TOTP secret
  returned exactly once at setup; audit metadata contains no secrets.
- **Ownership**: notifications (userId-scoped), sessions (sid+userId in
  SQL), and /auth self-routes are the only per-user resources — all
  ownership-enforced server-side (Phase 4).
- **CSRF**: /admin and /auth state changes require a same-origin or
  allowlisted Origin (Phase 8).
- **Rate limiting**: login/MFA 5/15m, public writes 120/15m. **Gap tracked**:
  no limiter on the authenticated admin API (Phase 10 target).
