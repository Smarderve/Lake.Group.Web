# Lake Group repository root-directory audit

**Audit date:** 2026-09-07  
**Branch:** `main`  
**Restore point:** `restore-before-full-root-audit-20260907-153757` at `8bc1613cd6ed1ab743b71c256fbf353c021861c9`  
**Scope:** complete repository tree, runtime boundaries, public routes, data sources, tooling, deployment, SEO, tests, generated material, duplicates, and cleanup candidates.  
**Change policy:** audit/documentation only. No application file was moved, deleted, renamed, or behaviorally changed by this audit.

## Executive result

This repository is a static, root-served public website with separate backend and CMS applications. The root HTML pages, root web files, and `assets/` are the public delivery surface. `backend/` is an Express/PostgreSQL/Prisma service and `cms/` is a React/Vite administration application; neither is required for a browser to render the static HTML shell.

The repository currently contains **72 root-level files**, **17 root-level directories**, and **2,079 tracked files**. A recursive non-dependency inventory returned **2,011 project paths** when ignored machine state and `test-results/` were excluded from the top-level grouping. The difference is expected: the recursive inventory includes nested files, while the root count is only immediate children.

The current production policy says the frontend is the temporary source of truth and must remain disconnected from CMS/backend and public-snapshot content overrides. The live backend/CMS are not directly consumed by ordinary page markup, but the shared public frontend still loads `assets/public-content.js` through `assets/site.js`; that module fetches `public-content/current.json` and a release snapshot and may apply page metadata. This is a **policy follow-up / architectural inconsistency**, not changed during this audit.

## 1. Root inventory

### Root directories

| Path | Classification | Purpose / necessity |
|---|---|---|
| `.agents/` | Tooling / not runtime | Local agent skills and instructions. Not website runtime. |
| `.claude/` | Tooling / not runtime | Local assistant skill mirror. Not website runtime. |
| `.freebuff/` | Ignored machine state | Workspace/project metadata. Not committed or deployable. |
| `.git/` | Repository metadata | Git history, refs, index, and hooks. Required for version control only. |
| `.github/` | Required CI/CD | Seven workflows for accessibility, backend, CMS, Lighthouse, public release, public website, and security checks. |
| `.superpowers/` | Ignored tooling state | Local planning/agent state. Not deployable. |
| `assets/` | Required public runtime | Shared CSS, JavaScript, fonts, icons, images, vendor bundles, maps, animation data, and page assets. |
| `backend/` | Separate application | Express API, Prisma schema/migrations, seeds, security, tests, backups, and public-release service. Not a browser dependency under the current frontend policy. |
| `cms/` | Separate application | React/Vite authenticated CMS consuming backend APIs. Not public-site runtime. |
| `docs/` | Documentation / QA / reference | Audits, design notes, security records, QA screenshots, reports, plans, and company references. |
| `lake-3d/` | Separate/needs investigation | Self-contained Next/TypeScript 3D application with its own package and public/source trees. No root-page runtime reference was established in this audit. |
| `lake-story-assets/` | Compatibility / legacy asset source | Eight story scene images. `vercel.json` redirects the legacy URL prefix to `assets/images/our-story/`; preserve until redirect and asset ownership are deliberately retired. |
| `node_modules/` | Generated local dependency tree | Installed npm dependencies. Ignored; never deploy as source or commit. |
| `public-content/` | Transitional snapshot delivery | `current.json` plus three immutable release files. Served with explicit Vercel cache headers and consumed by `assets/public-content.js`. |
| `scripts/` | Maintenance/build/QA | Build, SEO, snapshot, cache, migration, asset, verification, and historical one-off scripts. Contains generated QA/probe material that needs eventual curation. |
| `test-results/` | Generated local test output | Playwright/test-run state; currently untracked (`.last-run.json`). Not runtime. |

### Root files

#### Required public web-root files

