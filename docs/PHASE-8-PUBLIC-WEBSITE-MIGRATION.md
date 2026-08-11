# Phase 8 — Public Website Migration

> Source of truth for scope: *Lake Group Digital Platform — Master Delivery Plan v1.1*,
> Section 9 ("PHASE 8 — PUBLIC WEBSITE MIGRATION") and Section 12 ("Hardcoded Data
> Migration Strategy"). Phase 0 audit: `docs/PHASE-0-AUDIT.md` (the migration inventory).
> Backend phases 1–7 are complete (`backend/README.md`, `backend/docs/governed-entity-pattern.md`).

---

## Objective

Move hardcoded domains **one by one** into backend-controlled data. The frontend
becomes a *renderer* of published payloads served by `GET /api/public/*`, while
**preserving visual behavior first** — migrate data before attempting any major
redesign. When the backend is unreachable, the page must degrade exactly to the
static markup it shows today (graceful fallback, never a blank/broken stat).

The governing principle from the blueprint: *one authoritative corporate fact
stored once, governed once, safely consumed by website, chatbot, search, analytics,
maps, and other approved consumers.* The frontend must not remain the authoritative
owner of corporate data.

## Prerequisites

- [x] Phase 0 audit complete — `docs/PHASE-0-AUDIT.md` (hardcoded-data inventory).
- [x] Backend Phases 1–7 complete and green — `npm test` in `backend/` (64 passed).
- [x] Public API serving PUBLISHED-only rows: `/api/public/metrics/:key`,
      `/api/public/:entity`, `/api/public/map` (CORS `*`).
- [x] **A running backend** for end-to-end verification — PostgreSQL 18 on this
      machine (`backend/.env` updated with live credentials), migrations applied
      (0001–0008), `seed:metrics` + `seed:content` loaded. Live verification:
      `scripts/_verify_live_backend.js` drives the real stack (no stubs).

## Scope

Domain-by-domain migration in the blueprint's order (Section 12):

1. **Metrics (Corporate Truth)** — group stats (employees, trucks, stations,
   countries, nationalities, subsidiaries) hydrate from `/api/public/metrics/:key`
   with static fallback. *Task 8.1 — this is the slice executed in this session.*
2. **Companies / registry** — company tiles, the Our-Companies directory
   (`services.html`) and mega-menu names/logos from `/api/public/companies`.
3. **Locations** — country/region/location content and the station-locator dataset.
4. **Projects** — project showcase cards from `/api/public/projects`.
5. **News** — replace the dormant Payload-shaped `news-api.js` with the Express
   backend's `/api/public/news` (or a compatible adapter); keep the bundled
   `window.LAKE_NEWS` fallback.
6. **Leadership** — leadership cards + profiles from `/api/public/leadership`.
7. **Contacts** — division/company contact blocks from `/api/public/contacts`
   (respecting `publicDisplay`).
8. **History** — timeline entries from `/api/public/history-events`.
9. **Gallery / Media** — gallery tiles from `/api/public/media`.
10. **Map** — `africa-network-map.js` renders `/api/public/map` instead of
    hardcoded markers (the governed-entity doc already names this "Phase 8").
11. Remaining content (pages/blocks, CSR, careers) via `/api/public/pages`,
    `/api/public/csr-entries`, `/api/public/career-listings`.

## Explicitly Out of Scope

- **Visual redesign.** Migrated sections keep today's exact look and layout.
- **Client confirmation items** from `_verified_lake_facts.md` / `DATA_GAPS.md`
  (fleet-count conflicts, the "20+ subsidiaries" claim, per-country entity lists).
  Seed values that are contested are tagged `UNVERIFIED` with a note, never
  silently "corrected".
- Analytics / AI / chatbot sync (Phases 9–10), production hardening (Phase 11).
- The dormant `dashboard.html` / `dashboard-cms.js` console (Payload-shaped,
  points at `cms.example.com`) — replace or retire in a later task; it is not a
  public-website surface.

## Architecture Constraints

- Frontend never talks to the DB — only the public API over HTTP.
- **Fallback-first:** every fetch is best-effort with a short timeout; on any
  failure the hardcoded markup remains exactly as-is. No error UI, no console spam.
- **Attribute contract:** an element opts into hydration with `data-metric-key="<key>"`
  (metrics) or page-specific tags for entity payloads. Loader scripts are
  dependency-free, ES5-style, and work under `file://` where the API is simply absent.
- **i18n safety:** elements with `data-i18n-number`/`data-number` keep the
  `data-number` attribute in sync so a language switch re-formats the *served*
  value, not the static one.
- **Counter safety:** `data-count`/`data-suffix` animated stats (`site.js`)
  update the *attributes* and rely on `LakeSite.refreshCountersForLang()` to
  repaint; the loader never fights an in-flight count-up.
- Existing i18n/content structures are untouched except where the migration
  replaces the value source.

## Tasks

### Task 8.1 — Metrics (Corporate Truth) hydration — **EXECUTED in this session**

1. **Fix the seed to verified canonical values** (`backend/scripts/seed-metrics.js`):
   - Employees `4,600+` → **`30,000+`** — the old value came from the stale
     `assets/i18n-content.js.bak` (audit Task 0.1 marks 4,600+ as OLD; the official
     about page, `_verified_lake_facts.md`, and the QA report all use 30,000+).
   - Add the full canonical set with sources: employees `30,000+`, trucks `1,200+`,
     stations `152`, countries `10`, nationalities `21`, subsidiaries `18+`
     (UNVERIFIED — the "20+ subsidiaries" claim is not externally verifiable).
   - `consumers` list populated from the Phase 0 audit (which pages display each stat).
2. **Export `SEEDS`** from the seed script (guarded main) so tests can assert the
   canonical facts without a database.
3. **Regression test** `backend/tests/seed-data.test.js`: every seed has
   key/label/value/source/verificationStatus/consumers/status; the five verified
   values match the facts dataset exactly.
4. **Shared frontend loader** `assets/metrics-api.js`:
   - Reads `window.LAKE_METRICS_API` (default `http://127.0.0.1:4000`).
   - Scans `[data-metric-key]`, fetches each unique key once
     (`/api/public/metrics/:key`, 4 s timeout, `cache: no-store`).
   - Hydrates `data-count`/`data-suffix` counters and `data-number`/plain-text
     spans; calls `window.LakeSite?.refreshCountersForLang?.()` to repaint
     already-animated counters.
   - Never throws; offline → static markup preserved.
5. **Wire the stat surfaces** that display group stats:
   - `index.html` hero keyfacts (4 stats) — replaces the one-off inline employees
     fetch with the shared loader; countries keyfact "9" now governed by the API's
     "10".
   - `about.html` story-stats (4 stats).
   - `our-story.html` ending stats (4 stats).
   - `africa-network.html` trucks + subsidiaries stats (the two "countries" cells
     are intentionally distinct labels — 9 African vs 10 Countries & Territories —
     left static pending Task 8.3).

### Task 8.2 — Companies — **EXECUTED (2026-08-11)**
- **Seed:** 18-company registry in `backend/scripts/content-seed-data.js`
  (names/slugs/descriptions/logos mirror `services.html` + the verified
  dataset; category + HQ country refs resolve in the seed script).
- **Wire:** `services.html` `.div-index` directory (18 rows: name, description,
  logo hydrate from `/api/public/companies`, matched by slug) and
  `contact.html` division blocks (name + logo).
- Mega-menu links stay static (nav template — explicitly untouched per
  blueprint; names/links remain i18n-dictionary driven).

### Task 8.3 — Locations & station locator — **EXECUTED**
- **Seed:** 10 countries (TZ/KE/ZM/RW/BI/CD/ET/MZ/UG/AE), one region per
  country (required by the public map tree), 19 locations, 29 facilities
  (5 station-locator stations + 24 map assets) with lat/lng anchors.
- **Wire:** `station-locator.html` `#station-list` (5 rows: name + address
  hydrate; the public facilities route now resolves `locationName`).
- The africa-network **country cells** remain static labels (intentionally
  distinct "9 African vs 10 Countries & Territories") — same decision as 8.1.
- Coords are approximate anchors; Task 8.10 verifies geocoding live.

### Task 8.4 — Projects — **EXECUTED**
- **Seed:** 6 projects mirroring `projects.html` prj-cards (title, sector,
  description, badges/tags, company + location refs).
- **Wire:** `.prj-grid` cards hydrate title + description, matched by title.
  Note: the live page renders the Tanga title with a double space where an em
  dash should be — the seed mirrors the page byte-for-byte so hydration works.

### Task 8.5 — News — **EXECUTED**
- **Retarget:** `assets/news-api.js` now fetches `GET /api/public/news` (the
  dead Payload-shaped `/api/news?depth=2&where[status][equals]=published`
  endpoint is gone) and maps rows to the renderer's `LAKE_NEWS` shape
  (`date` from `publicationDate`, `description` from `body`, `bannerImage`
  from the hero media). Same `LakeNews.onReady` boot gate; 4 s fallback to the
  bundled dataset.
- **Backend:** the public router's news route now resolves `category` (name)
  + `bannerImage` (hero media URL) via `include`, and the seed ingests the
  41-article bundle directly from `assets/news-data.js` (no drift — the seed
  reads the canonical frontend bundle).
- **Probe-on-config only:** unlike metrics, news BLOCKS rendering, so it only
  probes when `LAKE_API_BASE`/`LAKE_NEWS_API_URL` is set — the live site
  renders the bundle instantly with zero delay.

### Task 8.6 — Leadership — **EXECUTED**
- **Seed:** 7 leaders mirroring `leadership.html` (name, position, bio, photo,
  order, company ref).
- **Wire:** `.ld-featured` + `.ld-card-grid` cards hydrate photo/name/position/
  bio, matched by name. Profile pages (`leadership-*.html`) stay static for now.

### Task 8.7 — Contacts — **EXECUTED**
- **Seed:** HQ + 15 verified country/division contacts from
  `docs/lake_group_verified_data.json` (VERIFIED, with published phones/emails).
- **Wire:** `contact.html` division blocks hydrate name + logo from
  `/api/public/companies`. Phone/address lines keep their inline source
  labels — migrating each `ct-line` (icon-bearing) needs an icon-safe renderer
  and is noted as a follow-up; the seed data is already in place.

### Task 8.8 — History — **EXECUTED**
- **Seed:** 10 timeline events mirroring `history.html` (2006 → today,
  multi-company join via `HistoryEventCompany`).
- **Wire:** `.timeline` items hydrate title + description, matched by title.

### Task 8.9 — Gallery / Media — **EXECUTED**
- **Seed:** 44 gallery tiles ingested from `gallery.html` (url, caption,
  category tag) + every news banner, as `Media` records.
- **Wire:** `.gallery-grid` tiles hydrate img src, caption text, tag and the
  lightbox `data-caption`, matched by url.
- **i18n fix:** the caption divs carried `data-i18n` which wipes child nodes
  on every language apply (pre-existing quirk that destroyed the idx/text
  badges) — removed so the loader's structure survives; captions are now
  API-governed (English until CMS translations exist).

### Task 8.10 — Operations map — **EXECUTED**
- `assets/africa-network-map.js` now fetches `GET /api/public/map` and flattens
  countries → regions → locations → facilities into its marker shape; the 24
  hardcoded assets became the `FALLBACK_ASSETS` constant used only when no
  backend is configured (probe-on-config — zero delay on the live site). Map
  marker layers are seeded from the map's `TYPE_META` (hq/fuel/port/container/
  industrial/logistics/depots with the same colors).

