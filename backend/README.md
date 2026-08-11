# Lake Group Backend — Foundation (Ph 1) + Identity (Ph 2) + Metrics (Ph 3) + Corporate Registry (Ph 4) + CMS Core (Ph 5) + Map & Media (Ph 6) + Governance & Publishing (Ph 7)

A production-structured **Node.js / Express + PostgreSQL** backend for the Lake
Group website, running locally on the company's own server. Phase 1 established
the skeleton (server, Prisma, validation, logging, error handling, `/health`,
tests). Phase 2 adds the identity layer: Postgres-backed sessions, bcrypt login,
RBAC, TOTP MFA, rate limiting, and audit logging. Phase 3 proved the governed
content pattern (Draft → Review → Approve → Publish → Rollback, versioning,
audit) with **corporate metrics** — the homepage Employees stat now comes from
the API. Phase 4 scales that **one shared governed-entity pattern** across the
full **corporate registry**: Country, Region, Location, Facility, Category,
Company (with subsidiary self-relation), ProductService, and
CompanyRelationship. Phase 5 applies the **same pattern, unchanged in shape**, to
the full **CMS core** — Page + reusable ContentBlock (join table), News (with
scheduled publishing + unpublish), Project + Milestone, Leadership +
LeadershipEvent timeline, Contact, HistoryEvent (multi-company join),
CareerListing (open/closed), CSREntry — plus a lightweight Media stub. Phase 6
builds the **operations map and full media library**: `MapCategory` layers,
map display fields on `Facility` (`mapCategoryId`/`mapVisible`/`markerLabel`),
a database-driven `GET /api/public/map` payload, and `Media` upgraded to a
full governed library — folders, tags, captions, copyright/licensing,
variants, replacement (same id, new file), usage tracking (`MediaUsage`),
and archive protection (in-use media cannot be archived). Phase 7 wraps the
whole workflow in **governance & publishing tooling**: a cross-entity review
queue, a reject transition, scheduled publishing with lazy promotion (no
cron), impact analysis (pending diff + dependent entities — the
"Employees 4,600 → 4,850 affects the homepage keyfacts" check), in-app
notifications (self-hosted, no email/SMS), and a publication-event ledger.
See `docs/PHASE-0-AUDIT.md` (repo root) for the migration map and
`backend/docs/governed-entity-pattern.md` for how to add further entities.

**Constraints honored:**
- Runs locally on the company's own server — **no external or paid services** (no
  cloud DB, no cloud storage, no SaaS auth, no hosted logging, no paid SMS/email).
- Sessions live in the **same local PostgreSQL** as everything else
  (`connect-pg-simple`) — one database dependency, no Redis.
- MFA is self-hosted TOTP (Google Authenticator / Authy compatible), no external
  identity provider.
- Single Express server, simple folder structure, no microservices.
- No Docker (not requested — keep it plain).

---

## Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js ≥ 22.6** (Node 24 LTS recommended) | Needed for native TypeScript type-stripping used by the generated Prisma client |
| **PostgreSQL** installed and running locally | The connection string points at `localhost` (or the server's local address) |
| A database created for this project | e.g. `createdb lakegroup` (any name — it lives in `DATABASE_URL`) |

Check: `node --version` and `pg_isready` (or try connecting with your Postgres client).

---

## Setup

```bash
cd backend
npm install          # installs deps and runs `prisma generate` (postinstall)
```

### 1. Configure `.env`

```bash
cp .env.example .env
```

Then edit `.env` and set **your real** values. Required: `DATABASE_URL` and
`SESSION_SECRET` (generate one with `openssl rand -hex 32`). Optional overrides:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | Local PostgreSQL connection string |
| `PORT` | `4000` | Express port |
| `LOG_LEVEL` | `info` | pino level: `trace`/`debug`/`info`/`warn`/`error`/`fatal`/`silent` |
| `SESSION_SECRET` | — | Signs session cookies. **Unset = sessions disabled, every auth request rejected** |
| `SESSION_NAME` | `lakegroup.sid` | Session cookie name |
| `SESSION_TTL_MS` | `28800000` (8 h) | Session lifetime |
| `RECENT_AUTH_WINDOW_MS` | `900000` (15 min) | Window for privileged actions (`requireRecentAuth`) |
| `BCRYPT_COST` | `12` | bcrypt cost factor (≥ 10 recommended; tests use a low cost) |
| `SESSION_COOKIE_SECURE` | `true` in production | HTTPS-only cookie flag |
| `TRUST_PROXY` | `0` | Set `1` behind nginx/caddy so client IPs come from `X-Forwarded-For` (rate limiting + audit) |

`.env` is gitignored and must never be committed. Only `.env.example` (placeholders)
is in the repo.

### 2. Apply the database migrations

Migrations are generated under `prisma/migrations/`:
- `0001_init` — proves the connection (placeholder table).
- `0002_auth` — `User` table (email, password hash, `Role` enum, MFA fields, `active`),
  `AuditLog` table, and role enum. The `session` table is created automatically by
  the session store at first request.

```bash
npm run db:migrate        # prisma migrate deploy (applies pending migrations)
```

Or, during development when you want Prisma to also generate the client and
re-detect schema drift:

```bash
npm run db:migrate:dev    # prisma migrate dev
```

If you ever regenerate the client manually: `npm run db:generate`.

### 3. Create your first user

There is no signup UI yet — create users from the CLI:

```bash
npm run create-user -- --email admin@lakegroup.com --password 'a-strong-password' --role SUPER_ADMIN
```

Roles: `SUPER_ADMIN`, `EDITOR`, `REVIEWER`, `CONTACT_MANAGER`, `VIEWER`.
Run `npm run create-user -- --help` for all options (including `--mfa` to force a
pending MFA setup and `--inactive`).

### 4. Seed the initial metrics (Phase 3)

```bash
npm run seed:metrics        # idempotent — creates the canonical group metrics (employees 30,000+, trucks 1,200+, stations 152, countries 10, nationalities 21, subsidiaries 18+) as PUBLISHED
npm run seed:metrics -- --force   # overwrite an existing metric
npm run seed:content        # Phase 8/9 content: companies, countries, facilities, projects, leadership, contacts, history, CSR, careers, news + gallery (idempotent)
npm run seed:content -- --force   # clear + reseed (reverse-dependency cleanup)
npm run seed:all            # metrics + content
```

The seed onboards the *existing* website truth directly as PUBLISHED (the
workflow governs future *changes*).

### 5. Content Health / Data Quality dashboard (Phase 10)

```bash
npm run health:report       # full dashboard from the real DB: scores + every check
```

Admin API: `GET /admin/content-health` and `GET /admin/analytics/summary?days=30`
(SUPER_ADMIN). Public capture: `POST /api/public/analytics/events` (page views,
chat questions, no-match queries). Set `LAKE_SITE_ROOT` / `LAKE_I18N_PATH` to
enable filesystem checks (link existence, SEO scan, translations);
`LAKE_CHECK_EXTERNAL_LINKS=true` adds live HEAD checks of external URLs.
See `docs/PHASE-10-ANALYTICS-INTELLIGENCE.md`.

### 6. Hardening & operations (Phase 11)

```bash
npm run perf:load          # load gate: 300 concurrent-ish GETs, p95 <= 500ms
npm run db:backup          # pg_dump -Fc → backups/lakegroup-<stamp>.dump
npm run db:restore -- backups/<file> [target-db]   # drill into a scratch DB
```

Security headers + public write rate limits are on by default; HSTS activates
with `SESSION_COOKIE_SECURE=true` (HTTPS). Full runbook incl. rollback:
`docs/PHASE-11-HARDENING-PRODUCTION.md`.

---

## Run the dev server

```bash
npm run dev
```

Starts with file-watch reload on `http://localhost:4000` (override with `PORT` in `.env`).

Check it:

```bash
curl http://localhost:4000/health
```

- **200** `{"status":"ok","db":"up",...}` — server and database are both healthy.
- **503** `{"status":"degraded","db":"down",...}` — server is up but the database is
  unreachable (or `DATABASE_URL` is unset). Check Postgres is running and `.env` is correct.

---

## Run the tests

```bash
npm test                 # vitest run (single command)
```

Tests:
- `tests/server.test.js` — the Express app boots and answers on a real port.
- `tests/health.test.js` — `GET /health` returns 200 (db up) and 503 with a clear error (db down).
- `tests/example-validation.test.js` — Zod validation pattern demo (`POST /example/echo`).
- `tests/error-handler.test.js` — DB-unreachable errors map to 503; generic errors are masked as 500.
- `tests/auth.test.js` — login/logout/me, generic errors (no user enumeration), audit rows,
  session revocation, and rate limiting after 5 failed attempts.
- `tests/rbac.test.js` — `/admin/ping` rejects unauthenticated (401) and wrong-role (403)
  requests; role changes are audited; privileged actions require recent authentication;
  admin password reset and session revocation work.
- `tests/metrics.test.js` — Phase 3: full governance flow (create → submit → approve →
  publish → rollback) with audit trail, public endpoint only serving PUBLISHED data,
  separation of duties, and stale-data detection.
- `tests/health.db.integration.test.js` — **optional**: hits the real configured PostgreSQL.
  Automatically skipped when the database is unreachable, so `npm test` passes even on
  machines without a database.

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma          # datasource + generator + User/AuditLog models
│   ├── config.ts              # Prisma 7 config — reads DATABASE_URL from .env
│   └── migrations/            # 0001_init (connection), 0002_auth (User, AuditLog)
├── generated/                 # Prisma client (gitignored, from `prisma generate`)
├── scripts/
│   └── create-user.js         # CLI to create users (no signup UI yet)
├── src/
│   ├── index.js               # entry — wires real deps, starts server, graceful shutdown
│   ├── app.js                 # createApp factory (deps injected for tests)
│   ├── config.js              # env config (see table above)
│   ├── logger.js              # pino structured logger
│   ├── db.js                  # PrismaClient + pg adapter; pingDb(); connect-pg-simple store
│   ├── lib/
│   │   ├── passwords.js       # bcrypt hash/verify (cost 12)
│   │   ├── mfa.js             # TOTP secret/verify + otpauth URL + QR data URL
│   │   ├── audit.js           # writeAudit() — server-set actor/action, never client-supplied
│   │   ├── sessions.js        # session revocation helper (kill all sessions for a user)
│   │   └── users.js           # publicUser() projection (never leaks hash/secret)
│   ├── middleware/
│   │   ├── error-handler.js   # 404 + centralized error → consistent JSON; DB-down → 503
│   │   ├── auth.js            # requireAuth / requireRole / requireRecentAuth
│   │   └── rate-limit.js      # login + MFA brute-force limiters (5/15 min per IP)
│   ├── routes/
│   │   ├── health.js          # GET /health (real DB connectivity check)
│   │   ├── example.js         # validation pattern demo (dummy route)
│   │   ├── auth.js            # login/logout/me/MFA/revoke-sessions
│   │   ├── admin.js           # admin user management (role, password reset, revocation)
│   │   ├── metrics.js         # Phase 3: metric workflow (create/edit/submit/approve/publish/rollback/stale)
│   │   └── public.js          # Phase 3: GET /api/public/metrics/:key (PUBLISHED only, CORS *)
│   └── validators/
│       ├── example.js         # example Zod schema
│       ├── auth.js            # login + MFA code schemas
│       └── metrics.js         # metric create/update + transition schemas
└── tests/                     # Vitest + Supertest (hermetic — in-memory db/store)
```

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | — | Liveness + database connectivity |
| `POST` | `/example/echo` | — | Validation pattern demo (dummy) |
| `POST` | `/auth/login` | rate-limited | Email + password login (MFA accounts return `{mfaRequired:true}`) |
| `POST` | `/auth/mfa/verify` | rate-limited | Complete MFA login, or confirm MFA setup |
| `POST` | `/auth/mfa/setup` | ✓ | Generate TOTP secret + QR code (secret returned once) |
| `POST` | `/auth/logout` | session | Destroy the current session |
| `GET` | `/auth/me` | ✓ | Current user (public projection) |
| `POST` | `/auth/revoke-sessions` | ✓ | Kill every session for the current user (incl. this one) |
| `GET` | `/admin/ping` | ✓ SUPER_ADMIN | Placeholder protected route — proves RBAC end-to-end |
| `PATCH` | `/admin/users/:id/role` | ✓ SUPER_ADMIN + recent auth | Change a user's role (audited) |
| `POST` | `/admin/users/:id/password` | ✓ SUPER_ADMIN + recent auth | Reset a user's password (revokes their sessions) |
| `POST` | `/admin/users/:id/revoke-sessions` | ✓ SUPER_ADMIN + recent auth | Revoke all sessions of a user |
| `GET` | `/admin/metrics` | ✓ | List all metrics (all statuses) |
| `GET` | `/admin/metrics/stale?days=180` | ✓ REVIEWER+ | Stale-data detection (verificationDate older than the window) |
| `POST` | `/admin/metrics` | ✓ EDITOR+ | Create a metric (always lands in DRAFT; requires source + reason) |
| `PATCH` | `/admin/metrics/:id` | ✓ EDITOR+ | Edit a metric (reopens to DRAFT; value change resets verification) |
| `POST` | `/admin/metrics/:id/submit` | ✓ EDITOR+ | DRAFT → IN_REVIEW |
| `POST` | `/admin/metrics/:id/approve` | ✓ REVIEWER+, ≠ submitter | IN_REVIEW → APPROVED (separation of duties) |
| `POST` | `/admin/metrics/:id/publish` | ✓ REVIEWER+ | APPROVED → PUBLISHED (the only state the public API reads) |
| `POST` | `/admin/metrics/:id/verify` | ✓ EDITOR/REVIEWER+ | Re-verify the fact (clears the stale flag; value/status unchanged) |
| `POST` | `/admin/metrics/:id/rollback` | ✓ SUPER_ADMIN | Restore the previous published value as a NEW published version |
| `GET` | `/api/public/metrics/:key` | **public** | Current PUBLISHED value (404 for anything else; CORS `*`) |
| `GET` | `/admin/countries`, `/admin/regions`, `/admin/locations`, `/admin/facilities`, `/admin/categories`, `/admin/companies`, `/admin/product-services`, `/admin/company-relationships` | ✓ | List registry records (all statuses) |
| `POST` | `/admin/:entity` | ✓ EDITOR+ | Create a registry record (DRAFT; requires `reason`) |
| `PATCH` | `/admin/:entity/:id` | ✓ EDITOR+ | Edit (reopens to DRAFT; immutable `slug`/`isoCode`) |
| `POST` | `/admin/:entity/:id/submit` | ✓ EDITOR+ | DRAFT → IN_REVIEW |
| `POST` | `/admin/:entity/:id/approve` | ✓ REVIEWER+, ≠ submitter | IN_REVIEW → APPROVED (separation of duties) |
| `POST` | `/admin/:entity/:id/publish` | ✓ REVIEWER+ | APPROVED → PUBLISHED |
| `POST` | `/admin/:entity/:id/rollback` | ✓ SUPER_ADMIN | Restore the previous published snapshot as a NEW published version |
| `POST` | `/admin/:entity/:id/archive` | ✓ SUPER_ADMIN | → ARCHIVED (Country blocked while Regions remain, `DEPENDENTS_EXIST`) |
| `GET` | `/api/public/:entity`, `/api/public/:entity/:idOrSlug` | **public** | PUBLISHED records only (404 for anything else; CORS `*`) |
| `GET` | `/admin/pages`, `/admin/content-blocks`, `/admin/news`, `/admin/projects`, `/admin/leadership`, `/admin/contacts`, `/admin/history-events`, `/admin/career-listings`, `/admin/csr-entries` | ✓ | List CMS records (all statuses) |
| `POST` | `/admin/:cms-entity` | ✓ EDITOR+ | Create (DRAFT; requires `reason`). `pages` takes `contentBlocks: [block keys]`, `history-events` takes `companyIds` |
| `PATCH` | `/admin/:cms-entity/:id` | ✓ EDITOR+ | Edit (reopens to DRAFT; immutable `slug`/`key`) |
| `POST` | `/admin/:cms-entity/:id/submit` · `/approve` (≠ submitter) · `/publish` | ✓ EDITOR+/REVIEWER+ | The standard workflow |
| `POST` | `/admin/:cms-entity/:id/unpublish` | ✓ REVIEWER+ | PUBLISHED → DRAFT take-down (News) |
| `POST` | `/admin/:cms-entity/:id/rollback` · `/archive` | ✓ SUPER_ADMIN | Restore previous published snapshot / archive |
| `POST` | `/admin/projects/:id/milestones` · `PATCH`/`DELETE` `/…/:milestoneId` | ✓ EDITOR+ | Milestone child CRUD (audited, not governed) |
| `POST` | `/admin/leadership/:id/events` · `PATCH`/`DELETE` `/…/:eventId` | ✓ EDITOR+ | LeadershipEvent timeline CRUD — recomputes the leader's `currentStatus` from the latest event |
| `GET` | `/admin/media` · `POST` `/admin/media` | ✓ / ✓ EDITOR+ | Media stub list / create (`uploadedBy` server-set) |
| `GET` | `/api/public/pages`, `/api/public/news`, `/api/public/leadership`, `/api/public/contacts`, `/api/public/history-events`, `/api/public/career-listings`, `/api/public/csr-entries`, `/api/public/content-blocks`, `/api/public/projects` | **public** | PUBLISHED + visible records only (News respects `publicationDate`, Contacts `publicDisplay`, Listings `listingStatus: OPEN`) |
| `GET` | `/admin/media`, `/admin/map-categories` | ✓ | List media / map layers (all statuses) |
| `POST` | `/admin/media` | ✓ EDITOR+ | Create media (DRAFT; `uploadedBy` server-set; requires `reason`) |
| `PATCH` | `/admin/media/:id` | ✓ EDITOR+ | Replacement — new url/variants, same id (old file stays in version history) |
| `POST` | `/admin/media/:id/submit` · `/approve` · `/publish` · `/rollback` · `/archive` | ✓ | Full governed workflow; archive blocked while in use (`MEDIA_IN_USE`) |
| `GET` | `/admin/media/:id/usages` | ✓ | Which entities use this media item (`MediaUsage`) |
| `GET`/`POST`/`PATCH` | `/admin/media-folders` | ✓ / ✓ EDITOR+ | Folder CRUD (organizational, not governed) |
| `POST` | `/admin/map-categories` + workflow | ✓ EDITOR+/REVIEWER+ | Map layers; archive blocked while facilities reference them (`DEPENDENTS_EXIST`) |
| `GET` | `/api/public/map` | **public** | Database-driven operations map: published countries → regions → locations → facilities (map-visible + coordinates only) + layers |
| `GET` | `/api/public/media`, `/api/public/media/:id` | **public** | Published gallery (metadata, tags, variants; no drafts/archived) |
| `GET` | `/api/public/map-categories` | **public** | Published map layers (generic entity endpoint) |
| `GET` | `/admin/review-queue` | ✓ REVIEWER+ | Everything in review / approved-awaiting-publish / scheduled, across all entities + metrics |
| `POST` | `/admin/:entity/:id/reject` | ✓ REVIEWER+, reason required | IN_REVIEW → DRAFT, sent back to the submitter with an explanation |
| `POST` | `/admin/:entity/:id/schedule` | ✓ EDITOR+, from APPROVED | Plan a future publication (lazy-promoted when `publishAt` arrives) |
| `GET` | `/admin/publish-schedules` · `POST` `/admin/publish-schedules/:id/cancel` | ✓ / ✓ SUPER_ADMIN | List pending schedules / cancel one |
| `GET` | `/admin/:entity/:id/impact` · `GET` `/admin/metrics/:key/impact` | ✓ | Impact analysis: published vs pending diff + dependent entities/consumers + stale flag |
| `GET` | `/admin/notifications` · `POST` `/…/:id/read` · `POST` `/…/read-all` | ✓ | In-app notifications (submit→reviewers, approve/reject/publish→submitter) |

## Security notes

- **Passwords:** bcrypt at cost **12** (above the default 10); hashes never leave
  the server. Login failures return a **generic** `Invalid email or password` —
  the API never reveals whether an email exists (no user enumeration).
- **Sessions:** Postgres-backed (`connect-pg-simple`), cookie flags `httpOnly`,
  `sameSite=lax`, `secure` in production. Secret from `.env`, never hardcoded.
- **MFA:** self-hosted TOTP (works with Google Authenticator / Authy). The secret is
  returned **once** at setup (as a QR code); login requires the 6-digit code as a
  second step for accounts with MFA enabled.
- **Rate limiting:** 5 attempts per 15 minutes per IP on `/auth/login` and
  `/auth/mfa/verify`.
- **RBAC:** roles enforced via `requireAuth` + `requireRole(...)` middleware;
  privileged actions additionally require authentication within the last 15 minutes
  (`requireRecentAuth`) — the pattern later phases reuse for approvals/publishing.
- **Audit log:** every login, logout, failed login, MFA event, role change, password
  reset and session revocation writes an `AuditLog` row. `actorId`/`action` are set
  **server-side** — client-supplied values are never trusted. Failed logins are not
  attributed to an actor (identity is unconfirmed); the attempted email goes in
  `metadata`.
- **Errors:** consistent JSON shape `{ "error": { "code", "message" } }`; stack
  traces are logged server-side only. Database-unreachable errors return **503**
  `SERVICE_UNAVAILABLE` (matching `/health` degraded state), never a bare 500.
