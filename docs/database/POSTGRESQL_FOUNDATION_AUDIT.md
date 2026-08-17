# PostgreSQL Foundation Audit — Lake Group Project

> Phase 0 / Phase 1 output of the *PostgreSQL Central Data & File Foundation Migration Plan*.
> Read-only audit. **Nothing was changed during this audit.**
> Audit date: 2026-08-14. Verified live against the running system.

---

## 1. Application

| Area | Reality (verified) |
|---|---|
| Public frontend | Static HTML pages served from the repo root by Vercel (`cleanUrls: false` → every root `.html` is a public URL). Vanilla JS modules under `assets/` (`news-api.js`, `registry-api.js`, `metrics-api.js`, `i18n.js`, `assistant.js`, `pwa.js`, …). PWA via `sw.js`. |
| CMS | React + Vite SPA in `cms/` (dev server :5173, proxies `/auth /admin /api /health` → backend :4000). Login → `/app` shell → feature pages (dashboard, news, companies, projects, leadership, media, metrics, …). |
| Backend | Node.js + Express in `backend/`, **Prisma ORM → PostgreSQL**. Session auth with CSRF double-submit cookie, bcrypt password hashes, optional TOTP MFA. Health endpoint `GET /health` reports `db: up`. |
| Build system | `cms/` = Vite (typecheck + build scripts). Public site = static, no build step; a bundle build exists for the hero globe (`scripts/build_hero_globe.js`). |
| Deployment | Public site → Vercel (static root). Backend + CMS currently run locally on this PC (dev). No production server exists yet. |
| Authentication | `POST /auth/login` (email + password + optional TOTP), session cookie, `/auth/me`. Rate-limited login (5/15 min). |
| Authorization | RBAC roles: `SUPER_ADMIN`, `EDITOR`, `REVIEWER`, `CONTACT_MANAGER`, `VIEWER`. Role-gated admin routes; governed workflow `DRAFT → IN_REVIEW → APPROVED → PUBLISHED` / `ARCHIVED`; only PUBLISHED is served publicly. Publication ledger + scheduled publishing exist. |

## 2. Existing data

| Category | Current source | Current location | Actual data location | Used by | Migration destination | Risk |
|---|---|---|---|---|---|---|
| Users / roles | PostgreSQL `lakegroup.User` | DB | DB (4 users, bcrypt hashes, MFA flags) | Backend auth | Already in place | Low |
| News | PostgreSQL `lakegroup.News` (41 rows) + versions | DB | DB | CMS editors, public `/api/news` | Already in place | Low |
| Companies / subsidiaries / categories | PostgreSQL `Company` (21), `Category` (13), relationships, versions | DB | DB | CMS registry, public `/api/companies` | Already in place | Low |
| Leadership | PostgreSQL `Leadership` (8) + events | DB | DB | CMS, public API | Already in place | Low |
| Projects / milestones | PostgreSQL `Project` (6) + `Milestone` | DB | DB | CMS, public API | Already in place | Low |
| Metrics | PostgreSQL `Metric` (6) + `MetricVersion` | DB | DB | CMS metrics governance | Already in place | Low |
| Contacts / careers / CSR / content blocks / pages | PostgreSQL (`Contact` 16, `CareerListing` 5, `CSREntry` 6, `ContentBlock` 1, `Page` 47) | DB | DB | CMS, public API | Already in place | Low |
| Audit / activity | PostgreSQL `AuditLog` (793), `PublicationEvent` (5), `AnalyticsEvent` (2784) | DB | DB | Admin audit surface | Already in place | Low |
| Media metadata | PostgreSQL `Media` (67) + `MediaFolder` + `MediaUsage` | DB | DB (metadata) | CMS media library | Already in place | Low |
| Media binaries | Local object storage `backend/uploads/` (adapter: `local` or `s3`), served at `/media/files` | Disk | Disk | Public pages via media URLs | **Not in Postgres — see §4 decision point** | Medium |
| Translation / i18n | UI: `assets/i18n.js` + `assets/i18n-content.js` (en/sw/ar/fr/pt/es, Arabic RTL). **CMS-managed content translations: no table exists** | Static JS | Repo assets | Public site language switcher | Phase 17 remains open | Medium |
| Hardcoded frontend data (legacy) | `assets/news-data.js`, `assets/data_countries_africa.js`, `assets/news-thumbnails.js`, `assets/assistant-kb.js` (KB knowledge), static HTML page copy | Repo assets | Repo assets | Static pages as **fallback/resilience layer**; primary path is `/api/*` via `news-api.js`/`registry-api.js`/`metrics-api.js` | Keep as resilience fallback; Phase 10 partially open | Low |
| Config data | `backend/.env` (DATABASE_URL etc.), `backend/.env.example` (names only) | Repo | Repo (gitignored for real values) | Backend | Already in place | Low |