### Task 8.11 — Remaining CMS surfaces — **EXECUTED**
- CSR: 6 pillars from `csr.html` seeded; `.grid-3` pillar cards hydrate
  title + description from `/api/public/csr-entries`.
- Careers: 5 hiring areas from `careers.html` seeded; `.cr-roles` hydrate
  jobTitle + description from `/api/public/career-listings` (OPEN only).
- Pages/content-blocks: no public surface consumes them yet — left for
  Phase 9+; the seed stays ready.

## Files/Directories Allowed to Change

- `backend/scripts/seed-metrics.js`, `backend/tests/seed-data.test.js`
- `assets/metrics-api.js` (new)
- `index.html`, `about.html`, `our-story.html`, `africa-network.html`
  (stat markup + loader script tag only)
- Later tasks: `services.html`, `station-locator.html`, `projects.html`,
  `news.html`, `news-article.html`, `leadership*.html`, `contact.html`,
  `history.html`, `gallery.html`, `africa-network-map.js`, `news-api.js`
- Do **not** touch: `sw.js` precache list/`VERSION` unless a precached asset
  changes; nav/footer templates; i18n dictionaries (values stay in HTML).

## Database Changes

- None in Task 8.1 (seeds are upserts on the existing `Metric` model). Later
  tasks may add a frontend-mirror table only if the payload needs reshaping;
  prefer reusing the public API.