`404.html`, `offline.html`, `favicon.ico`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `sw.js`, and `llms.txt` are web-root files. Root placement is part of their URL contract. `index.html` is the home document for `/`; the remaining root HTML documents are direct public URLs because Vercel serves the repository root with `outputDirectory: "."` and `cleanUrls: false`.

#### Public HTML route files

The repository contains **43 root HTML files**. They are classified individually below. All currently declare `noindex,nofollow`; that affects discoverability but does not remove their public URL or their need to remain at root.

| Route file | Purpose | Status |
|---|---|---|
| `index.html` | Lake Group home / Africa network experience | ACTIVE — REQUIRED |
| `about.html` | Group overview | ACTIVE — REQUIRED |
| `our-story.html` | Group story | ACTIVE — REQUIRED |
| `history.html` | Corporate history | ACTIVE — REQUIRED |
| `leadership.html` | Leadership listing | ACTIVE — REQUIRED |
| `leadership-ally-edha-awadh.html` | Founder/chairman profile | ACTIVE — REQUIRED |
| `csr.html` | CSR and sustainability | ACTIVE — REQUIRED |
| `sustainability.html` | Sustainability surface / under-construction treatment | ACTIVE — REQUIRED |
| `projects.html` | Major projects | ACTIVE — REQUIRED |
| `gallery.html` | Group gallery | ACTIVE — REQUIRED |
| `media-center.html` | Media center | ACTIVE — REQUIRED |
| `careers.html` | Careers | ACTIVE — REQUIRED |
| `contact.html` | Contact | ACTIVE — REQUIRED |
| `station-locator.html` | Lake Oil station locator | ACTIVE — REQUIRED |
| `fleet.html` | Lake Trans fleet | ACTIVE — REQUIRED |
| `dashboard.html` | Legacy/static CMS console entry page | INTERNAL / ADMIN — KEEP until console migration is explicit |
| `lake-oil.html` | Lake Oil | ACTIVE — REQUIRED |
| `lake-aviation.html` | Lake Aviation | ACTIVE — REQUIRED |
| `lake-gas.html` | Lake Gas | ACTIVE — REQUIRED |
| `lake-lubes.html` | Lake Lubes | ACTIVE — REQUIRED |
| `lake-trans.html` | Lake Trans | ACTIVE — REQUIRED |
| `lake-steel.html` | Lake Steel | ACTIVE — REQUIRED |
| `lake-pipes.html` | Lake Pipes | ACTIVE — REQUIRED |
| `lake-buildings.html` | Lake Building Solution | ACTIVE — REQUIRED |
| `lake-cylinders.html` | Lake Cylinders | ACTIVE — REQUIRED |
| `lake-premix-cement.html` | Lake Premix | ACTIVE — REQUIRED |
| `gulf-aggregates.html` | Gulf Aggregates | ACTIVE — REQUIRED |
| `aficd.html` | AFICD | COMPATIBILITY / REDIRECT — Vercel redirects to `/index.html`; preserve until redirect retirement is approved |
| `acfs.html` | ACFS | COMPATIBILITY / REDIRECT — Vercel redirects to `/index.html` |
| `atl.html` | ATL | COMPATIBILITY / REDIRECT — Vercel redirects to `/index.html` |
| `ocean-galleria.html` | Waterfront Mall / Ocean Galleria | COMPATIBILITY / REDIRECT — Vercel redirects to `/index.html` |
| `aill.html` | AILL | ACTIVE — REQUIRED |
| `cross-country.html` | Cross Country Developer | ACTIVE — REQUIRED |
| `agrinova-tech.html` | Agrinova Tech | ACTIVE — REQUIRED |
| `assembly-tech.html` | Assembly Tech / ATL manufacturing | ACTIVE — REQUIRED |
| `nextdrive-motors.html` | NextDrive Motors | ACTIVE — REQUIRED |
| `la-home.html` | Legacy Lake Agro home URL | COMPATIBILITY / REDIRECT — redirects to `/lake-agro.html` |
| `la-projects.html` | Legacy Lake Agro projects URL | COMPATIBILITY / REDIRECT — redirects to `/lake-agro.html` |
| `lake-agro.html` | Lake Agro | ACTIVE — REQUIRED |
| `lake-group-financial-dashboard.html` | Financial dashboard | ACTIVE / INTERNAL CONTENT — keep pending ownership decision |
| `lake-group-org-chart.html` | Organisational chart | ACTIVE / INTERNAL CONTENT — keep pending ownership decision |
| `404.html` | Not-found page | WEB-ROOT — REQUIRED |
| `offline.html` | Service-worker offline fallback | WEB-ROOT — REQUIRED |

