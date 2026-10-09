# LAKE GROUP WEBSITE PROJECT — INTERNSHIP EVIDENCE DOSSIER

**Compiled:** 2026-09-25 (from repository state at commit `ba4f197`, branch `main`)
**Method:** Full-repository forensic review — Git history (591 commits, 2026-07-05 → 2026-09-25), source inspection (frontend, backend, CMS, globe-lab, scripts, tests), configuration (`vercel.json`, `web.config`, CI workflows), and documentation cross-checks.
**Purpose:** Factual technical evidence pack for a separate university field/internship report. This file deliberately avoids polished report prose.
**Rule honoured:** Nothing below is claimed as implemented unless source code, git history, documentation, configuration, tests, or assets prove it. Where the repository cannot prove something, it is marked **NEEDS USER CONFIRMATION**.

---

## 1. Executive Project Overview

Verified in one paragraph:

- The repository contains the **Lake Group corporate public website** — a static multi-page site (42 root `.html` files, 31 sitemap URLs, canonical domain `https://www.lakeoilgroup.com`) served by **Vercel** in staging, and configured for **Lake Group-owned IIS** in the intended production architecture.
- It contains a **self-built backend** (`backend/`: Express 5, PostgreSQL, Prisma 7, 79 source files, 61 test files, 15 migrations) and a **self-built CMS** (`cms/`: React 18 + TypeScript + Vite, ~27 feature areas) with a documented 20-phase implementation tracker marked COMPLETE in-repository but **not deployed to production** (`docs/CMS-PROGRESS.md`).
- It contains a **cinematic 3D network globe** (`globe-lab/entry.tsx`, React Three Fiber + Three.js) showing Lake Group's 10-country footprint from a Tanzania origin, with an extensive QA evidence folder (`docs/qa/globe-orbit-docks/`, 12 viewport captures + `verification.json`).
- It contains **two secured public forms** (Contact, Careers/CV upload) with signed tokens, rate limiting, idempotency, MIME/signature validation, DOCX structural inspection, and ClamAV malware scanning — all fail-closed, with automated suites of 61 and 53 cases respectively.
- Development window visible in git: **2026-07-05 (initial commit) → 2026-09-25 (HEAD)**, ~591 commits, checkpoint-numbered up to Checkpoint 062 plus later conventional commits. The actual internship duration is **NEEDS USER CONFIRMATION** (repository dates bound the work but do not prove employment dates).

Scale markers: `scripts/` = 301 files; `tests/` (static site) ≈ 85 test files; `docs/qa/` = 159 items; `docs/reports/` = 82 reports; `docs/security/` = 33 files; 94 git tags used as restore points; `assets/images/` = 243 MB of processed media.

---

## 2. Project Objectives

Objectives reconstructed from commits and docs (not invented):

1. Replace Lake Group's legacy website (archived in `old lake group website/`, mirrored from `https://www.lakeoilgroup.com/` on 2026-09-17 — legacy subdirectory apps `/lakegroup/`, `/lakeoil/`, `/laketrans/`, `/aficd/`, `/acfs/`, `/lakelubes/`, `/lakegas/`, `/gccp/`, `/saff/`, `/lakesteel/`, `/gulfagr/`) with a unified, modern corporate site. Evidence: `old lake group website/archive-state.json`, `docs/reports/DOMAIN_REFERENCE_AUDIT.md`.
2. Fact-audit all public content against verified company sources (`scripts/_verified_lake_facts.md` referenced by `docs/qa/QA_REPORT.md`; `docs/lake_group_verified_data.json`; approved-company-document rebuild commits, e.g. `aeb23b2` "content(lake-gas): fully rebuild page from approved company source").
3. Build governed content infrastructure (backend + CMS) so non-technical staff can update news, leadership, companies, countries without touching code (`README.md` "For the content team" section).
4. Keep the public site static and resilient — it must render even when CMS/backend/database are down (`docs/PUBLIC-DELIVERY-ARCHITECTURE.md`, `docs/MIGRATION-STATUS.md`).
5. Secure public forms end-to-end (Contact messages, Careers CV upload) and prepare Lake Group-server deployment (`docs/deployment/LAKE_GROUP_SERVER_FORMS_DEPLOYMENT.md`, `web.config`).
6. SEO/AEO readiness for the official domain (`scripts/build-seo-foundation.mjs`, `docs/reports/SEO_ROUTE_INVENTORY.md`, `docs/development/SEO_I18N_FOUNDATION.md`).

---

## 3. Original State

What can be proven about the starting point:

- **The legacy public website** (pre-project) was a set of separate subdirectory applications under `lakeoilgroup.com` (see `archive-state.json` above), archived for reference on **2026-09-17** into `old lake group website/01-RAW-MIRROR` and `02-OFFLINE-VIEWABLE`. Server-side forms, maps, analytics were noted as unavailable offline in its README — i.e., the original had server dependencies.
- **The repository's own initial state** (`e7f1624`, 2026-07-05, "Initial commit: Lake Group corporate site", co-authored-by Cursor) was *already* a redesigned site: "Fact-audited trilingual (EN/FR/SW) static site with interactive 3D global operations hero, PWA (offline-first service worker), SEO layer, and shared design/motion system." So the redesign began at/before the first commit; the true "before" state exists only in the legacy archive. A prior scroll-driven **fueling simulation** 3D hero (`assets/hero-3d.js`) existed and was **permanently removed per client directive**, replaced by a Global Operations globe (QA report addendum, 2026-07-04).
- The pre-commit QA report (`docs/qa/QA_REPORT.md`, dated 2026-07-04) documents the initial site: 29 HTML pages, trilingual i18n (1,356 keys × 3), PWA v4, one critical offline-loop bug and five mobile-overflow pages found and fixed.
- Original limitations recorded: unverifiable leadership names beyond the founder, conflicting fleet figures (600/1,200+/750/850+), missing videos and company contacts (`docs/reports/DATA_GAPS.md`), no CMS (content hardcoded in HTML), no backend, `data-mock` mock forms (later removed), Firebase hosting scripts in `package.json` (`serve`/`deploy` — `firebase-tools` remains a devDependency) later superseded by Vercel.

What the original site's design looked like in detail: **NEEDS USER CONFIRMATION** beyond the offline mirror (the mirror is viewable via a local static server; no screenshots of it are committed).

---

## 4. Chronological Development Timeline

Grouped from git history (all dates = committer date, UTC+3 local in author stamps). Full log: `git log --reverse --format="%h|%ad|%s" --date=short`.

| Stage | Dates | Commits (examples) | Objective and outcome |
|---|---|---|---|
| 1. Initial build + QA | 2026-07-05 → 07-08 | `e7f1624`, `4102b9f`, `bb07525`, `2f445c5`, `56f642a`, `e8ac3bb`, `9d6f0d1`, `55e2024`, `f0b8760`, merges `4a5de14`…`2cc4569` | Trilingual static site with 3D operations hero, PWA, offline knowledge assistant (FlexSearch + IndexedDB), "flagship" design system foundation; PR-branch merges; developer-guide PDF and stakeholder PPTX. |
| 2. Checkpoint era (001–045) | 2026-07-19 → 08-11 | `1c5516c`…`60c9cef` (~70 commits) | Unified design tokens/blue nav/mega-menu (001–006), chatbot UI (007), LogoLoop + Agro/ATL pages + i18n (008–011), NASA textures (012), **react-globe.gl replaces Three.js hero** (013), perf/SEO/PWA polish + first Vercel config (016–017), company photo refreshes (016–026), coverflow gallery (027–028), Lake Agro theme (029–030), Operations Map rename + i18n sync (031–033), Jost font + type scale (034–036), logo refresh + megamenu polish (037), Shell-style gallery + news hub redesign, missing pages/logos (041), mobile-friendly pass (042), drag-scrub coverflow (043), hero redesigns (044). |
| 3. Backend + security foundation | 2026-08-11 → 08-14 | `2412fc6` (046 backend integration), `934acc5` (047 backend docs), `ba9fad9` (048 skeleton loader + backend hardening), `27712a2` (SECURITY_ROADMAP phases 19–25), `ee0f100` (051 CMS Settings Center, globe redesign), `546cbe8` (repository structure audit) | Express+Prisma backend appears in-tree; first Vercel rewrite to a Render backend URL (`vercel.json`); security roadmap documents in `docs/security/phase-01..23-report.md`; automotive pages (`assembly-tech`, `agrinova-tech`, `nextdrive-motors`) added 2026-08-14. |
| 4. Content normalization + Render DB incident | 2026-08-14 → 08-31 | `ee0f100`, `1bcd3e3`, `aa3a093`, `2229a11`, `66f49ce`, tags `backup-before-mobile-globe-fix-2026-08-31`, `backup-before-globe-label-sequence-fix-2026-09-01` | Tiger Tech subsidiary, year-grouped news feed, Lake Agro Zambia gallery; **Render PostgreSQL database was deleted by the provider-side event; recovery audited read-only** (`docs/reports/RENDER_DB_RECOVERY_AUDIT.md`, 2026-08-18: local PostgreSQL 18 `lakegroup` had the complete 57-table copy; 3 plaintext dumps + 1 encrypted dump existed; one encrypted dump is permanently undecryptable because `BACKUP_ENCRYPTION_KEY` was absent). |
| 5. Phase-normalization correction pass | ~08-27 → 09-02 | `1d9c859`…`d02d85c`, `82a1b9b`, `2d531c4` | Phase 01–08 verification passes: navbar, footer, homepage, public pages, imagery recovery, image-quality audit, lazy-loading; "aggressive full-site audit" fixed; stale-first render fixed. |
| 6. Globe lab era | 2026-09-09 → 09-11 | `77fbdc1`, `78f203c`, `5458d76`, `95f4cca`, `175ab6c`, `ec6679a`, `a7e511a`, `da58c91` | Aceternity-sourced globe rebuild (with restore tag `pre-aceternity-globe-rebuild-20260909`), a rejected lab attempt (tag `globe-lab-rejected-20260909-171740`), then the **cinematic globe-lab** (`globe-lab/entry.tsx`, `scripts/build-globe-lab.mjs`) approved and promoted to the homepage with a 9-viewport verification script (`docs/reports/HOME_GLOBE_PROMOTION_20260909.md`). |
| 7. Careers + CSR + History experiences | 2026-09-09 → 09-12 | `ea1c401` (secure careers submission), `15197af`…`87ed5b1`, `5268e66`, `4cdc355`, `d705d80` | Careers page rebuilt with secure application pipeline; LinkedIn talent section; CSR/sustainability rebuilt from approved content; history timeline with scroll-driven milestones and Aceternity 3D cards. |
| 8. CMS V2 | 2026-09-16 → 09-19 | `3304938`→`f644210` (v1 v2 foundation…), `aa5a771`→`a92e611` (independent control-center, authenticated preview, release isolation, enforced review, public release pilot, **structured visual composition engine**, global nav/media workflows) | `/control` visual editor over real public pages; immutable revisions/releases in Postgres + `public-content/cms-v2/`; `CmsAccessLevel=IT_ADMIN` gate. Architecture: `docs/CMS_V2_ARCHITECTURE.md`. |
| 9. Launch readiness + IIS hardening | 2026-09-19 → 09-20 | `1f90196`, `9ab6a21`, `110e498` (**block private repository paths in IIS**), `c4c2713`, `2f4baa9`, `f6d4c0a` | Static launch finalization; web.config private-path deny rule; mobile launch recovery; full-bleed hero restoration. |
| 10. Forms security + globe orbit docks (current) | 2026-09-22 → 09-25 | `35773bd`, `8e5a284`, `b8f221d` (**secure contact and careers delivery**), `79aff63` (fail closed), `7f9f333` (CMS static-safe control center), `b367fd7`, `d2238ec`, `5d5396d`, `1977062`, `ba4f197` (**orbit dock nation callouts**) | Globe leader lines redesigned from diagonal leaders → radial perimeter callouts → **authored orbit docks** with 12-viewport geometry verification (`docs/qa/globe-orbit-docks/REVIEW.md`); forms documented fail-closed with Lake Group server deployment guide. HEAD = `ba4f197`. |