## API Requirements

- `GET /api/public/metrics/:key` → `{ metric: { key, label, value, unit, ... } }`
  (PUBLISHED only). One request per unique `data-metric-key` on a page.
- New entity surfaces must remain **PUBLISHED + visibility-hook gated** and CORS `*`.

## UI Requirements

- Zero visual change when the backend is offline or unconfigured.
- No new console errors; stats never render blank/NaN.
- After hydration, language switching still formats numbers correctly (i18n
  re-reads the updated `data-number`).

## Security Requirements

- No credentials in frontend code; public endpoints only.
- Seed script keeps `--force` semantics and never overwrites a live row's
  workflow history without an explicit flag (version rows + audit still written).

## Tests

- `backend/tests/seed-data.test.js` — canonical metrics (Task 8.1) + content
  seeds (8.2–8.11: counts, key uniqueness, cross-reference resolution,
  services directory mirror, facility coords, contact verification status,
  chronological history) + bundle ingestion (41 news articles, 44 gallery
  tiles, date parsing). **78 passed / 1 skipped** (`npm test` in `backend/`).
- Existing `backend/tests/metrics.test.js`, `cms.test.js`, `map-media.test.js`
  continue to guard the workflow + public router (news include/format change
  covered).
- Frontend: `scripts/_verify_phase8_metrics.js` (8 checks) and
  `scripts/_verify_phase8_entities.js` (12 checks) run the wired pages in
  headless Chrome against a stub API built from the REAL seed data — hydration
  for all 9 pages + news retarget + map retarget + API-down fallback. Both
  suites pass.