#### Root configuration, policy, and references

| Files | Purpose | Classification |
|---|---|---|
| `.env.example` | Root environment-name template | CONFIG — keep; contains names only, not secrets |
| `.gitattributes`, `.gitignore` | Git behavior and ignore policy | CONFIG — REQUIRED |
| `AGENTS.md` | Repository instructions | PROJECT POLICY — REQUIRED for agents |
| `package.json`, `package-lock.json` | Root scripts and frontend/tool dependencies | CONFIG — REQUIRED |
| `vercel.json` | Static output, redirects, headers, CSP, cache policy | DEPLOYMENT — REQUIRED |
| `lighthouserc.json` | Lighthouse CI configuration discovered at root | CI CONFIG — REQUIRED at root |
| `skills-lock.json` | Agent-skills lockfile | TOOLING CONFIG — keep at root |
| `README.md` | Repository overview and operating notes | DOCUMENTATION — keep at root |
| `chat.md`, `chat-summary.md` | Historical planning/conversation notes | DOCUMENTATION — should remain in `docs/project/`; root copies are stale/legacy candidates, not runtime |
| `DATA_GAPS.md`, `QA_REPORT.md`, `FLAGSHIP_DESIGN.md` | Historical report/design files | DOCUMENTATION — canonical organized copies also exist under `docs/`; investigate duplicates before any removal |
| `DEVELOPER_GUIDE.pdf`, `Lake_Group_Company_Profile.docx`, `LAKE_GROUP_PRESENTATION.pptx` | Company/developer references | REFERENCE — canonical organized copies exist under `docs/`; compare hashes and preserve until confirmed |
| `pages-map.png` | QA/reference image | QA ARTIFACT — organized copy exists under `docs/qa/` |
| `_hero_original.js`, `_probe_styles.js`, `_run_grep.js`, `verify_careers.py` | Root probes/verification leftovers | ONE-OFF / NEEDS CURATION — not referenced by the root build contract |

## 2. Runtime architecture and data flow

### Public frontend

- Root HTML is the delivery unit; shared behavior is loaded from `assets/`.
- Shared chrome and behavior are distributed through `assets/site.js`, `assets/phase-01-navbar.js`, `assets/phase-01-footer.css`, `assets/tokens.css`, `assets/theme.css`, `assets/flagship.css`, `assets/mobile.css`, i18n files, motion files, and page-specific assets.
- Page copy and layout are predominantly present in static HTML and local frontend data/configuration.
- The root build is SEO/static generation: `npm run build` runs `scripts/build-seo-foundation.mjs`, `scripts/build-sitemap.js`, and `scripts/build-llms.mjs`.
- `assets/analytics.js`, `assets/assistant.js`, `assets/registry-api.js`, `assets/metrics-api.js`, and `assets/dashboard-cms.js` contain optional/API-aware capabilities. They are separate from the static HTML rendering path, and API behavior is conditional/configured rather than a CMS requirement for initial HTML.

### Backend

`backend/` is an Express 5 service using PostgreSQL and Prisma. It contains:

- `src/routes/` for auth, admin, governed content, public reads, metrics, media, notifications, preview, review queues, schedules, and public releases.
- `src/lib/` for governance, registry configuration, content health, knowledge, release generation, storage, analytics, and security support.
- `prisma/schema.prisma` and 14 migrations for persisted models and workflow/version/audit history.
- `scripts/` for seed, verification, health, migration, backup/restore, load, security, and development operations.
- `tests/` for route, governance, security, integration, health, and data behavior.