Restore-point discipline: 94 tags including `pre-careers-security-20260909`, `pre-cms-v2-rebuild-20260918-2055`, `pre-final-launch-recovery-20260920-1717`, `pre-frontend-client-handover-20260925-1507`, `restore/pre-nation-label-surgical-20260925`.

Failed experiments preserved in history (useful for the report's "problem solving" narrative): globe revert `02d1583` ("revert(globe): restore safe globe implementation"), rejected globe-lab tag, chatbot disabled `124a659` ("temporarily disable unfinished chatbot"), news/investors/operations-map pages removed `bb7d2c8`, Lake Plastics→Lake Pipes rename `af83d68`/`3258eac`, mojibake content regression fixed in `3870b6f`/`5aca0a3`, accidental merge-backup HTML files removed twice (`d5f6f47`, `9ec2084`).

---

## 5. Complete Architecture

```text
Visitor ──► Static HTML/CSS/JS at repo root (Vercel CDN staging; IIS production-intended)
             │  ├── sw.js service worker (v87-20260828-01), manifest.webmanifest (PWA)
             │  ├── public-content/current.json + cms-v2/current.json (versioned CMS snapshots)
             │  └── /api/contact/* , /api/careers/*  (same-origin narrow APIs only)
             │         staging: vercel.json rewrites → lake-group-web-backend.onrender.com
             │         production: web.config ARR/URL Rewrite → http://127.0.0.1:4000 (private Node service)
             ▼
Backend (Express 5 + Prisma 7 + PostgreSQL) ──► Resend mailer (forms) ──► recipient inbox
             │            ├── clamd (ClamAV INSTREAM) for CV scans
             │            ├── rate_limit table (shared limiter), session table, audit log
             │            └── object storage (S3-compatible) for governed media
CMS (React/Vite, separate deployment) ── authenticated CORS ──► backend /admin/* API
             └── publication: immutable release → PublicationEvent → GitHub workflow
                 (public-release.yml) → cms-v2 snapshot check → Vercel deploy
```

Key architectural decisions with evidence:

- **Static public site, decoupled from CMS** — `docs/PUBLIC-DELIVERY-ARCHITECTURE.md`: "The visitor path does not require a live CMS, API, or database" (`docs/SECURITY-ARCHITECTURE.md` availability model).
- **Narrow same-origin APIs**: only four routes are proxied (`vercel.json` rewrites; `web.config` proxy rules) — the entire website is never connected to the backend.
- **Governed content model**: DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED with immutable versions and audit rows (`backend/prisma/schema.prisma` header; `docs/CMS-PROGRESS.md`).
- **Least-privilege DB split**: `DATABASE_URL` (owner, migrations) vs `DATABASE_URL_RUNTIME` (`backend/src/index.js` Phase 6 comment; `backend/scripts/db-roles.sql` user `lake_app`).
- **Fail-closed production gate**: `productionConfigProblems()` aborts boot on insecure production config (`backend/src/index.js`).

---

## 6. Technology Stack

Only dependencies verified as used are listed. For each: what/where/why/problem/skill.

### Frontend (public site)
| Technology | Where used | Why / problem solved | Skill learned |
|---|---|---|---|
| HTML5 (42 root pages) | `*.html` | Static, crawlable, zero-runtime-framework delivery | Semantic markup, head-tag management |
| CSS with design tokens | `assets/tokens.css`, `theme.css`, `flagship.css`, `mobile.css`, per-page CSS | Consistent brand (blue `#0181BB`/`#1D3EA8`, yellow `#FFF200`/`#FFD700`), Jost type system (`c34` Checkpoint 034) | Design systems, CSS variables |
| JavaScript (vanilla ES modules) | `assets/site.js`, `home-hero.js`, `i18n.js`, `history-timeline.js`, `contact-form.js`, `careers-application.js`, `skeleton.js`, `motion.js`, `pwa.js` | Interactivity without framework overhead | DOM APIs, IntersectionObserver, fetch, crypto.randomUUID |
| Anime.js v4 | `assets/` gallery (commit `efb4207` "anime.js motion") | Shell-style gallery motion | Animation library use |
| GSAP + ScrollTrigger | loaded on pages (perf audit: GSAP 73 KB + ScrollTrigger 45 KB, `docs/reports/PERFORMANCE_ROOT_CAUSE_AUDIT.md`) | Scroll-driven history timeline, SplitText heroes | Scroll animation, bundle budgeting |
| Lottie / Lordicon | `@lordicon/element`, `@lottiefiles/dotlottie-web` deps; navbar sector icon animations (`f3c6343`, `9df7829`) | Animated sector icons | Vector animation integration |
| react-globe.gl (historical) | Checkpoint 013 `d46bab5` | Replaced custom Three.js hero | — (historical, superseded) |
| React 18 + React Three Fiber + drei + Three.js | `globe-lab/entry.tsx` → `assets/globe-lab.bundle.js` (esbuild IIFE bundle) | Cinematic WebGL globe | 3D graphics, React islands, bundling |
| PWA | `sw.js` (precache + network-first navigations, VERSION bump discipline), `manifest.webmanifest` | Offline fallback, cache busting across 87+ versions | Service workers, cache lifecycle |

### Backend
| Technology | Where used | Why | Skill |
|---|---|---|---|
| Node.js ≥22.6 (Docker image node:24) | `backend/package.json`, `Dockerfile` | Runtime | Server JS, ESM |
| Express 5 | `backend/src/app.js`, routes | Routing/middleware | REST API design |
| Zod 4 | `backend/src/validators/*`, `routes/contact.js`, `routes/careers.js` (`.strict()` schemas) | Input validation, type confusion / injection defence | Schema validation |
| Multer 2 (memoryStorage, limits) | `routes/careers.js` | CV upload with hard size/field caps | Multipart handling |
| Prisma 7 + PostgreSQL | `prisma/schema.prisma` (53 models, 10 enums per recovery audit), 15 migrations `0001_init`→`0015_cms_v2_foundation` | Governed content, versions, audit | Relational modelling, migrations |
| express-session + connect-pg-simple | `db.js`, `lib/sessions.js` | Server-side sessions in Postgres | Session security |
| bcrypt (cost 12) | `lib/passwords.js` | Password hashing | Credential storage |
| otplib + qrcode + AES-256-GCM secret-box | `lib/mfa.js`, `lib/secret-box.js` | TOTP MFA with encrypted seeds | MFA, symmetric crypto |
| express-rate-limit + custom PG store | `lib/pg-rate-limit-store.js` | Persistent, multi-instance rate limits | Abuse control |
| pino / pino-http | `logger.js` | Structured logging with request IDs | Observability |
| Resend (via `lib/form-mailer.js` adapter) | contact/careers delivery | Transactional email | Mail integration, SPF/DKIM concepts |
| ClamAV clamd (custom INSTREAM client) | `lib/clamd-scanner.js` | Malware scanning of CVs, fail-closed | AV integration, sockets |
| yauzl / yazl | `lib/cv-inspection.js` | Bounded DOCX zip inspection (macros/embeddings/zip-bomb rejection) | Archive safety |
| sharp | image/media pipelines | Image processing | Media pipelines |
| @aws-sdk/client-s3 | `lib/object-storage.js` | S3-compatible governed media storage | Object storage |
| Vitest + supertest | `backend/tests/` (61 files; docs record 279 tests + 163 security tests) | Automated API/security testing | Test automation |
| ESLint + eslint-plugin-security | `eslint.config.js` | Static security linting | Secure coding practice |
| Docker (multi-stage, non-root, healthcheck) | `backend/Dockerfile` | Portable backend deploys (Render staging; commit `3bc8d6d` fixed generated-client copy) | Containerization |

### CMS
React 18, TypeScript, Vite, Tailwind CSS 4, React Router 7, TanStack Query 5, react-hook-form 7 + @hookform/resolvers + Zod, react-dropzone, motion, Tabler/Iconify icons, axe-core (a11y in tests), Vitest + Testing Library, jsdom (`cms/package.json`). ~27 feature folders under `cms/src/features/` (admin, auth, careers, categories, cms-v2, collections, companies, contacts, content-blocks, control-center, csr, dashboard, geography, leadership, media, metrics, news, pages, preview, products, projects, publishing, review, scheduled, search, settings). Skills: SPA architecture, typed API clients, component testing, visual QA.

### Tooling / CI
Git + GitHub (2 contributors; PR merges early, checkpoint + conventional commits later), npm, esbuild (`scripts/build-globe-lab.mjs`, hero globe), Playwright (browser QA, devDependency), sharp-based media pipelines (`scripts/bulk-media-pipeline.mjs`, `3286714`, `f7b7123`, `7a5534f`), 7 GitHub workflows (`.github/workflows/`: accessibility, backend, cms, lighthouse, public-release, public-website, security), Lighthouse CI (`lighthouserc.json`), secret scanner (`scripts/check-secrets.mjs`, 702 files clean per `docs/CMS-PROGRESS.md`), Python used for some one-off generators (`docs/_gen_developer_guide.py`, `scripts/build_master_en.py`).

Deliberately **not** claimed: Firebase Hosting (only emulator/deploy scripts remain from an early phase; Vercel is the actual host), Next.js in the main site (`lake-3d/` is an orphaned Next.js experiment kept under version control; the Aceternity globe sources were *adapted* away from Next/Tailwind per `HOMEPAGE_GLOBE_REBUILD_AUDIT.md`), Payload CMS (README's "Self-hosted Payload CMS" description is **stale documentation contradicted by code** — the backend is a custom Express+Prisma implementation; see Discrepancies §32 note).

---

## 7. Public Website Pages

42 root HTML files exist; **31 URLs are in `sitemap.xml`** (canonical domain `www.lakeoilgroup.com`); 11 routes are excluded/noindex per `docs/reports/SEO_ROUTE_INVENTORY.md` (404, offline, dashboard, acfs, atl, la-home, la-projects, ocean-galleria, news-article, financial dashboard, org chart — redirect sources and utility views). Note: sitemap evolved; some sitemap-era pages (`news.html`, `projects.html`, `investors.html`, `africa-network.html`) were later removed from the site (`bb7d2c8`, `37b67ec`).

| Page | Purpose | Main sections / features | Technical work | File |
|---|---|---|---|---|
| Home | Corporate landing | Hero slideshow with stat count-up, six business verticals, logo marquee, globe section "One Network. Ten Countries.", partnership CTA, coverflow "in action" gallery | Responsive hero media, lazy globe island, counters IntersectionObserver, marquee | `index.html` |
| About | Group overview | Hero carousel (7 approved slides), AFICD timeline milestones | Carousel indicators, approved imagery | `about.html` |
| History | Since 2006 | Cinematic scroll-driven timeline, milestone cards/branches | GSAP scroll sync, 3D cards, `history-timeline.js` | `history.html` |
| Our Story | Narrative | Scenes | Media audit evidence (`our-story-media.test.js`) | `our-story.html` |
| Leadership | Executives | 8 profiles (approved), chairman | Source-locked titles (chairman-title test) | `leadership.html` |
| Leadership profile | Chairman | Profile of Founder & Chairman | Canonical public profile page | `leadership-ally-edha-awadh.html` |
| Lake Oil | Fuel retail/depots | Ops network panel, gallery, video embed, country operations | Source-lock correction pass, restored YouTube embed | `lake-oil.html` |
| Lake Gas | LPG | Cylinders, Tanga terminal | Page CSS restore `a95a950` | `lake-gas.html` |
| Lake Lubes | Lubricants | Product catalog, campaign posters | Product imagery, removed gallery per approved scope | `lake-lubes.html` |
| Lake Steel | Steel | History stats, production | Stats alignment test | `lake-steel.html` |
| Lake Premix Cement | GCCP concrete | Batching | Centered sections `e1b7a55` | `lake-premix-cement.html` |
| Lake Buildings | Real estate construction | Product tile grid | `1411f58` | `lake-buildings.html` |
| Lake Cylinders | Cylinders | Gallery | Gallery fix `9bb4efd` | `lake-cylinders.html` |
| Lake Pipes | Pipes/plastics (renamed from Lake Plastics) | Products, history with old+new logos | Rename migration with redirects | `lake-pipes.html` |
| Lake Trans | Transport | Fleet page, corridors | Fleet design, `fleet.html` subpage | `lake-trans.html` |
| AFICD | Free-zone depot/logistics | Corporate profile from approved doc | Rebuilt `738fc33`, `b3194d2` | `aficd.html` |
| AILL | Inland logistics | Strategic land footprint | Layout simplification | `aill.html` |
| Lake Agro | Agro processing | Green theme, Zambia/Tanzania projects gallery, 2008/2017/2021 milestones | Branded footer, approved hero images | `lake-agro.html` |
| Lake Aviation | Aviation fueling | JIG member 2026 credential, neutralized liveries | Imagery remediation | `lake-aviation.html` |
| Cross Country | Real estate/property | Approved hero imagery | Logo canonicalization | `cross-country.html` |
| Gulf Aggregates | Quarry aggregates | Claims removed per approval (`6ee120c`) | Content governance | `gulf-aggregates.html` |
| Agrinova Tech | Agri-tech (automotive-sector-listed) | Green theme, contrast fixes | Page build `75b0078` | `agrinova-tech.html` |
| Assembly Tech (ATL) | Vehicle/trailer assembly | Blue+red brand treatment, product portfolio | Complete redesign `64ac9f5` | `assembly-tech.html` / `atl.html` (redirect) |
| NexDrive Motors | Automotive | Portfolio imagery, brand logos | Page build `50263f7` | `nextdrive-motors.html` |
| Tiger Tech | Subsidiary | — | Added `0357843` | (in Logistics nav) |
| Careers | Recruitment | Job cards, benefits, CV upload island, LinkedIn talent section | React upload island, secure submission | `careers.html` |
| Contact | Enquiries | Sector contact channels (energies/agro/logistics/automotive/real estate), social | Secure form, counters, approved contacts only | `contact.html` |
| Gallery | Media gallery | Uniform card grid, lightbox | Lightbox reliability fixes | `gallery.html` |
| Media Center | Press/brand assets | — | — | `media-center.html` |
| CSR / Sustainability | CSR and sustainability | Approved content rebuild | Two-step redesign `dc565de`, `5268e66`, `4cdc355` | `csr.html`, `sustainability.html` |
| Station Locator | Lake Oil stations | Map locator | Excluded from index | `station-locator.html` |
| Org chart / Financial dashboard | Internal tools | Interactive org chart of companies owned by Mr. Ally Edha Awadh | noindex utility pages | `lake-group-org-chart.html`, `lake-group-financial-dashboard.html` |
| Dashboard | CMS-adjacent tool | Content management view | noindex; own `assets/dashboard-cms.js` | `dashboard.html` |
| 404 / Offline | Error/PWA fallbacks | Flagship styling | SW fallback chain | `404.html`, `offline.html` |

Total: **42 files / 31 sitemap URLs** (count from files + sitemap, not invented).

---

## 8. UI/UX Development

Evidence-backed design work (each item → commit/test/artifact):

- **Design-token unification** and blue nav with company mega-menu — Checkpoint 001 `1c5516c`; later "flagship" CSS `assets/flagship.css` and FLAGSHIP_DESIGN doc (`docs/design/FLAGSHIP_DESIGN.md`).
- **Hero systems**: photo heroes; SplitText heroes (Checkpoint 010); full-bleed responsive hero media preserved across releases (`9ab6a21`, `2f4baa9`); hero contrast gradients (`7ca0782`, `8c08ce9`, `399a400`); autoplay kept alive across visibility changes (`a17eca3`); stat count-up with IntersectionObserver (`087b402`, `91c99ff`, `7987bb4`).
- **Navigation**: global chrome unification, dropdown/mega-menu hover stacking (`8be08bd`), exclusive hover state (`e064f98`), dropdown glass surfaces (`64da28c`, `deab9e6`), mobile accordions (`f163d42`), narrow-desktop mobile menu (`4754fa4`), sector icon Lottie animations and preload (`5140496`, `a55184b`), language selector restricted to English for launch (`d071380`).
- **Galleries**: coverflow gallery (Checkpoint 027–028, drag-scrub `7a8ad28`), Shell-style card grid with anime.js (`efb4207`), lightbox close-control restoration (`fb1500f`, `be7ac4e`), badge/tag removals per approval.
- **Logo marquee (LogoLoop)**: months of logo normalization — Cross Country, Lake Pipes (transparent/weight/scale), ATL, NexDrive additions with cache busts (`41109e1`).
- **Footer**: unified shared footer (`2210a9a`), footer-consistency test, logo links home (`0a31b22`), LinkedIn added (`b4aa9a4`).
- **Back-to-top control**: animated global control `4301f79`, brand-color variants `184c9f1`.
- **Under-construction experience**: shared redesign `090b676` with brand-aligned illustration (`24f2b92`, `2aece23`).
- **Mobile fixes (documented examples)**: horizontal overflow guard for five pages at 390 px (QA issue #2), mobile scroll lag/unlock (`2229a11`, `a253043`... exact `a25304a`), mobile navbar layout on interiors (`f8a4bb8`), single-column divisions grid on phones `d519a88`, mobile hero cropping/parity commits (`805a4fd` desktop/mobile content parity, `dd998c5`, `f10354b`), Samsung/mobile compatibility **NEEDS USER CONFIRMATION** (no Samsung-specific evidence in repo; generic 360–430 px testing exists in globe QA).
- **Accessibility**: static a11y checks 0 findings in initial QA (alt text, single H1, labelled controls), focus states, `prefers-reduced-motion` gate; CMS axe-core in tests; accessibility CI workflow. (Formal WCAG audit of final site: not evidenced.)
- **Typography/brand**: Jost switch (Checkpoint 034) and type-scale retune (`ac6105d`), official Lake color audit (`4177025`, `d1ddc8c`), Lake Agro green (`46b8e2a`, `dbb24b6`), ATL blue/red (`1759e49`).

---

## 9. Interactive Globe

Full history (all proven):

- **Why Africa/Tanzania emphasis**: Lake Group's HQ is Dar es Salaam, Tanzania (Tanzania is `PLACES[0]`, the route origin at lat -6.7924/lng 39.2083; camera settles on Africa at lat −4, lng 33). The section copy is "One Network. Ten Countries."
- **Countries (10, exact approved set)**: Tanzania (origin), Kenya, Uganda, Rwanda, Burundi, DR Congo, Zambia, Mozambique, Ethiopia, UAE — coordinates in `globe-lab/entry.tsx` `PLACES`; flags in `assets/images/flags/{tz,ke,ug,rw,bi,cd,zm,mz,et,ae}.svg`; textures `assets/images/globe/earth_day.webp` + `earth_topology.webp` (NASA-sourced textures restored at Checkpoint 012; `SOURCES.md` in the globe images folder).
- **Route system**: great-circle interpolation (`geoVector` + slerp-style `routePoints`), 96 samples, per-destination altitude lift, thin `#FFF200` (yellow) WebGL lines at 0.68 opacity, progressive dash draw; Tanzania→destination arcs.
- **Markers/labels/flags/leader lines**: destination marker spheres (~4 px cores), DOM/SVG label layer with country flags; labels animated to dock positions; front-hemisphere filtering, hysteresis and collision relocation in the Aceternity-adapted build (audit doc), later replaced by **authored orbit docks** (fixed angle/ring/side slots per breakpoint) with measured-box leader endpoints, 12 px edge gap, 8 px foreign-label margin, and two controlled quadratic bends for Rwanda/Burundi (`docs/qa/globe-orbit-docks/REVIEW.md`).
- **Animation**: 19-second loop (`LOOP_SECONDS`), phases `clean → rotate → africa-centered → reveal/reveal-mid → hold → retract → clean`; approved random start rotations; drag interaction with clamped pitch, offset decay; `RuntimePause` (IntersectionObserver + visibilitychange → `setFrameloop('never')`); reduced-motion path; DPR caps (1.65 promotion doc / 1.5 earlier audits).
- **Problems faced (with evidence)**: label intersections and drift (commits `0c24428` font size, `de4e84f` bold bevel, `67c3857`/`f987e3b` offsets zeroed, `4495913`/`df781c2` label/route refinement, `83915a7` geography correction, `a8accbb` overlapping arcs separated, `02d1583` revert to safe implementation), mobile layout (labels/leader visibility `4bc286e`, mobile responsive presentation `6d2cf30`, Tanzania/mobile label sequence `6f271ba`, responsive nation indicator lock `b367fd7`), leader-line crossings at 360 px (Ethiopia/UAE — fixed by moving phone dock; Kenya phone dock raised after back-to-top button occlusion — both documented in REVIEW.md), the "visible black rectangle" layering bug (`docs/qa/HOME_GLOBE_LAYER_AUDIT.md` — removed star-field/`planet-halo`/gradient layers), and the animation jump when `performance.now()` continued while offscreen (same audit).
- **Redesign lineage**: procedural Three.js hero → react-globe.gl (Checkpoint 013) → Aceternity-derived ThreeGlobe adaptation (Sep 9, restore tag) → **globe-lab cinematic implementation** (approved) → promotion to homepage (`175ab6c`) → annotation/leader redesigns (simplified leaders → radial perimeter callouts `8e5a284` → orbit docks `ba4f197`).
- **QA methodology**: `scripts/verify-globe-leader-geometry.mjs` samples each rendered SVG path into 64 segments and asserts zero crossings/overlaps/clipping; viewports 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080, 768×1024, 820×1180, 1024×768, 360×800, 390×844, 412×915, 430×932; `verify-globe-orbit-animation.mjs` verifies hidden/partial/full/retract states with a 40-second recorded cycle (`full-cycle.webm`).
- Technical concepts involved: spherical coordinates → 3D vectors, great-circle arcs, ShaderMaterial Fresnel atmosphere, ACESFilmic tone mapping, sRGB color space, anisotropic filtering, pointer capture, requestAnimationFrame budgeting, SVG overlay projection, responsive authored layout.

---

## 10. CMS Development

Two generations, both present:

**CMS V1 (`/app`)** — status: **IMPLEMENTED in repository; NOT deployed to production** (`docs/CMS-PROGRESS.md` final RC verification; Phase 18 "COMPLETE (not deployed)").
- 20 tracker phases COMPLETE with per-phase evidence: foundation, auth (sessions, roles), dashboard KPIs, DataTable collection pattern, news editor with workflow + SEO fields, media library with governed uploads, review queue with field-level diffs, scheduled publishing (calendar), publishing & unified drafts, companies tabbed editor, products & services, leadership with timeline events, geographic registry (countries→regions→locations→facilities), facilities/projects with OSM preview, careers/CSR/contacts/content blocks, metrics with verification/staleness, users & roles/notifications/audit trail, authenticated preview in public response shape, hardening (E2E + axe), production deployment artifacts (not executed), visual QA gate (40 routes × desktop/mobile).
- Governance: separation of duties verified (submitter cannot approve own work — 403), immutable versions, audit trail, unpublish/rollback via workflow, ~16 content types.

**CMS V2 (`/control`)** — status: **IMPLEMENTED in repository (pilot); production wiring partially external**.
- Independent control center (React shell) with authenticated page-source preview (`/admin/v2/page-source/:documentKey`), script-free `srcdoc` canvas, structured visual composition engine (select, double-click text edit, drag reorder, span resize, viewport switching, generated insertion), global navigation and media workflows, immutable revisions in Postgres, release review enforcement, storage isolated from public snapshots, releases published to `public-content/cms-v2/` with content-addressed immutability, publication via durable events → GitHub `public-release.yml` → snapshot validation → Vercel.
- Access limited to `CmsAccessLevel.IT_ADMIN` (`schema.prisma`); old CMS remains for un-ported operations.
- Boundaries honestly recorded in `docs/CMS_V2_ARCHITECTURE.md` (no DB migration in that milestone; adapters for remaining pages are future gates).

**Planning-only / historical** — early CMS-adjacent artifacts: `dashboard.html` + `assets/dashboard-cms.js` (kept, noindex), "ACMS expansion" (Checkpoint 048) superseded. Docs `CMS-PHASE-17-HARDENING.md`, `CMS_V2_*` series (11 documents) provide the written model.

---

## 11. Backend Development

`backend/` — Express 5 ESM service, Node ≥22.6, 79 source files. Routers: `auth`, `admin`, `careers`, `contact`, `cms-v2` + `cms-v2-deployment`, `governed`, `health`, `media-*`, `metrics`, `notifications`, `preview`, `public`, `public-releases`, `publish-schedules`, `review-queue`, `settings`, `children` (example), `example`. Libs of note: `governed.js` (status workflow), `publisher.js`/`public-release.js` (publication worker with retries), `ssrf-guard.js`, `secret-box.js` (AES-256-GCM + boot diagnostics), `content-health.js`, `knowledge.js` (assistant KB), `analytics.js`. Middleware: auth, csrf-guard, rate-limit, security-headers, error-handler (centralized with request-ID correlation — Checkpoint 052), cms-cors, cms-auth-bypass (dev only). Production boot gate refuses insecure config (`index.js`). All 15 Prisma migrations and a least-privilege runtime role are present. Verified runnable check this session: `backend` syntax check **PASS** (`node scripts/syntax-check.js src tests`).

---

## 12. Database

- PostgreSQL via Prisma 7 (`prisma-client` generator, output `backend/generated`), `prisma.config.ts`, shadow DB documented (`lakegroup_shadow`).
- Schema: 53 models / 10 enums (recovery audit) — identity (User, AuditLog, Session), governed domains (Metric+Version, Country/Region/Location/Facility, Category, Company self-relation, ProductService, CompanyRelationship, Media, News, Page, CareerListing, CSREntry, Contact, Project, Leadership, ContentBlock, Milestone, PublishSchedule, PublicationEvent, Notification, AnalyticsEvent, UnansweredQuestion, rate_limit, user_preferences), CMS V2 (ContentDocument, ContentRevision, CmsRelease).
- Migration history: `0001_init` → `0015_cms_v2_foundation` (15 in repo; 14 applied on the audited original DB).
- Operational history: the **Render PostgreSQL loss incident (2026-08-18)** — original DB deleted; local PostgreSQL 18 held the complete copy (57 tables; e.g. 21 companies, 47 pages, 41 news, 822 audit logs, 2,784 analytics events); backups in `backend/backups/`; one encrypted dump undecryptable due to missing `BACKUP_ENCRYPTION_KEY` (documented lesson); recovery plan docs (`docs/RENDER-DB-RECOVERY-PLAN.md`, `docs/database-recovery-*`).
- Backup/DR tooling: `scripts/backup-db.js` / `restore-db.js`, AES-256-GCM backups, DR docs (`docs/security/disaster-recovery.md`, Phase 20 tests).

---

## 13. Contact Form

Status: **IMPLEMENTED (code + 61 automated cases); delivery gate NOT yet passed in production** (`docs/reports/CONTACT_FORM_SECURITY_AUDIT.md`, 2026-09-24).

- Frontend: `assets/contact-form.js` — client validation with ARIA errors, consent, honeypot (`website` must be empty), fetches short-lived signed token from `GET /api/contact/token`, sends JSON to `POST /api/contact/messages` with `startedAt` + `idempotencyKey`. The public page no longer uses `data-mock` (verified by grep this session).
- Backend: `backend/src/routes/contact.js` — strict Zod `.strict()` schema (name/email/phone/subject/message/consent), 32 KB JSON cap, single-line control-character rejection, URL-count and repetition spam checks, HMAC-signed token (≥32-byte secret, 2.5 s min completion, 60 min expiry), origin + `sec-fetch-site` checks, PG-backed rate limits (5/15 min, 15/hour, 40/day per IP; 5/day per email; 3/hour per IP+email; 1000/hour global), idempotency one-time claim, fixed server-side recipient and subject, HTML-escaped email bodies, structured security logging with request IDs, no-store caching.
- Recipients: current configured test recipient `projectdevemail001@gmail.com` (subject prefixed `[TEST]`); production-intended `admin@lakeoilgroup.com` documented but **deliberately inactive until a controlled delivery test passes**.
- Deployment: staging via Vercel rewrite → Render; production via IIS ARR → loopback Node service. Delivery gate: no real email verified yet — **NEEDS USER CONFIRMATION** for final recipient activation.

---

## 14. Careers Form

Status: **IMPLEMENTED (code + 53 automated cases); real ClamAV host and delivery gate NOT configured locally** (`docs/reports/CAREERS_FORM_SECURITY_AUDIT.md`).

- Removed the old `mailto:` manual workflow (audit doc; `ea1c401` "securely integrate application submission"; `build-careers-file-upload.mjs`).
- Frontend: `assets/careers-application.js` + React upload island (`cms/careers-file-upload.tsx` reused pattern; Performance audit noted the island bundles React and is route-scoped); client checks mirror server (5 MB, pdf/docx, consent).
- Backend pipeline (`routes/careers.js`, `lib/cv-inspection.js`, `lib/clamd-scanner.js`):
  - multipart only, ≤6 MB request, ≤5 MB file, 1 file, 11 fields, 4 concurrent applications/process, 20 s timeout;
  - filename whitelist (unicode letters/digits, single dot, no traversal/bidi), MIME must match extension;
  - PDF: `%PDF-` header, `%%EOF`, object/Root/startxref structure, **active-content rejection** (`/JavaScript|JS|Launch|OpenAction|AA|EmbeddedFiles|RichMedia`);
  - DOCX: bounded central-directory inspection via yauzl — entry count ≤2000, uncompressed ≤30 MB, entry ≤15 MB, compression-ratio ≤100 (zip-bomb guard), no encryption flag, methods 0/8 only, rejects `vbaProject.bin`, `.exe/.dll/.js/.vbs/.ole`, `embeddings/`, `activex/`, nested archives, path traversal; requires `[Content_Types].xml` + `word/document.xml`;
  - ClamAV INSTREAM scan with 8 s timeout, 3 concurrent cap, **fail-closed on scanner error** (503), `MALWARE_DETECTED` on FOUND;
  - same token/rate-limit/idempotency/origin machinery as contact; HTML-escaped notification email with CV attached; reference ID returned.
- Recipients: test `projectdevemail001@gmail.com`; production-intended `maryam.mgeni@lakeoilgroup.com` documented, inactive pending the delivery test.

---

## 15. Security

Consolidated, evidence-backed controls (detail docs: `docs/SECURITY-ARCHITECTURE.md`, `SECURITY-CONTROLS.md`, `SECURITY-THREAT-MODEL.md`, `SECURITY-REGRESSION-MATRIX.md`, `SECURITY-TEST-PLAN.md`, 300-threat plan execution, phase reports 01–23):

- **Public surface**: CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (vercel.json headers; IIS equivalents in web.config), `frame-ancestors 'none'`, `object-src 'none'`, no third-party scripts; SW never caches non-GET/authenticated URLs.
- **IIS private-path blocking** (`web.config`): denies `backend|cms|docs|scripts|tests|node_modules|.git|.github|prisma`, `.env*`, lockfiles, `*.map|sqlite|db|sql|bak|pem|key`, `web.config` itself → 404; canonical HTTPS+www redirect; MIME map; static compression; cache policies (commit `110e498`).
- **Forms**: signed expiring tokens (HMAC-SHA256, timing-safe compare), origin + sec-fetch-site, honeypot, min-completion time, per-IP/email/combined/global rate limits in Postgres (survive restarts), idempotency one-time claims (prevents duplicate CV deliveries), control-char/bidi stripping, HTML escaping (XSS), Zod strict schemas (NoSQL/type confusion), fixed recipients (header injection/mail-routing control), 32 KB/6 MB caps, generic error codes (no info leak), fail-closed on any infrastructure failure (`79aff63`).
- **Uploads**: extension+MIME+byte-signature+structure validation, active-content rejection, archive-bomb guards, ClamAV, bounded memory, random immutable storage keys for governed media (media-url security phase 17 tests).
- **Backend app**: session cookies with configurable secure flag, CSRF guard (Origin checks; `TRUST_PROXY` guidance), login rate limiting (persistent 24 h/IP), RBAC (5 roles) + MFA (TOTP, AES-256-GCM sealed seeds, operator-friendly boot diagnostics — Checkpoint 054), production gate (fail-fast), SSRF guard, security logging (Phase 18), audit trail (Phase 19), backup/DR (Phase 20), automated security testing CI (Phase 21), secret scanning (Phase 22), manual review + production gate + continuous security (Phases 23–25 — Checkpoint 050).
- **CI security gate**: `.github/workflows/security.yml` runs phase test suites + npm audit against baseline `docs/security/audit-baseline.json` + secret scan + DAST probe; `ci-supply-chain-hardening.test.js` exists for supply-chain rules.
- **Secrets management**: `.env` gitignored, `.env.example` templates (root: SITE_URL/search verification; backend full contract), fail-closed on missing keys, documented Render staging env contract (`docs/deployment/SIMPLE_VERCEL_RENDER_SETUP.md`), metadata-only MFA key validator.
- **Known gaps honestly documented**: real ClamAV host not configured locally; no real email delivered yet; Origin header forgeable by non-browser clients (compensating controls listed); BACKUP_ENCRYPTION_KEY missing for one historical backup; DAST/deploy-time checks are deployment-dependent.

---

## 16. SEO

- `robots.txt` (allows all, disallows 404/offline/dashboard/cms/backend/docs; sitemap reference) and `sitemap.xml` (31 URLs, canonical `https://www.lakeoilgroup.com`, lastmod Sept 2026).
- Generated metadata pipeline: `scripts/build-seo-foundation.mjs` (part of `npm run build`), `verify-seo-foundation.mjs`, `build-sitemap.js`, `build-llms.mjs` (`llms.txt` = AEO answer-engine summary), `verify-crawl-readiness.mjs`.
- Per-page canonical links verified present (grep this session: index/contact/careers/lake-oil/about all canonicalized to `www.lakeoilgroup.com`); 31 pages carry JSON-LD structured data (Organization/Website/Breadcrumbs per `SEO_ROUTE_INVENTORY.md` pre-findings and later hardening `3d428ef`).
- Open Graph + Twitter/social preview: branded link preview `70f49c4`; OG meta and skeleton/OG polish (Checkpoint 014).
- Indexation controls: noindex for utility pages; **preview/staging non-indexable until SITE_URL set** (root `.env.example`); English-only crawl locale with hreflang deliberately withheld until Swahili pages publish; multilingual SEO/AEO foundation commits (`09756d5`, `90df2f3`, `3d0da0a`, `3d428ef`, `0892e37` domain migration prep, `0f56f16` entity/geographic signals, `a37d286` meta description).
- Route inventory doc records the split history (canonical/OG originally split between production and preview domains; sitemap once exposed only two URLs — both fixed).

---

## 17. Performance

- Image optimization: bulk media pipelines (convert/compress, WebP), audit scripts (`audit-public-images.mjs`), image-remediation passes for home/corporate/Lake Trans/AFICD (`ce35441`, `e3a344b`, `b3064ac`), "process and optimize audited website assets" (`3286714`), "enhance convert and compress full image library" (`7a5534f`); responsive hero images with `media`-based preloads (desktop/tablet/mobile variants in `index.html`; `verify-responsive-hero-images.mjs`); lazy loading + `decoding="async"`; `<picture>`-style preloads with fetchpriority.
- Bundle/runtime: esbuild minified IIFE globe bundle; lazy globe island (IntersectionObserver); DPR caps 1.5/1.65; single RAF owners; frameloop `never` when offscreen/hidden; startup-freeze elimination (`eb3ac1f`, `952a9de`), recurring runtime bottleneck fixes (`c41053a`, `6c7ac96`), slow-network optimization (`386de86`), initial-load reduction (`870de79`), homepage bottlenecks (`2b102c4`), skeleton loader (dynamic, local placeholders `ab2cd23`).
- Cache: SW VERSION discipline (v87), cache-consistency checks, immutable asset headers (fonts/vendor 1 year), stale-while-revalidate for images, no-cache for HTML/SW/manifest; "eliminate stale mixed-version site delivery" (`c2d9386`), "enforce fresh cross-browser builds" (`90235ed`).
- Root-cause discipline: `docs/reports/PERFORMANCE_ROOT_CAUSE_AUDIT.md` (duplicate navbar include on 41 pages fixed; RAF/listener inventory tables; no fabricated metrics — explicitly notes where traces were unavailable), `PERFORMANCE_GUARDRAILS.md` + `check-performance-guardrails.mjs`, `performance-sanity.test.js`, Lighthouse CI configured (`lighthouserc.json`, workflow) though live scores are deployment-dependent.
- CMS budget: 291.1 KiB raw / 91.2 KiB gzip entry budget enforced (`docs/CMS-PROGRESS.md`).

---

## 18. Responsive Development

- Tested breakpoints with committed evidence: **360×800, 390×844, 412×915, 430×932** (phones), **768×1024, 820×1180, 1024×768** (tablets portrait/landscape), **1280×720 → 1920×1080** (desktop) — the globe QA matrix alone; CMS visual gate at 1440×900 and 390×844; initial QA at 1440×900 and 390×844.
- Documented responsive problems solved: 390 px horizontal overflow on 5 pages (mobile overflow guard §14b in theme.css), mobile hero cropping (full-bleed restoration), mobile globe background (Checkpoint 013), mobile scroll lag/unlock, mobile navbar layout, mobile accordions, mobile sector navigation (`9e2cba6`, `home-mobile-sector-selector.test.js`), narrow-desktop menu support, company-page mobile overflow (`f10354b`) and standardized mobile company layouts (`1eaa6b9`, `f5f2e9a`, `3c6d211` era), single-column divisions grid <768 px, globe docks per breakpoint (<420 / <600 / <960 / ≥960).
- High-resolution desktop: 1920×1080 and 1536×864 covered in captures. Specific Samsung device testing: **NEEDS USER CONFIRMATION**.

---

## 19. Deployment

- **Local development**: `backend` (node --watch, local PostgreSQL), `cms` (Vite dev server :5173), static site via any static server; `docs/development/LOCAL_DEV_SETUP.md`.
- **Temporary staging (verified used)**: Vercel static hosting of repo root (`vercel.json`: outputDirectory ".", buildCommand `npm run build`, cleanUrls false) at `lakegroup.vercel.app`; backend + PostgreSQL on Render (`lake-group-web-backend.onrender.com`), non-production env (`NODE_ENV=staging`, `DEV_MFA_SKIP_EMAILS`), CMS on Vercel (SPA fallback fix `f9e8f54`). Render DB loss incident occurred here (see §12).
- **Final production architecture (documented + configured, not yet verified live)**: `https://www.lakeoilgroup.com` on **Lake Group-owned IIS** with URL Rewrite + ARR reverse-proxying only the four anonymous form routes to a private Node service on `127.0.0.1:4000` (NSSM/PM2 service), private ClamAV on 3310, private PostgreSQL, firewall (public 80/443 only), TLS at IIS with HTTP→HTTPS, exact `TRUST_PROXY`, env via server secret store — all specified in `docs/deployment/LAKE_GROUP_SERVER_FORMS_DEPLOYMENT.md`, `docs/development/STATIC_DEPLOYMENT_IT_CHECKLIST.md`, and enforced by `web.config`. Domain migration prep: `docs/development/DOMAIN_MIGRATION_CHECKLIST.md`, `0892e37`. Whether IIS production is **actually live**: **NEEDS USER CONFIRMATION**.
- Release pipeline: publication event → GitHub `public-release.yml` (runs `cms-v2:snapshot` then Vercel build) — repository-side implemented; external trigger/credentials remain operator actions (`docs/MIGRATION-STATUS.md` phases 22–23 "external gate open").
- Legacy URL strategy: permanent redirects in both `vercel.json` and `web.config` (fuel→lake-oil, lpg→lake-gas, lubricants→lake-lubes, steel, concrete, logistics, container-services→aficd, la-home/la-projects→lake-agro, lake-plastics→lake-pipes, leadership-*→leadership, ocean-galleria/acfs/services/atl→index).

---

## 20. Testing & QA

- **Static site (root `tests/`, ~85 files, plain `node --test` + custom runners)**: navbar/footer/responsive phase suites, homepage hero/autoplay/counters/logo-nav, mobile nav suites, per-company content/source-lock suites (lake-oil, lake-gas, lubes, cylinders, pipes, trans, agrinova, cross-country/gulf, buildings/premix, aviation, aficd/aill), chairman-title and truck-count consistency, social-channel policy, static CSP hardening, IIS static security, public snapshot/delivery, cache lifecycle, reload stability, runtime stability/performance, production update lifecycle, decorative cleanup, dropdown theme consistency, security documentation.
- **Backend (61 files, Vitest+supertest)**: documented totals 279 tests + 163 security tests (from `docs/CMS-PROGRESS.md` final RC — recorded counts, not re-run this session); suites include auth/sessions/RBAC/MFA, CSRF, validation, api-security, path traversal, command injection, SSRF, upload, media-URL security, security logging, audit trail, backup/DR, secret scan, manual review, production deployment, threat hardening (phase300), plus contact (61 cases) and careers (53 cases) suites and a real-DB CMS V2 integration test.
- **CMS (Vitest + Testing Library + axe)**: 31 tests documented; component tests (metrics page, responsive Users cards), critical-flow E2E (`e2e/critical-flow.mjs`), visual-quality runner, 40-route UI gate.
- **Browser/visual QA**: Playwright headless Chromium captures across 12 viewports for the globe; QA screenshot directories (`docs/qa/`, 159 items incl. `globe-orbit-docks/`, `about-hero-slideshow/`, `forms/`, `global-nav/`, `cms-v2-control-center/`); Lighthouse CI workflow; accessibility workflow.
- **Verification scripts (runners)**: `verify-static-runtime`, `verify-public-forms`, `verify-crawl-readiness`, `verify-seo-foundation`, `verify-responsive-hero-images`, `verify-promoted-home-globe`, `verify-home-globe-repair`, `verify-globe-*` (4 scripts), `verify-history-scroll-sync`, `check-cache-consistency`, `check-performance-guardrails`, `check-root-structure`, `check-secrets`, `check-cms-v2-launch-config`, `cms-v2-launch-smoke`.
- Counts are stated only where a document records them (as above). A fresh full-suite run was not executed in this session (backend syntax check PASS was).

---

## 21. Major Technical Challenges

Format: PROBLEM → WHY → INVESTIGATION → SOLUTION → CONCEPT LEARNED → RESULT.

1. **Mobile horizontal overflow (initial site)** — inline multi-column grids without breakpoints; long unbreakable emails/phones. Investigated via headless-Chrome scrollWidth probe (`scripts/_qa_overflow_check.js`). Solution: mobile overflow guard collapsing grids ≤720 px, `min-width:0`, `overflow-x: clip` (kept sticky working). Learned: CSS grid/overflow interaction, `clip` vs `hidden`. Result: 390 px = exact viewport on all pages.
2. **offline.html infinite reload loop** — `window.online` handler reloaded unconditionally while serving the fallback URL. Investigated with simulated online event + navigation counting. Solution: navigate to index once when on the fallback URL; reload only in the SW-fallback case. Learned: SW fallback semantics. Result: exactly 1 navigation, no bounce (QA issue #1).
3. **Globe label intersections/leader-line chaos** — DOM labels projected from 3D points overlapped and leaders crossed, especially on phones (360 px Ethiopia/UAE crossing; Kenya label occluded by back-to-top button). Investigated with a 64-segment SVG path sampler across 12 viewports (`verify-globe-leader-geometry.mjs`) + screenshot review. Solution evolution: font/offset tuning → collision/hysteresis system → radial perimeter callouts → **authored per-breakpoint orbit docks** with measured-box leaders and protected margins. Learned: 3D→2D projection, collision geometry, authored vs algorithmic layout. Result: zero crossings/overlaps/clipping in final verification (`docs/qa/globe-orbit-docks/verification.json`).
4. **Globe layering "black rectangle"** — nested near-black gradients and star-field pseudo-elements composited over the WebGL canvas. Investigated via a full layer audit table (backgrounds, opacity, z-index, blend, pointer-events). Solution: removed three decorative layers; transparent canvas clear; restored horizontal drag with `touch-action: pan-y`. Learned: compositing layers, pointer events vs page scroll. Result: clean visual contract at desktop+mobile.
5. **Animation jump when globe offscreen** — `performance.now()` kept running while RAF was paused. Solution: advance timeline from frame deltas; pause with rendering. Learned: clock-vs-delta animation.
6. **Duplicate shared-script delivery (perf)** — navbar include duplicated on 41 pages; Careers React island re-mounted on re-evaluation. Investigated with clean-context headless probes + production fetch. Solution: single versioned navbar; idempotent mount guard. Learned: island architecture hygiene. Result: documented in PERFORMANCE_ROOT_CAUSE_AUDIT.
7. **Runtime freezes/stalls** — startup freezes and recurring bottlenecks; solved by deferring heavy rendering, eliminating repetitive decorative sections, RAF inventories. Result: dedicated fix commits + guardrail tests.
8. **Render PostgreSQL deletion** — staging DB lost at provider; one encrypted backup undecryptable (missing key). Investigation: read-only audit comparing schema/rows/backups. Solution: restore path via `backend/scripts/_render_migrate.mjs` from local authoritative copy. Learned: backup encryption key management, DR rehearsal. Result: recovery audit + plans committed.
9. **Securing file uploads** — CVs are an attack vector (renamed executables, macro DOCX, active PDFs, zip bombs). Solution: layered validation + ClamAV + fail-closed. Learned: defense-in-depth, archive internals. Result: 53-case suite; unscanned attachments impossible by construction.
10. **Email delivery trust** — must prevent visitor-controlled recipients/header injection; provider identity via SPF/DKIM/DMARC (documented, not invented). Result: fixed server recipients, verified-sender requirement, delivery-gate checklist.
11. **Deployment portability** — Prisma generated client missing in Docker runtime (ERR_MODULE_NOT_FOUND on Render). Fixed by copying `generated` into the runtime stage (`3bc8d6d`). Learned: multi-stage Docker + codegen artifacts.
12. **MFA key operability** — operators couldn't distinguish missing vs malformed keys. Solution: metadata-only boot diagnostics + validator script (+7 tests). Learned: secure diagnostics without secret leakage.
13. **Static/CMS separation** — early design had pages fetching live APIs, creating a second data source and outage fragility. Solution: versioned, content-addressed, same-origin snapshot with atomic promotion; failure-resilience tests. Learned: snapshot publication, atomicity. Result: MIGRATION-STATUS phases complete in-repo.
14. **Content provenance** — leadership names, station counts (evolved 152→290+→500+), truck counts (1,200→1,600+), fleet conflicts. Solution: source-lock passes and consistency tests (`chairman-title-consistency`, `truck-count-consistency`, `network-station-figures`). Learned: content governance.
15. **Cache staleness across deploys** — mixed-version delivery and stale SW assets. Solution: VERSION discipline + consistency checks + cache-bust script family. Learned: cache lifecycle engineering.

---

## 22. Solutions Implemented (summary map)

Mobile overflow guard; offline-loop fix; branded 404; PWA cache versioning; design-token system; mega-menu; i18n dictionaries with coverage tests; react-globe.gl → Aceternity → globe-lab pipeline with esbuild; orbit-dock label system with geometry verification; secured contact/careers APIs with token/rate-limit/idempotency/scanner; fail-closed infrastructure errors; IIS private-path deny + HTTPS canonicalization; Vercel headers/CSP; snapshot publication with atomic promotion; governed workflow with separation of duties; MFA with encrypted seeds + boot diagnostics; least-privilege DB roles; centralized error handling with request IDs; secret scanning + audit baseline; backup/DR tooling; media pipelines (WebP, lazy, preloads); source-locked content with consistency tests; legacy redirect map; AEO `llms.txt`.

---

## 23. Internship Activities Supported by Evidence

| Activity | What was done | Tools | Skill | Evidence (files/commits) |
|---|---|---|---|---|
| Analyzed existing website | Archived and reviewed legacy site; produced structure audits | HTTP mirror tooling, audits | Requirements analysis | `old lake group website/`, `docs/REPOSITORY_STRUCTURE_AUDIT.md`, `PHASE-0-AUDIT.md` |
| Redesigned site sections | Flagship design system, homepage redesigns, page rebuilds from approved sources | HTML/CSS/JS, GSAP | UI design, design systems | `2f445c5`, `060c9cef` era, `docs/design/FLAGSHIP_DESIGN.md` |
| Implemented responsive interfaces | Breakpoint systems, mobile fixes, hero parity | CSS, headless Chrome | Responsive engineering | QA report, `1eaa6b9`, `805a4fd`, globe dock layouts |
| Developed backend API | Express service, governed routes, validation | Express, Zod, Prisma | API development | `backend/src/*`, `2412fc6` |
| Designed/built CMS | 20-phase CMS + V2 control center | React, TS, TanStack, RHF | Full-stack product build | `cms/`, `docs/CMS-PROGRESS.md` |
| Integrated database | Schema, 15 migrations, seeds, roles | PostgreSQL, Prisma | Data modelling | `backend/prisma/*` |
| Implemented secure forms | Tokens, limits, idempotency, AV scan, mailer | Node crypto, Multer, ClamAV, Resend | AppSec practice | `b8f221d`, `79aff63`, form audits |
| Configured SEO | Metadata pipeline, sitemap, robots, llms.txt, JSON-LD | Node build scripts | Technical SEO/AEO | `scripts/build-seo-*`, SEO reports |
| Optimized images/performance | Media pipelines, WebP, lazy/preload, guardrails | sharp, Playwright | Web performance | `3286714`, `7a5534f`, guardrail docs |
| Tested mobile compatibility | 12-viewport captures, per-page suites | Playwright, custom verifiers | QA automation | `docs/qa/*`, verification JSONs |
| Built interactive 3D globe | R3F scene, routes, labels, docks | React Three Fiber, Three.js, esbuild | 3D web graphics | `globe-lab/entry.tsx`, bundle, QA folder |
| Used Git version control | 591 commits, 94 restore tags, PR merges, conflict resolution | Git, GitHub | VCS discipline | history; conflict merge `ec8291e` |
| Wrote documentation | 33 security docs, 82 reports, ops guides | Markdown, HTML guides | Technical writing | `docs/**` |
| Ran security program | 300-threat plan, phases 01–25, CI gates | Vitest, ESLint security, CI | Security engineering | `docs/security/*`, `security.yml` |
| Debugged production issues | Duplicate scripts, freezes, cache staleness, DB loss | DevTools probes, audits | Root-cause analysis | `docs/reports/PERFORMANCE_ROOT_CAUSE_AUDIT.md`, recovery audit |
| Prepared deployment | web.config, Vercel config, Docker, Render/Vercel guides, IT checklist | IIS, Docker, Vercel/Render | DevOps basics | `web.config`, `vercel.json`, `backend/Dockerfile`, deployment docs |

Not claimable from repo evidence (do **not** put these in the report): customer/stakeholder meetings beyond "client directive/approved content" mentions, any activity outside this repository, formal attendance/daily routines.

---

## 24. Knowledge & Skills Gained

**Technical (each tied to work above):** static web architecture; design tokens and CSS systems; responsive layout engineering; JavaScript animation and scroll systems; PWA/service workers; WebGL/Three.js/R3F scene composition; esbuild bundling; REST API design with Express; schema validation with Zod; PostgreSQL modelling and migrations with Prisma; session/RBAC/MFA implementation; file-upload security and malware scanning; rate limiting and abuse control; transactional email integration; structured logging and audit trails; automated testing (Vitest, supertest, node --test, Testing Library, Playwright, axe); CI/CD pipelines and security gates; containerization; IIS/ARR and Vercel deployment; DNS/SEO/AEO; technical writing; Git workflows and recovery discipline.

**Soft/professional (evidence-linked):** iterative delivery under review (approved-content rebuild cycles); documentation habits (82 reports); restore-point discipline before risky changes (94 tags); honest status reporting (audits that record incomplete gates); requirements verification (fact-auditing content against company sources); cross-checking docs vs code (this dossier's discrepancies section).

---

## 25. Software Development Process

Observed process (from history, not assigned labels): requirement gathering via archived site + verified-facts dataset → checkpoint-style iterative delivery (numbered checkpoints 001–062) → QA/verification pass after each feature family (dedicated test files per correction) → restore tags before risky work → merge/conflict resolution between local and upstream (`ec8291e` resolved 7 conflict files) → security roadmap phases executed sequentially → launch-readiness passes (mobile recovery, static launch, forms fail-closed) → handover tags (`pre-frontend-client-handover-*`).

Classification: **iterative, prototype-driven, verification-heavy development** with agile-like small increments and evidence gates. A formal methodology (Scrum etc.) is **not evidenced** — do not claim it. Testing approach: automated regression suites per feature + browser/visual QA + security suites + deployment gates; AI pair-tooling appears twice in metadata (initial commit "Co-authored-by: Cursor"; assistant notes in `scripts/`) — the repository is otherwise tool-agnostic.

---

## 26. SWOT Evidence

**Strengths (org/project, evidenced):** diversified group across 6 verticals and 10 countries (llms.txt, globe); decade+ history since 2006 (history page); in-house modern web platform with governed CMS and audit trail; strong security engineering culture (25+ phase docs, CI gates); resilient static delivery; leadership continuity (8 approved profiles).
**Weaknesses:** content dependencies (DATA_GAPS: missing videos/contacts; unverifiable claims blocked launch); staging fragility (Render DB loss; undecryptable backup); single-maintainer bus factor visible in git; production deployment not yet executed; some stale documentation (README Payload/CMS description).
**Opportunities:** CMS-driven content for staff (control center ready); Swahili/French localization already seeded in i18n (crawlable versions pending); AEO/llms.txt early-mover visibility; org-chart/financial dashboards extendable to internal tools; careers funnel automation.
**Threats:** web threats (spam, malware uploads, bot abuse — mitigated but Origin spoofing residual); provider-side data loss (happened once); domain/DNS migration risk; third-party dependency/supply-chain risk (CI audit gate exists); unverified analytics of real-world performance (Lighthouse pending on live host).

**SO strategies:** use the completed CMS to onboard non-technical content owners and close DATA_GAPS; publish Swahili pages on the existing i18n foundation to widen reach; extend llms.txt/AEO lead.
**WO strategies:** fix backup-key management and rehearse restore (turn the DB incident into standing DR practice); complete the production IIS cutover using the existing deployment guide to remove staging fragility.
**ST strategies:** keep the static-first architecture and fail-closed forms as the primary shield; maintain the CI security gate and secret scanning as release blockers.
**WT strategies:** document and cross-train the deployment runbook to remove bus factor; retire stale docs; formalize content-approval SLA so launch blockers (unverified claims) don't recur.

---

## 27. Practical Recommendations

Each tied to an identified issue: 1) Execute the controlled form delivery gate (one real Contact + Careers email to the test inbox, then activate `admin@`/`maryam.mgeni@` recipients). 2) Complete IIS production cutover per `LAKE_GROUP_SERVER_FORMS_DEPLOYMENT.md` incl. firewall, TRUST_PROXY, HSTS. 3) Set `BACKUP_ENCRYPTION_KEY`, re-encrypt backups, and schedule automated `db:backup` with restore drills. 4) Run the production Lighthouse + real-device pass promised in the QA report. 5) Regenerate stale docs (README backend description, `llms.txt` facts) via the build scripts. 6) Publish reviewed Swahili pages before enabling hreflang. 7) Content governance: maintain the approved-source workflow and consistency tests for every new claim. 8) Monitoring: add uptime/alerting on the Node service, clamd freshness, and `rate_limit` table growth (ops runbook exists). 9) Accessibility: formal WCAG audit of final site. 10) Continue the release-worker external trigger setup (MIGRATION-STATUS remaining items).