## Acceptance Criteria

- [x] All five verified group stats on index/about/our-story hydrate from the
      backend when reachable and show exactly the static value when not.
- [x] All 9 wired entity pages (services, leadership, projects, history,
      contact, gallery, csr, careers, station-locator) hydrate from the API;
      news + map retargets verified end-to-end.
- [x] `npm test` in `backend/` stays green (78 passed).
- [x] API-down fallback keeps the static markup exactly (no blank/NaN/error UI).
- [x] Seed comments + README reflect the corrected canonical figures
      (30,000+ employees, not 4,600+).

## Definition of Done

- Database model/migration (not needed for 8.1 — seeds only)
- Backend/domain logic (seed fix) ✓
- Validation (seed test) ✓
- Authorization (PUBLISHED-only read — already enforced server-side) ✓
- Admin UI (workflow already exists from Phase 3) ✓
- Public integration (loader + wired pages) ✓
- Audit behavior (seed writes version + audit rows — retained) ✓
- Versioning ✓ (MetricVersion row per seed)
- Error/loading/empty states (graceful fallback) ✓
- Tests ✓
- Security review (no secrets, public endpoints) ✓
- Documentation (this file + seed comments) ✓

## Agent Report Format

For each task report: files changed, tests run + results, fallback behavior
verified, i18n/counter interplay verified, any client-confirmation items
encountered (do not resolve silently).

## Human Review Checklist

- [ ] Confirm the corrected canonical figures (30,000+ employees etc.) with the
      client — the old 4,600+ came from a stale backup. The seeds now pin
      30,000+ / 1,200+ / 152 / 10 / 21 (VERIFIED) and 18+ subsidiaries
      (UNVERIFIED — not silently corrected).
- [ ] Confirm the subsidiaries figure ("18+" used on about/africa-network vs
      "20+" on index) — the seed carries 18+ with a verification note.
- [ ] Facility coordinates are approximate anchors from the live pages —
      verify geocoding before relying on exact marker placement (Task 8.10).
- [ ] Gallery captions are now API-governed (English) — non-English caption
      translations land with the CMS (Task 8.9 note).
- [ ] Contact division phone/address lines keep inline source labels — full
      per-line migration needs an icon-safe renderer (Task 8.7 follow-up).
- [ ] Approve replacing `dashboard.html`/`dashboard-cms.js` (Payload-shaped,
      dead) in a later task.
- [ ] **Whole `backend/` tree is untracked in git** — Phases 1–7 were never
      committed; worth committing the backend + this migration as one unit.

## Next Phase Gate

Phase 8's technical gate is met: PostgreSQL 18 + backend are running locally and
`scripts/_verify_live_backend.js` passes the full live chain (metrics, entities,
news, map) against the real API — see `docs/PHASE-9-AI-KNOWLEDGE.md` §9.5 for the
combined live verification. Remaining gate: client confirmation of the contested
figures above. Phase 9 (AI / knowledge) is complete and also verified live.

---

*End of Phase 8 task file. Tasks 8.1–8.11 executed 2026-08-11; see the human
review checklist for the items that still need client confirmation.*