Backend content is authoritative for future synchronized operation and is represented by schema/seed/migration files, but current public frontend policy says it must not overwrite frontend page content.

### CMS

`cms/` is a separate React/Vite/TypeScript application. Its `src/` tree contains routing, auth, settings, admin, collection editors, workflow components, preview, companies, products, news, careers, geography, media, publishing, and API clients. `cms/vite.config.ts` proxies `/api` to the backend in development. It is an authenticated management surface, not a public static-site dependency.

### Snapshot/public-content system

`public-content/current.json` points to one of three immutable release files under `public-content/releases/`. `vercel.json` gives these files JSON content types and cache policies. `assets/public-content.js` fetches the manifest and selected release, exposes `window.LakePublicContent`, and applies page metadata. `assets/site.js` bootstraps that module before other feature modules; `assets/africa-network-map.js` also awaits it for map data. This is a same-origin release snapshot, not a live CMS request, but it is still a frontend snapshot hydration path and therefore conflicts with the current explicit policy that public snapshot hydration remain disabled.

### Current approved policy boundary

The intended phase boundary is:

```text
static/local frontend content -> public HTML rendering
backend seeds/schema/records <-> CMS records/workflow -> future synchronized source
```

The public frontend must not be changed to consume live CMS/backend data, and the snapshot loader must not be re-enabled or expanded. The existing snapshot path is recorded as a follow-up finding only; this audit did not modify it.

## 3. Internationalization and shared data

`assets/i18n.js`, `assets/i18n-content.js`, `assets/i18n-content.json`, and the language build scripts provide multilingual page strings and language switching. `assets/i18n-content.js.bak` is an explicitly stale backup and should not be treated as an active source. The `scripts/build_*_lang.js`, `build_i18n_content.py`, `i18n_extract.py`, `translation_dict.py`, and related QA scripts are generation/verification tooling.

Important duplication zones are:

- page text in root HTML;
- translation strings in `assets/i18n-content.js` and JSON;
- backend mirror seed data in `backend/scripts/content-seed-data.js`, `seed-content.js`, and `seed-metrics.js`;
- CMS entity definitions and API types under `cms/src/`;
- public snapshot releases under `public-content/`;
- SEO metadata/configuration in `scripts/seo-config.mjs`, `scripts/seo-page-metadata.mjs`, generated root SEO files, and page `<meta>` tags.

When approved content changes are made in future, update the visible frontend first, then repository-controlled backend seeds/schema/fixtures, CMS definitions/fixtures, snapshot source, and SEO/schema references as applicable—without reconnecting frontend hydration.

## 4. Assets

The `assets/` tree contains **723 files** in the project-path inventory. Extension totals are approximately: 256 JPG, 187 WebP, 98 PNG, 34 JavaScript, 27 SVG, 19 WOFF2, 19 WOFF, 17 source maps, 16 CSS, 15 MJS, 14 JSON, 10 other raster/vector/data formats, and a small number of JSX/TS/MTS/Lottie/WASM/backup files.

| Asset area | Purpose / status |
|---|---|
| `assets/images/` | Page imagery, company logos, gallery/news/operations photos, and content media. Runtime-required where referenced; duplicates require visual/context review before removal. |
| `assets/icons/` | PWA, sector, UI, and Lottie/icon assets. Some obsolete sector icon files are currently deleted in the worktree by an earlier task; this audit did not stage or restore them. |
| `assets/animations/`, `assets/vendor/` | Local animation/runtime libraries and bundles. Required only where referenced; vendor files should be updated as dependency artifacts, not hand-edited. |
| `assets/fonts/` | Self-hosted Jost, Playfair, Material Symbols, and related font files. Required for approved typography. |
| `assets/hero-globe/` | Globe textures/data/build artifacts for the home experience. |
| `assets/components/` | Reusable component/media material. |
| top-level `assets/*.js`, `*.css`, `*.json`, `*.svg` | Shared frontend runtime, design tokens, navigation/footer, i18n, SEO-adjacent data, PWA, assistant, analytics, and page behavior. |

