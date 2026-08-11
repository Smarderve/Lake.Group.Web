# Dependency Inventory — backend/

SECURITY_ROADMAP Phase 1 acceptance: *dependency inventory exists*. Every
dependency, its purpose, and why it is present — verified against actual usage
in the code (not assumed). Last reviewed: 2026-08-11.

`npm audit --audit-level=high` → **0 vulnerabilities** (2026-08-11).

## Runtime dependencies (`backend/package.json`)

| Package | Purpose | Usage evidence |
| --- | --- | --- |
| `express` ^5.2.1 | Web framework / routing | `src/app.js` (app factory, all routers) |
| `express-session` ^1.19.0 | Server-side sessions (connect-pg-simple store) | `src/app.js:35`, `tests/helpers.js` |
| `pino` ^10.3.1 | Structured logging | `src/logger.js` |
| `pino-http` ^11.0.0 | Per-request HTTP logging | `src/app.js` |
| `bcrypt` ^6.0.0 | Password hashing (cost 12) | `src/lib/passwords.js` |
| `otplib` ^13.4.1 | TOTP MFA code generation/verification | `src/routes/auth.js` (mfa routes) |
| `qrcode` ^1.5.4 | MFA provisioning QR codes | `src/routes/auth.js` (mfa/setup) |
| `zod` ^4.4.3 | Input validation schemas (every route) | `src/validators/*`, `src/routes/governed.js` |
| `dotenv` ^17.4.2 | Load `.env` (secrets stay out of source) | `src/config.js:1`, `src/db.js:1` (`import 'dotenv/config'`) |
| `pg` ^8.23.0 | PostgreSQL driver (Prisma adapter + session store) | `src/db.js`, `scripts/_analytics-count.mjs` |
| `connect-pg-simple` ^10.0.0 | Postgres-backed session store | `src/db.js` |
| `express-rate-limit` ^8.6.2 | Brute-force / abuse throttling | `src/middleware/rate-limit.js` |
| `@prisma/client` ^7.9.1 | ORM (parameterized queries only — no raw SQL in routes) | generated client, all data access |
| `@prisma/adapter-pg` ^7.9.1 | Prisma ↔ pg driver adapter | `src/db.js` |

## Dev dependencies

| Package | Purpose |
| --- | --- |
| `prisma` ^7.9.1 | Migrations + client generation (`db:migrate`, `db:generate`) |
| `vitest` | Test runner (16 test files, 106 tests) |
| `supertest` | HTTP-level API tests |

## Security posture notes

- **No unnecessary security packages added** (roadmap Rule 13): no `helmet`
  (headers are hand-set in `src/middleware/security-headers.js`), no CSRF
  package (mitigation is SameSite=Lax + httpOnly + server-side sessions),
  validation uses the existing `zod`.
- **No new dependencies were added in Phase 1** — only scripts (`security:audit`,
  `start:prod`) and configuration.
- **Lockfile** (`package-lock.json`) is committed → reproducible installs.
- **Audit cadence**: `npm run security:audit` (`npm audit --audit-level=high`,
  exits non-zero on High/Critical) — wire into CI before production.
- **Supply-chain review** (roadmap Phase 17): major-version bumps require
  review before production; no transitive or peer installs beyond the above.
