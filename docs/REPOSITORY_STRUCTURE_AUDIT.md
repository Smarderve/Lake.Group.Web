# Repository Structure Audit

**Date:** 2026-08-14
**Scope:** Root-directory inventory + categorization per the Professional Project File Structure Cleanup Plan (Phase 1).

## Hosting model (why most root files cannot move)

The public website is **static HTML served from the repository root by Vercel**
(`vercel.json`, `cleanUrls: false`). Consequence:

- Every `.html` file at root is a **public URL** (`/about.html`, `/lake-agro.html`, …).
- `sw.js` (service worker, scope `/`), `manifest.webmanifest`, `robots.txt`,
  `sitemap.xml`, `favicon.ico`, `404.html`, `offline.html` are **web-root files**
  with public-URL requirements — they must stay at root.
- `vercel.json` headers reference `/public-content/…` and `/assets/…` paths.

**All 47 root HTML pages stay at root.** They are production pages, canonicalized
(`<link rel="canonical">`), indexed by search engines, and linked from navigation
(templates in `scripts/templates/nav.html` propagated across pages).

## Root inventory

### Must remain at root (required configuration / web root)

| Path | Type | Purpose | Referenced by |
|---|---|---|---|
| `package.json` / `package-lock.json` | config | npm scripts, deps | build, CI |
| `.gitignore` | config | ignore rules | git |
| `.env.local` | config | local env (gitignored) | tooling |
| `vercel.json` | config | static hosting, redirects, headers | Vercel deploy |
| `lighthouserc.json` | config | Lighthouse CI budget | `.github/workflows/lighthouse.yml` (`lhci autorun` auto-discovers it) |
| `skills-lock.json` | config | agent-skills lockfile | `npx skills` tooling |
| `sw.js` | web root | service worker | `vercel.json` headers; all pages (PWA) |
| `manifest.webmanifest` | web root | PWA manifest | `vercel.json` headers; pages |
| `robots.txt` | web root | SEO | search engines |
| `sitemap.xml` | web root | SEO | search engines |
| `favicon.ico` | web root | favicon | pages |
| `404.html` / `offline.html` | web root | error/offline pages | hosting + SW |
| `README.md` | doc | repo overview | tooling convention (must stay at root) |
| `*.html` (47 pages) | public pages | website routes | nav, sitemap, canonical URLs |

### Moved (this cleanup)

| Old path | New path | Reason | References updated |
|---|---|---|---|
| `chat.md` | `docs/project/chat.md` | planning note, was publicly served | n/a (no refs) |
| `chat-summary.md` | `docs/project/chat-summary.md` | planning note | n/a (no refs) |
| `QA_REPORT.md` | `docs/qa/QA_REPORT.md` | QA report | `scripts/_update_stats_remove_ex.js` + `docs/developer-guide.html` tree |
| `DATA_GAPS.md` | `docs/reports/DATA_GAPS.md` | content-gap report | prose mentions only (names remain findable) |
| `FLAGSHIP_DESIGN.md` | `docs/design/FLAGSHIP_DESIGN.md` | design doc | `docs/developer-guide.html` tree + prose |
| `DEVELOPER_GUIDE.pdf` | `docs/development/DEVELOPER_GUIDE.pdf` | exported guide | n/a (no refs) |
| `Lake_Group_Company_Profile.docx` | `docs/reference/company/Lake_Group_Company_Profile.docx` | stale duplicate of `docs/Lake_Group_Company_Profile.docx` (generated canonical; different hash = older revision) | n/a (generator writes to `docs/`) |
| `LAKE_GROUP_PRESENTATION.pptx` | `docs/reference/company/LAKE_GROUP_PRESENTATION.pptx` | company reference deck | n/a (no refs) |
| `_probe_styles.js` | `scripts/_probe_styles.js` | one-off diagnostic | n/a (no refs) |
| `_run_grep.js` | `scripts/_run_grep.js` | one-off diagnostic | n/a (no refs) |
| `pages-map.png` | `docs/qa/pages-map.png` | QA artifact (unreferenced; `assets/images/pages-map.png` is the canonical image copy) | n/a (no refs) |

## Files investigated and intentionally NOT moved

| Path | Decision | Evidence |
|---|---|---|
| `dashboard.html` | **Keep at root** | Real page: canonical URL `/dashboard.html`, its own console `assets/dashboard-cms.js`, excluded from seed content in `backend/scripts/seed-content.js` |
| `lake-group-financial-dashboard.html`, `lake-group-org-chart.html` | Keep at root | production pages (in nav/sitemap) |
| `leadership-*.html` (7 profiles) | Keep at root | public canonical URLs; CMS-driven migration is a separate content-architecture task (Plan Phase 10), not folder cleanup |
| `lake-*.html` (11 company pages) | Keep at root | public URLs; CMS-driven migration is a separate task (Plan Phase 11) |
| `assembly-tech.html`, `agrinova-tech.html`, `nextdrive-motors.html` | Keep at root | Automotive sector pages added 2026-08-14 |
| `skills-lock.json` | Keep at root | agent-tooling lockfile; moving breaks `npx skills` |
| `lighthouserc.json` | Keep at root | `lhci autorun` auto-discovers it at cwd; moving breaks CI |

## Content-architecture candidates (separate task, not executed)

Per Plan Phase 28, hardcoded-HTML content that should eventually be CMS-driven,
kept here for traceability (NOT migrated as part of this cleanup):

- News (`news.html`, `news-article.html`, `assets/news-*.js`)
- Leadership profiles (`leadership-*.html`)
- Projects (`projects.html`)
- Services directory (`services.html`, `contact.html` company rows)
- Company/business pages (`lake-*.html`)
- Media center (`media-center.html`)

These already consume governed API data where applicable (`assets/registry-api.js`,
`assets/metrics-api.js`, `assets/news-api.js`); the remaining static files are
candidates for the CMS content migration plan.