SHA-256 comparison found **95 duplicate-hash groups among tracked files**. Many are intentional vendor source maps, repeated QA screenshots, identical logo variants used by separate applications, or duplicate source/reference copies. Notable review groups include `assets/images/logos/LAKE_GROUP_LOGO.png` with `assets/images/logos/company/LAKE_GROUP_LOGO.png` and `cms/src/assets/lake-logo.png`, repeated Cross Country logo variants, repeated CCP/GCCP photos, and root/document copies such as `FLAGSHIP_DESIGN.md` and `docs/design/FLAGSHIP_DESIGN.md`. Hash equality alone is not sufficient evidence for deletion because URL, crop, alpha channel, and ownership may differ.

## 5. Scripts and generated material

`scripts/` contains **251 direct files** plus nested directories. Approximately **200 direct files are underscore-prefixed**, indicating one-off probes, migration attempts, QA notes, caches, generated outputs, or historical repair scripts. The maintained build/verification family includes SEO builders, sitemap/llms builders, hero-globe build, public snapshot generation, cache consistency checks, secret scan, crawl/SEO verification, root-structure check, and performance/QA checks.

Generated or machine-state candidates include:

- `scripts/_chrome_profile_globe/` — browser profile/cache state, ignored by `.gitignore`.
- `scripts/_qa_screens/`, `scripts/_scraped/`, `_coverage.json`, `_verify_*.json`, `_live_verify_out.json`, `_sw_out_*.json` — QA/probe outputs and captured data.
- `scripts/_lp_bodies/` and other underscore directories — historical one-off outputs.
- `node_modules/` and `test-results/` — generated local state.

These were not deleted or moved because the request is audit-only and existing worktree state must be preserved.

## 6. Tests and quality gates

The root `tests/` tree contains **74 files**: 71 `.js` and 3 `.mjs`, covering public delivery/snapshot, skeleton loading, navbar/footer/launch/responsive behavior, home/globe/performance, SEO/crawl/cache/PWA, i18n, accessibility, production update lifecycle, and content consistency. `backend/tests/` contains 47 files; `cms/test/` and `cms/e2e/` cover CMS type, unit, critical-flow, visual, and performance behavior.

Root package scripts expose the main gates:

- public delivery and skeleton checks;
- navbar/footer/launch/responsive/home/public-page suites;
- SEO/crawl/secret/cache/performance/reload/production-update checks;
- public snapshot generation;
- Lighthouse CI through `.github/workflows/lighthouse.yml`.

No application tests were run as part of this documentation-only audit. The appropriate structure checks after a future structure migration remain `npm run test:public-delivery`, `npm run test:skeleton`, `npm run secret:scan`, and `node scripts/check-root-structure.mjs`.

## 7. Deployment, URL, and SEO audit

- Vercel serves the repository root as static output with `outputDirectory: "."`.
- `vercel.json` preserves legacy redirects for old company, leadership, sector, and Lake Agro URLs. Those redirects make some root HTML files compatibility surfaces rather than ordinary navigation destinations.
- Root HTML, shared assets, images/icons, web fonts, snapshot JSON, `sw.js`, and the manifest have explicit cache policies.
- CSP, `nosniff`, referrer policy, permissions policy, frame-ancestor, worker, manifest, and media directives are configured in `vercel.json`.
- `robots.txt` currently contains `Disallow: /`, so the preview is intentionally not crawlable.
- `sitemap.xml` is currently an empty URL set; `llms.txt` states that no official public domain is configured. These are intentional preview/SEO-release blockers, not missing generated files.
- `manifest.webmanifest` identifies `/index.html` as the app start URL and references local PWA icons.
- `sw.js` controls root-scope offline behavior and precaches selected HTML/assets. It must be version-bumped when precached delivery changes.