---

## 28. Organization Information Available

Verified from repository only:

- **Name:** Lake Group (corporate domain `www.lakeoilgroup.com`; site title "Lake Group | Diversified Business Group in East & Central Africa").
- **Sectors/verticals:** Energies, Manufacturing, Logistics, Real Estate, Agro Processing, Automotive (`llms.txt`, navbar structure).
- **Subsidiaries/pages (21 companies per DB audit; public pages above):** Lake Oil, Lake Gas, Lake Lubes, Lake Steel, Lake Premix Cement (GCCP), Lake Buildings, Lake Cylinders, Lake Pipes (ex-Lake Plastics), Lake Trans, AFICD, AILL, Lake Agro, Lake Aviation, Cross Country, Gulf Aggregates, Ocean Galleria/Waterfront Mall (renamed `f10354b`), Agrinova Tech, Assembly Tech (ATL), NexDrive Motors, Tiger Tech, Lake Energies.
- **Footprint:** 10 countries — Tanzania (HQ, Dar es Salaam), Kenya, Uganda, Rwanda, Burundi, DR Congo, Zambia, Mozambique, Ethiopia, UAE (globe PLACES + "One Network. Ten Countries."). Zambia operations milestone 2008; Agro Zambia 2017; Tanzania Agro project 2021.
- **Founding:** 2006 (`history.html` title "Since 2006"). HQ area: Kigamboni (commit `c2b41a8` "approved chairman biography and Kigamboni HQ").
- **Leadership (client-confirmed per DATA_GAPS):** Ally Edha Awadh (Founder & Chairman); Dilip Kumar (CEO Manufacturing); Bibhuti Singh (CFO AFICD); Biji Lapat (CEO Lake Energies); Sridhar Mani (Director of Digital Transformation); Mohammed Khalid (MD ATL); Juma Nuru (Director of Operations); Nassoro Abubakari (PM Lake Agro). Stats visible on site evolved to 1,600+ trucks, 500+ fuel stations (commits `8f25e45`, `79ea2e4`).
- **Reference documents:** `docs/reference/company/Lake_Group_Company_Profile.docx` (v1–v3 in docs), `LAKE_GROUP_PRESENTATION.pptx`, `docs/Lake Oil Group website.pdf`, `docs/Lake-Group-Website-Missing-Real-Data.docx`, `docs/Website Contents Needed (2024).docx`, `docs/lake_group_verified_data.json`, brand guidelines PDF (`docs/Lake Brand Design Guidelines 2023 (1).pdf`).
- **Organizational hierarchy/chart:** an interactive org-chart page exists (`lake-group-org-chart.html`: "companies owned by Mr. Ally Edha Awadh") — a **management-structure** chart of companies, not an HR hierarchy. Full corporate hierarchy: **NEEDS USER/COMPANY INFORMATION**.