## 3. Existing files

| Category | Current source | Current location | Actual file location | Used by | Migration destination | Risk |
|---|---|---|---|---|---|---|
| Site images / logos | `assets/`, `public-content/`, `lake-story-assets/`, `lake-3d/` | Repo dirs | Repo dirs | Public pages (Vercel static) | Stay (public URLs) | Low |
| CMS uploads | `backend/uploads/` (object-storage adapter) | Disk | Disk, metadata in DB | Media library, public `/media/files` | Stay; DB metadata already authoritative | Medium (backup must include this dir) |
| Company reference documents | `docs/reference/company/` (`.docx`, `.pptx`) | Repo | Repo | Internal reference | Stay | Low |
| Developer guide | `docs/development/DEVELOPER_GUIDE.pdf` | Repo | Repo | Internal | Stay | Low |
| Videos | None managed by CMS (upload cap 10 MB). `lake-3d/` is code, not video | — | — | — | Phase 13 not applicable | Low |
| Backups | `backend/backups/lakegroup-*.dump.enc` (AES-256-GCM) | Disk | Disk | DR | Offsite copy via `BACKUP_STORAGE_PREFIX` supported | Medium (single on-disk copy today) |

## 4. Key decision point — media storage architecture

The plan (Phase 7) asks for PostgreSQL as the authoritative store for managed **files**. The project's implemented architecture is deliberately different:

- **PostgreSQL holds authoritative media *metadata*** (`Media`, `MediaUsage`, `MediaFolder` — 67 items, usage tracking, archive-in-use guard).
- **Binaries live in an object-storage adapter** (`local` → `backend/uploads/`, or `s3`), referenced by `storageKey` (server-generated, unique, never client-supplied) and served through the backend (`/media/files` static + `/admin/media/uploads` with MIME sniffing, size caps, auth).
- This is the conventional enterprise pattern (DB for records, object store for blobs) and is already wired into every media-bearing entity (company logos, news heroes, leadership photos, project covers, CSR/history images) with usage rows written server-side.

**Recommendation:** keep this architecture (do not move binaries into Postgres bytea). The migration plan's Phase 7 requirement is satisfied in spirit — Postgres is the authoritative *source of truth for media records and usage* — provided backups include `backend/uploads/` (or the configured S3 bucket) alongside the database dump. This should be recorded in the production migration package (Phase 23).

## 5. Phase 1 verification — PostgreSQL on this PC

| Check | Result |
|---|---|
| Version | **PostgreSQL 18.4** (`psql (PostgreSQL) 18.4`) |
| Server | Listening on **127.0.0.1:5432** (bound to loopback — not publicly exposed ✓) |
| Tools | `psql`, `pg_dump`, `pg_restore` present at `C:/Program Files/PostgreSQL/18/bin` (backend scripts use `PGBIN` default) |
| Databases | `lakegroup` (project), `postgres` (default) |
| Roles | `postgres` (super), `lake_app` (login), `lake_user` (login) — restricted app roles already created |
| Schema | **55 public tables** in `lakegroup` (Prisma-managed, migrations in `backend/prisma/`) |
| Extensions / health | Backend `GET /health` → `{ status: ok, db: up }` |

## 6. Phase status map (all 30 phases)