## 8. Removed-page and stale-reference audit

The current tree does not contain `news.html`, `news-article.html`, `investor-relations.html`, or `operations-map.html` root pages. Vercel and historical documentation still contain references to some removed concepts, and backend/CMS still model news and operations-map content because they are backend/CMS domains. QA screenshots also include historical `news`, `investors`, and `africa-network` names. These are evidence of history or backend capability, not proof that those public root pages should be recreated.

The old `docs/REPOSITORY_STRUCTURE_AUDIT.md` is dated 2026-08-14 and describes a previous 47-page state, including pages no longer present. It should be treated as historical audit evidence; this document is the current full-root audit.

## 9. Git state, ignored files, and restore safety

Before the audit, the repository was on `main` at `8bc1613`. A restore tag was created before documentation changes:

```text
restore-before-full-root-audit-20260907-153757
8bc1613cd6ed1ab743b71c256fbf353c021861c9
```

Pre-existing worktree changes were preserved and intentionally not staged. They include many root HTML line-ending/content-status modifications, deleted icon/logo/image paths, an existing unrelated navbar CSS deletion, a modified navbar test, the untracked ATL image, and untracked `test-results/.last-run.json`. Ignored state includes `.freebuff/`, `.superpowers/` state, and `node_modules/`.

Environment files were inventoried by name only: `.env.example`, `backend/.env.example`, `backend/.env.render.staging.example`, `cms/.env.example`, and `cms/.env.production.example`. No environment-file contents or secrets were copied into this report.

## 10. Status classification summary

| Status | Examples |
|---|---|
| ACTIVE — REQUIRED | root home/corporate/company pages, `assets/`, shared runtime CSS/JS, fonts, selected images, `package.json`, `vercel.json`, service worker |
| ACTIVE — KEEP | backend, CMS, tests, maintained build/SEO scripts, documentation used by CI/release, compatibility routes |
| COMPATIBILITY / LEGACY | redirect-target HTML files, `lake-story-assets/`, old Lake Agro URLs, historical root documents with organized copies |
| GENERATED / LOCAL | `node_modules/`, `test-results/`, browser profile/cache, QA screenshots, scraped/probe outputs, source maps where they are build artifacts |
| NEEDS INVESTIGATION | `lake-3d/`, duplicated reference files, duplicate image/logo groups, root one-off scripts, snapshot hydration path, dashboard ownership, obsolete backend/CMS domains |
| MUST NOT REMOVE WITHOUT URL/BUILD REVIEW | any root `.html`, `sw.js`, manifest, favicon, robots/sitemap/llms, `vercel.json`, `lighthouserc.json`, `skills-lock.json`, shared assets, redirect-compatible files |

## 11. Recommendations (no cleanup executed)

1. Keep the root public URL contract intact. Do not move root HTML or web-root files without an explicit redirect and delivery-test plan.
2. Treat `docs/REPOSITORY_STRUCTURE_AUDIT.md` as historical and use this report as the current baseline.
3. In a separate approved cleanup task, inventory and retire one-off `scripts/_*` material in small reviewable groups; never bulk-delete it.
4. Decide ownership of `lake-3d/`, the internal dashboards, legacy redirect pages, and root/document duplicate references before changing them.
5. Resolve duplicate assets by reference tracing and visual/alpha/crop checks, not by hash alone.
6. Under the current data-source policy, remove or disable public snapshot metadata hydration only in a separate explicitly authorized implementation task; do not reconnect it to live CMS/backend content.
7. Keep backend/CMS seeds, schema, fixtures, and SEO/snapshot source representations synchronized for approved content changes while leaving frontend rendering static/local.

## 12. Audit conclusion

The repository is structurally understandable but contains a large historical/QA/tooling tail alongside the active static site. No deletion, move, rename, source behavior change, CMS synchronization, or live database/CMS update was performed. The main concrete follow-up is policy alignment for the existing public snapshot loader, followed by a separately approved, reference-driven cleanup of generated and legacy material.