---

## 29. Information Required From Student

Repository cannot provide (ask the student later; do not guess): full student name; registration number; degree/program and university; internship start/end dates and exact duration (repo bounds: 2026-07-05 → 2026-09-25); university supervisor; company supervisor; assigned department/unit; physical office/branch and working hours; daily routine and weekly cadence; people acknowledged; whether the student personally authored commits or collaborated (contributor identities in git are not the student's legal name proof); tasks performed outside this repository (meetings, data collection from company departments); the final production deployment status actually observed; company org chart beyond the company-ownership chart; any NDA constraints on screenshots.

---

## 30. Reference Sources

**Internal project sources (citable):** `docs/qa/QA_REPORT.md`; `docs/REPOSITORY_STRUCTURE_AUDIT.md`; `docs/PUBLIC-DELIVERY-ARCHITECTURE.md`; `docs/MIGRATION-STATUS.md`; `docs/SECURITY-ARCHITECTURE.md` + `docs/security/*` (33 files incl. 300-threat plan); `docs/CMS-PROGRESS.md`, `docs/CMS-API-MAP.md`, `docs/CMS_V2_ARCHITECTURE.md` (+8 CMS_V2 docs); `docs/reports/CONTACT_FORM_SECURITY_AUDIT.md` & `CAREERS_FORM_SECURITY_AUDIT.md`; `docs/reports/RENDER_DB_RECOVERY_AUDIT.md`; `docs/reports/HOME_GLOBE_PROMOTION_20260909.md`, `HOMEPAGE_GLOBE_REBUILD_AUDIT.md`, `HOMEPAGE_GLOBE_REBUILD_AUDIT` companion `docs/qa/HOME_GLOBE_LAYER_AUDIT.md`; `docs/qa/globe-orbit-docks/REVIEW.md` + `verification.json`; `docs/deployment/LAKE_GROUP_SERVER_FORMS_DEPLOYMENT.md`, `SIMPLE_VERCEL_RENDER_SETUP.md`; `docs/reports/SEO_ROUTE_INVENTORY.md`, `TECHNICAL_SEO_CRAWL_AUDIT.md`; `docs/reports/DATA_GAPS.md`; `backend/README`, `backend/package.json`, `backend/prisma/schema.prisma`; `web.config`, `vercel.json`, `sw.js`; `old lake group website/archive-state.json`; `scripts/verify-globe-leader-geometry.mjs`; `globe-lab/entry.tsx`.

**Official technology sources (safe to cite by name; URLs standard):** MDN Web Docs (HTML/CSS/JS/Service Workers); Node.js docs; Express (expressjs.com); PostgreSQL (postgresql.org/docs); Prisma (prisma.io/docs); React (react.dev); Vite (vitejs.dev); Three.js (threejs.org/docs); React Three Fiber (r3f.docs.pmnd.rs); Zod (zod.dev); Multer (github.com/expressjs/multer); ClamAV (docs.clamav.net); Tailwind CSS (tailwindcss.com); TanStack Query; React Router; Playwright (playwright.dev); Vitest (vitest.dev); Esbuild (esbuild.github.io); sharp (sharp.pixelplumbing.com); Resend (resend.com/docs); Microsoft IIS / URL Rewrite / ARR (learn.microsoft.com/iis); Vercel (vercel.com/docs); Render (render.com/docs); GitHub Actions (docs.github.com/actions); Git (git-scm.com/doc); Lighthouse (developer.chrome.com/docs/lighthouse). Verify each URL before final citation; none were fetched in this session.

---

## 31. Suggested Appendices

| Appendix | Source file(s) in repo |
|---|---|
| A. Sitemap & page inventory | `sitemap.xml`, `docs/reports/SEO_ROUTE_INVENTORY.md` |
| B. System architecture diagram | redraw from §5 of this dossier (sources: `PUBLIC-DELIVERY-ARCHITECTURE.md`, `SECURITY-ARCHITECTURE.md`) |
| C. Globe screenshots (12 viewports) | `docs/qa/globe-orbit-docks/globe-*.png`, `full-cycle.webm`, phase PNGs |
| D. Before/after globe audits | `docs/qa/home-globe-before-1440.png` / `home-globe-after-1440.png`, `HOME_GLOBE_LAYER_AUDIT.md` |
| E. Form security audit tables | `CONTACT_FORM_SECURITY_AUDIT.md`, `CAREERS_FORM_SECURITY_AUDIT.md` |
| F. Code excerpts (1–2 pp) | `backend/src/lib/public-form-security.js` (token signer/verifier); `backend/src/lib/cv-inspection.js` (PDF/DOCX checks); `globe-lab/entry.tsx` (route + dock system); `web.config` (private-path deny) |
| G. Git timeline excerpt | `git log --oneline --reverse` sample + tags list |
| H. CMS evidence | `docs/CMS-PROGRESS.md` table; `docs/qa/cms-v2-control-center/` captures |
| I. Responsive evidence | `docs/reports/DESKTOP_MOBILE_CONTENT_PARITY_AUDIT.md`; globe viewport captures; CMS 1440/390 gate |
| J. Database schema | `backend/prisma/schema.prisma` (printed excerpt); recovery-audit row-count tables |
| K. Deployment guides | `LAKE_GROUP_SERVER_FORMS_DEPLOYMENT.md`, `STATIC_DEPLOYMENT_IT_CHECKLIST.md` |
| L. QA report | `docs/qa/QA_REPORT.md` (initial full-site QA) |
| M. Legacy vs new comparison | `old lake group website/02-OFFLINE-VIEWABLE` screenshots (take fresh) vs current pages |
| N. Company reference docs | `docs/reference/company/*` (cite, don't republish) |

Screens that would need **new** captures for the report (not committed): careers form UI states, contact success/error states, CMS login/dashboard (from local run only), station locator.

---

## 32. Repository Evidence Index

Discrepancies found while cross-checking docs vs code (state plainly in the report):
1. `README.md` calls the backend "Self-hosted Payload CMS" — **code shows a custom Express+Prisma backend**; README tree also mentions `archive/` which no longer exists at root. Documentation drift, fix before citing.
2. `docs/CMS-PROGRESS.md` marks all CMS phases COMPLETE — true **in-repository only**; the same document states production deployment was intentionally not executed. Do not cite as "deployed".
3. `docs/MIGRATION-STATUS.md` phases 22–23 explicitly leave the production publication trigger to the release owner.
4. Contact/careers audits declare code complete but **delivery gates open** (no real email sent; no real ClamAV host configured locally).
5. The encrypted backup `lakegroup-20260812111606.dump.enc` is **permanently undecryptable** (missing key) — documented, not hidden.
6. Playwright browser automation produced no usable capture in one environment (globe rebuild audit) — QA relied on project runners; stated in the audit.

| Claim / topic | Source file | Commit / date | Status | Notes |
|---|---|---|---|---|
| Static public site (42 pages) served from root | `vercel.json`, root `*.html` | b0c8ef2, ongoing | IMPLEMENTED | 31 URLs in sitemap |
| Design-token/flagship system | `assets/tokens.css`, `flagship.css` | 2f445c5 2026-07-06 | IMPLEMENTED | docs/design/FLAGSHIP_DESIGN.md |
| Trilingual i18n (EN/FR/SW dictionaries) | `assets/i18n*` | bb07525/e996767 | IMPLEMENTED (dictionaries); public crawl = EN only | `d071380` |
| PWA + service worker | `sw.js`, `manifest.webmanifest` | v87 2026-08-28 | IMPLEMENTED | version-bump discipline |
| 3D globe (globe-lab) | `globe-lab/entry.tsx`, `assets/globe-lab.bundle.js` | 95f4cca 2026-09-09; ba4f197 2026-09-25 | IMPLEMENTED | promoted to home 175ab6c |
| Orbit-dock labels + geometry QA | `scripts/verify-globe-leader-geometry.mjs`, `docs/qa/globe-orbit-docks/` | ba4f197 2026-09-25 | IMPLEMENTED | 12 viewports, zero collisions |
| react-globe.gl hero | history | d46bab5 2026-07-20 | HISTORICAL (superseded) | dependency still in package.json |
| Aceternity globe rebuild | `assets/hero-globe/*` | 77fbdc1 2026-09-09 | HISTORICAL (replaced by globe-lab on home) | sources retained for audit |
| CMS V1 governed workflow (20 phases) | `cms/`, `docs/CMS-PROGRESS.md` | Aug–Sep 2026 | IMPLEMENTED in repo; NOT deployed | release-candidate evidence documented |
| CMS V2 control center + visual composition | `cms/src/features/control-center`, `backend/src/lib/cms-v2-*` | aa5a771→f644210 2026-09-18/19 | IMPLEMENTED (pilot); PARTIALLY deployed | adapters for remaining pages are future gates |
| Snapshot publication pipeline | `public-content/`, `scripts/public-snapshot.js`, `public-release.yml` | 1f90196 era | IMPLEMENTED in repo; trigger external | MIGRATION-STATUS 22–23 |
| Express+Prisma backend | `backend/` | 2412fc6 2026-08-11 → | IMPLEMENTED | 15 migrations; 61 test files |
| Render staging (backend+Postgres) | `vercel.json` rewrites; setup guide | 2026-08 | STAGING ONLY | DB loss incident 2026-08-18 |
| Contact secure form | `routes/contact.js`, `assets/contact-form.js` | b8f221d 2026-09-24 | IMPLEMENTED; delivery gate open | 61 automated cases |
| Careers secure form + AV scan | `routes/careers.js`, `lib/cv-inspection.js`, `lib/clamd-scanner.js` | ea1c401/b8f221d | IMPLEMENTED; scanner+delivery gate open | 53 automated cases |
| IIS production architecture | `web.config`, deployment guide | 110e498 2026-09-19; 5d5396d | PRODUCTION INTENDED | live status needs user confirmation |
| HTTPS/headers (CSP etc.) | `vercel.json`, `web.config` | 0538c81+ | IMPLEMENTED | Vercel live; IIS mirrored |
| robots/sitemap/llms/JSON-LD | root SEO files, build scripts | 09756d5→0f56f16 | IMPLEMENTED | 31 URLs; 31 pages with JSON-LD |
| Image optimization pipelines | `scripts/bulk-media-pipeline.mjs` etc. | 3286714, 7a5534f | IMPLEMENTED | WebP + lazy + preload |
| Performance guardrails | `check-performance-guardrails.mjs`, docs | c41053a era | IMPLEMENTED | documented budgets |
| Mobile launch recovery | — | c4c2713, 2f4baa9 2026-09-20 | IMPLEMENTED | full-bleed hero restored |
| Secret scanning / CI gates | `scripts/check-secrets.mjs`, `security.yml` | 27712a2 | IMPLEMENTED | 702 files clean (documented) |
| Backup/DR tooling | `backup-db.js`, `disaster-recovery.md` | Phase 20 | IMPLEMENTED in repo; key management gap documented | encrypted backup undecryptable |
| Legacy archive of old site | `old lake group website/` | 2026-09-17 | HISTORICAL | archived reference only |
| lake-3d Next.js experiment | `lake-3d/` | — | DISCONNECTED (orphan) | not referenced by public site |
| Firebase hosting scripts | `package.json` serve/deploy | initial | DEPRECATED | superseded by Vercel |
| Samsung-specific device testing | — | — | NEEDS USER CONFIRMATION | generic mobile viewports only |
| Internship dates/duration | — | — | NEEDS USER CONFIRMATION | repo window 2026-07-05→09-25 |
| Org HR hierarchy | — | — | NEEDS USER/COMPANY INFORMATION | only company-ownership chart exists |

---

*End of dossier. Generated from repository forensics on 2026-09-25 at HEAD `ba4f197`.*