| Phase | Status | Evidence / note |
|---|---|---|
| 0 — Audit | ✅ **This document** | Read-only audit above |
| 1 — Verify PostgreSQL | ✅ Done | §5 |
| 2 — Project DB + app role | ✅ Done | `lakegroup` + `lake_app`/`lake_user` |
| 3 — Schema design | ✅ Done | Prisma schema: auth, content, media, publishing, audit, analytics (55 tables) |
| 4 — Reproducible schema | ✅ Done | Prisma migrations in `backend/prisma/`; `migrate deploy` reproducible |
| 5 — Environment config | ✅ Done | `backend/.env` + `.env.example` (names only); no secrets committed |
| 6 — Backend → Postgres | ✅ Done | Prisma pool, parameterized access, `/health`, graceful startup |
| 7 — Media architecture | ✅ Done (different shape) | §4 decision point — DB metadata + object storage, not bytea |
| 8 — Backup before import | ✅ Done | `backend/scripts/backup-db.js`; encrypted dump exists |
| 9 — Import existing CMS content | ✅ Done | `backend/scripts/content-seed-data.js` upserts; counts verified (§2) |
| 10 — Migrate hardcoded frontend content | 🟡 Partial | Legacy data files remain as deliberate resilience fallbacks; primary path is `/api/*` |
| 11 — Migrate images | ✅ Done | Real images referenced via DB rows; binaries in object storage; no checksum column (optional) |
| 12 — Migrate documents | ✅ Done | Internal docs organized under `docs/` (prior structure task) |
| 13 — Migrate videos | ⚪ N/A | No managed videos; 10 MB upload cap; documented |
| 14 — Migrate users | ✅ Done | 4 users preserved, bcrypt hashes, MFA fields intact |
| 15 — Connect CMS | ✅ Done | CMS → backend → Postgres; no direct browser→DB path |
| 16 — Draft/published | ✅ Done | Governed workflow, `PublishSchedule`, `PublicationEvent`, review queue |
| 17 — Translations | 🟡 Partial | UI i18n exists (6 languages, RTL); **CMS-managed content translations table missing** |
| 18 — Connect frontend | 🟡 Partial | Public pages consume `/api/*` with static fallback; many static HTML pages remain (by design) |
| 19 — Website resilience | ✅ Done | Static-first + API fallbacks (`news-api.js` etc.), PWA `sw.js` |
| 20 — Media API | ✅ Done | Uploads, MIME sniffing, caps, usage tracking, archive guard, static serve |
| 21 — Full backup | ✅ Done | Custom-format dump + AES-256-GCM; retention; offsite hook (not configured) |
| 22 — Test restore | 🟡 Partial | Restore tooling + unit tests exist; live drill documented as manual (`backup → encrypted restore → row counts`) — should be run and logged |
| 23 — Migration package | 🔴 Remaining | No production handoff package yet (needs docs, env template, restore/backup runbooks, media-dir note) |
| 24 — Production server | ⚪ N/A | No production PC exists |
| 25 — Production DB security | 🟢 Local only | Loopback-bound; production hardening applies at Phase 24 |
| 26 — Data integrity verification | 🟡 Partial | Counts verified here; media checksums not stored (optional) |
| 27 — Website equivalence test | 🔴 Remaining | Formal old-vs-new comparison not run |
| 28 — Remove obsolete sources | 🟡 Partial | Legacy data files intentionally retained as fallbacks — removal only after equivalence test |
| 29 — Final dry run | 🔴 Remaining | Full restore-to-clean-instance rehearsal on the roadmap |
| 30 — Production cutover | ⚪ N/A | No production target yet |

Legend: ✅ implemented in the existing architecture · 🟡 partial · 🔴 remaining · ⚪ not applicable yet.

## 7. What is genuinely left to do

1. **Phase 22 — prove the restore**: run the live drill (pg_dump → restore into a scratch database → verify row counts + a few spot rows) and log the evidence. Tooling exists; it just hasn't been executed and recorded.
2. **Phase 23 — production migration package**: write the handoff runbook (install Postgres, create db/roles, restore dump, `.env.example` template, `PGBIN`, media-dir/S3 note, backup procedure, restore procedure) under `docs/database/`.
3. **Phase 27 — equivalence test**: scripted comparison of public pages against API data before any obsolete source is removed.
4. **Phase 17 — CMS-managed content translations** (larger, separate workstream).
5. **Phase 26 — optional media checksums** and **offsite backup copy** (`BACKUP_STORAGE_PREFIX` / `BACKUP_ENCRYPTION_KEY` in the production env).

## 8. Non-negotiable rules status

| Rule | Status |
|---|---|
| No data destroyed / no placeholders | ✅ — import-first, verified counts |
| No browser → Postgres | ✅ — backend-only DB access |
| No credentials in frontend code / committed | ✅ — `backend/.env` gitignored; `.env.example` names only |
| Backup proven by restore | 🟡 — tooling exists; live restore drill pending (Phase 22) |
| Migration separate from repo restructuring | ✅ — kept as separate tasks |
