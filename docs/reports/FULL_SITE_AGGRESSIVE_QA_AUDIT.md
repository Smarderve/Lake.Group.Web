# FULL-SITE AGGRESSIVE QA AUDIT

Audit date: 2026-08-28  
Live target: https://lakegroup.vercel.app/  
Mode: discovery and root-cause analysis only. No production behavior was fixed.

## 1. Executive summary

The live deployment is reachable and sampled pages report the same build marker (`2026-08-28.01`), so this audit did not reproduce mixed build identifiers. It did, however, find repeated live asset 404s, a shared dotLottie WASM/CSP failure, a root-scoped service worker with precache risk, and materially heavy Home/Gallery transfers. The largest immediate user-facing risks are broken imagery on Gallery/Lake Oil/Projects/Station Locator and animation failures on five public routes.

The local crawl also found legacy direct-access pages with missing dependencies, missing placeholder logos, a transformed narrow-screen element outside the viewport, and duplicate shared reveal initialization. These are latent or code-only risks until independently confirmed in production.

## 2. Counts

- Repository files inventoried: 2,102
- Root public HTML pages crawled locally: 47
- Local route/viewport runs: 89
- Live key route/viewport runs: 105 across 21 routes
- Bugs recorded: 24
- SEV-1: 0 reproduced
- SEV-2: 10
- SEV-3: 13
- SEV-4: 1

The absence of a reproduced SEV-1 does not clear the reported freeze/cache incident; Firefox/WebKit and a 20-reload cross-profile stress run were unavailable in this environment.

## 3. Scope and method

The repository inventory covered HTML, CSS, JavaScript, JSON, images, fonts, configuration, service-worker files, animations, tests, documentation, and public assets. A Playwright Chromium crawler recorded navigation errors, console errors/warnings, HTTP failures, failed requests, overflow, duplicate IDs, old terminology, resource counts/bytes, largest resources, FCP/LCP where available, DOMContentLoaded, and load timing.

Live routes sampled included Home, About, Leadership, History, Gallery, Contact, News, Careers, Corporate, CSR, Investors, Africa Network/Operations, Projects, Station Locator, Lake Oil, Lake Gas, Lake Lubes, Lake Agro, Lake Steel, AFICD, and an under-construction route. Local crawling included all 47 root HTML pages.

## 4. Bug register

The complete machine-readable register, with reproduction, expected/actual behavior, source files, root cause, and recommended fix for every finding, is in [FULL_SITE_BUGS.json](FULL_SITE_BUGS.json). Summary:

| ID | Severity | Affected area | Classification |
|---|---|---|---|
| QA-001 | SEV-2 | Gallery | Live 404 / asset mapping |
| QA-002 | SEV-2 | Gallery | Live 404 / asset mapping |
| QA-003 | SEV-2 | Gallery, Lake Oil | Live 404 / missing poster |
| QA-004 | SEV-2 | Gallery, Station Locator | Live 404 / wrong extension |
| QA-005 | SEV-3 | Gallery | Live 404 / stale slide |
| QA-006 | SEV-2 | Projects | Live 404 / shared mapping |
| QA-007 | SEV-2 | Lake Oil | Live 404 / missing optimization output |
| QA-008 | SEV-2 | News, Careers, CSR, Investors, Africa Network | Live runtime/CSP |
| QA-009 | SEV-2 | Home | Live performance/resource size |
| QA-010 | SEV-2 | Gallery | Live performance plus 404s |
| QA-011 | SEV-2 | Sitewide | Live/code service-worker risk |
| QA-012 | SEV-3 | Sitewide | Code-only precache manifest risk |
| QA-013 | SEV-3 | Africa Network | Visible terminology inconsistency |
| QA-014 | SEV-3 | Contact | Public-copy terminology ambiguity |
| QA-015 | SEV-3 | Africa Network | Lottie fallback/runtime |
| QA-016 | SEV-3 | Video pages | Direct YouTube loading inconsistency |
| QA-017 | SEV-3 | Three company pages | Local latent missing logo |
| QA-018 | SEV-3 | Legacy Lake Agro pages | Local latent missing dependencies |
| QA-019 | SEV-3 | Shared startup | Duplicate reveal initialization |
| QA-020 | SEV-3 | Shared PWA layer | Load/update lifecycle risk |
| QA-021 | SEV-3 | Local 404 | Narrow transformed rect |
| QA-022 | SEV-3 | Lake Steel | Aborted mobile logo request |
| QA-023 | SEV-3 | Five public routes | Repeated shared Lottie errors |
| QA-024 | SEV-4 | QA infrastructure | Firefox/WebKit/Edge test gap |

## 5. Live production issues

### Broken assets

Gallery produced six failed image requests on every sampled viewport. Missing URLs were `group/ops/terminal-overview.jpg`, `lakeoil/current/fleet-loading.jpg`, `lakeoil/current/depot-terminal.jpg`, `lakeoil/current/lake-energies-station-approved.png`, and `n-slider/7.webp`. Projects repeats the missing terminal image. Lake Oil requests missing depot, fleet, and station-map images, including a broken video-facade poster. Station Locator uses the missing PNG although the repository contains an approved WebP variant.

### Runtime errors

News, Careers, CSR, Investors, and Africa Network each logged dotLottie WASM compilation failures followed by `[dotlottie-web] Initialization failed`. The browser reports that the page CSP permits `self` and inline script but not the runtime’s required WASM evaluation path. This is a shared delivery/runtime issue, not five independent visual defects.

### Performance evidence

Representative live observations:

- Home desktop: approximately 10.33 MB and 100 resources; DOMContentLoaded about 6.4 seconds; the largest sampled resource was `automotive-truck-lineup.png` at about 1.48 MB.
- Home mobile: approximately 7.56 MB.
- Gallery: approximately 9.15–9.93 MB; DOMContentLoaded about 5.9–7.0 seconds; six 404s each run.
- About: approximately 2.79 MB in the sampled desktop run.
- Lake Oil: repeated missing image requests and up to about 3.3 seconds DOMContentLoaded in sampled runs.

These are crawler measurements rather than Lighthouse lab scores. LCP was unavailable in several samples, so it is reported honestly as unavailable rather than inferred.

### Cache and deployment evidence

Live HTML returned `Cache-Control: public, max-age=0, must-revalidate`, with ETag/Last-Modified and Vercel cache headers. The sampled build marker was `2026-08-28.01` across all live runs. A root-scoped service worker was observed installing at `/sw.js?v=73-20260828-01` and creating `lake-precache-v73-20260828-01`; this remains a plausible stale-state risk and requires lifecycle testing. The audit did not remove it.

## 6. Code-only and latent issues

- `sw.js` precaches known missing image URLs; installation skips missing files best-effort.
- `assets/pwa.js` registers sitewide on `window.load` and schedules update checks; its lifecycle can compete with deterministic delivery if not explicitly tested.
- `assets/site.js` invokes shared reveal initialization more than once in the startup path.
- Three company pages reference a missing placeholder logo.
- Legacy Lake Agro direct-access pages reference missing Bootstrap/Font Awesome files and showed many local failures.
- A local 404 route had a visible transformed rectangle extending past the 390px viewport edge despite document `scrollWidth` not exposing it.

## 7. Mobile issues

The Chromium crawler found no document-level horizontal overflow on sampled live routes, but that does not prove all requested widths/engines are safe. The local legacy Lake Agro pages did overflow. Lake Steel had an aborted mobile logo request of uncertain visual impact. Full touch, keyboard, orientation, chat overlap, safe-area, and sector-by-sector mobile interaction testing was not completed in native mobile engines.

## 8. Tablet and desktop issues

The same live 404s and Lottie failures reproduced on desktop/tablet/mobile, indicating shared sources rather than breakpoint-specific defects. Gallery’s high transfer is especially problematic on tablet/mobile. No document-level overflow was recorded in the live representative widths.

## 9. Browser compatibility

Chromium was available and used for all automated browser evidence. Firefox and WebKit were unavailable; native Edge and Safari, Android Chrome, and iPhone Safari were not independently executed. Chromium viewport emulation is not equivalent to native engine/device validation. This limitation is QA-024 and blocks a claim of full browser coverage.

## 10. Navigation and Business Verticals

The crawler visited the canonical navigation on the sampled routes and found consistent build markers. It did not find old terminology through the crawler’s old-term detector in most pages; visible “subsidiaries” wording was found in Africa Network counts, Investors factual copy, and Contact copy. Africa Network is the strongest likely UI/category mismatch; Investors and Contact require source/approval classification before changing factual wording. Full rapid navigation stress, keyboard state transition, and all sector hover/animation assertions remain unverified by native cross-engine testing.

## 11. Content and company pages

The audit identified the escaped/missing asset and terminology findings above. Company-specific canonical content verification against external source documents was not performed in this discovery pass; no unsupported content correction is claimed. Lake Oil is the most concrete company-page issue because its live image set includes multiple 404s. Lake Gas, Lake Lubes, Lake Agro, and AFICD had no additional live HTTP failures in the representative crawl, but require visual/source comparison in the next pass.

## 12. Images, video, Lottie, and logos

The repository contains 50 image records in the crawler’s image inventory. The largest files include QA screenshots and source/reference images above 2 MB, plus production assets such as `lakelubes/products/lake-lubes-drums.png` (about 2.22 MB), `lake-lubes/products/gl5-85w140-5l.png` (about 2.15 MB), `lake-oil/current/station-lake-energies.png` (about 2.09 MB), and multiple 1.5–2.0 MB hero/reference images. The inventory intentionally includes docs/QA screenshots; production-serving status must be distinguished before optimization.

Direct YouTube iframe behavior remains inconsistent on pages including Africa Network and related company pages. The shared dotLottie loader fails under the live CSP on five routes. Logo correctness was not fully mapped visually across every context; the missing/aborted logo requests are recorded individually.

## 13. Accessibility, SEO, and HTML validity

The crawler recorded duplicate IDs and overflow at document level when present; no live duplicate-ID finding was produced in the representative data. A complete axe audit, manual keyboard pass, screen-reader pass, HTML validator pass, JSON-LD validation, and all metadata/canonical/OG comparison were not available in the current run. These are explicit coverage gaps, not claims of compliance.

## 14. Loading, skeletons, chat, and freeze investigation

The source review found the shared skeleton/PWA/reveal systems and the Lottie runtime as likely contributors to delayed rendering or late errors. The crawler did not reproduce a page remaining permanently blank, but the Home/Gallery transfer sizes and shared animation initialization errors are credible contributors to slow/incomplete experiences. A CPU-throttled long-task trace, 20-reload cache stress test, and full DevTools waterfall under Fast 3G/Slow 4G were not completed, so no exact main-thread freeze root cause is claimed.

## 15. Dead code, legacy files, and test gaps

The inventory found 68 HTML files recursively, 28 CSS files, 368 JS files, and 55 JSON files. The project has legacy direct-access pages and missing legacy dependencies. Existing automated test coverage did not substitute for live multi-engine visual QA. Recommended ongoing checks are in [FULL_SITE_FIX_PRIORITY.md](FULL_SITE_FIX_PRIORITY.md): verified asset references/precache, duplicate critical scripts/styles, console errors, overflow, build consistency, and native browser coverage.

## 16. Top 20 highest-priority fixes

1. Repair Gallery terminal, fleet, depot, station, and slider asset references.
2. Repair Projects terminal imagery.
3. Repair Lake Oil imagery and facade poster.
4. Repair Station Locator station image extension.
5. Resolve dotLottie CSP/WASM initialization.
6. Add a tested static animation fallback.
7. Validate the service-worker update and stale-cache lifecycle.
8. Remove missing assets from the precache manifest.
9. Reduce/stage Home’s initial image and logo requests.
10. Stage/optimize Gallery imagery.
11. Audit all direct YouTube embeds and apply the approved facade policy.
12. Make reveal initialization idempotent.
13. Reproduce Lake Steel’s aborted logo request.
14. Repair or deliberately retire legacy Lake Agro direct-access pages.
15. Repair missing placeholder logos.
16. Review Africa Network terminology.
17. Review Contact terminology against approved source language.
18. Run full native Firefox/WebKit/Edge/Safari matrix.
19. Run axe, HTML, metadata, JSON-LD, and keyboard audits.
20. Add release-blocking QA automation for SEV-1/SEV-2 findings.

## 17. Root-cause summary and recommended order

The dominant causes are stale/wrong asset mapping, incomplete optimized asset output, shared Lottie runtime/CSP incompatibility, service-worker lifecycle risk, and insufficient release-time cross-page asset validation. Fix in the order WAVE 1 through WAVE 7 in the priority plan, starting with broken live requests and shared runtime failures, then delivery/performance, mobile/native browser coverage, content, accessibility/SEO, and cleanup.

## 18. Files most responsible for regressions

- `gallery.html`
- `lake-oil.html`
- `projects.html`
- `station-locator.html`
- `sw.js`
- `assets/pwa.js`
- `assets/site.js`
- `assets/vendor/dotlottie-web/index.js`
- `assets/under-construction.js`
- `assets/i18n-content.json`
- `assets/i18n-content.js`

## 19. Pages most affected

Gallery is the worst affected by repeated 404s and weight. Lake Oil, Projects, and Station Locator have broken imagery. News, Careers, CSR, Investors, and Africa Network share the Lottie runtime failure. Home has the largest sampled initial transfer.

## 20. Screenshot index

Representative Chromium evidence captured during the audit:

- `docs/reports/screenshots/live-gallery-desktop.png`
- `docs/reports/screenshots/live-home-mobile.png`
- `docs/reports/screenshots/live-operations-mobile.png`

These are representative screenshots, not proof of unavailable Firefox/WebKit/native-device coverage.

## 21. Test commands and evidence files

- `node scripts/full-site-audit.mjs`
- `git diff --check` (run before handoff)
- `npm.cmd run test:public-delivery` — PASS (3 tests)
- `npm.cmd run secret:scan` — PASS (781 files)
- `node scripts/check-root-structure.mjs` — completed with 18 pre-existing root-entry warnings
- `npm.cmd run test:skeleton` — NOT COMPLETED within the run window; interrupted after no test result
- `docs/reports/full-site-audit-data.json`
- `scripts/full-site-audit.mjs`

The crawler was run against a local static server and the live Vercel origin with service workers blocked for deterministic page measurements; a separate service-worker probe confirmed the live registration. No production code was modified.

## 22. Live URLs tested

`/`, `/about.html`, `/leadership.html`, `/history.html`, `/gallery.html`, `/contact.html`, `/news.html`, `/careers.html`, `/corporate.html`, `/csr.html`, `/investors.html`, `/africa-network.html`, `/projects.html`, `/station-locator.html`, `/lake-oil.html`, `/lake-gas.html`, `/lake-lubes.html`, `/lake-agro.html`, `/lake-steel.html`, `/aficd.html`, and a construction/animation route.

## 23. Known untested areas and limitations

- Firefox, WebKit/Safari, native Edge, Android Chrome, and iPhone Safari were unavailable.
- Not every requested live route and every requested viewport was run; the live run used 21 representative routes and five viewport classes.
- A full 20-reload matrix across fresh profiles was not completed.
- DevTools Fast 3G/Slow 4G waterfall and CPU long-task traces were not captured.
- Manual touch, keyboard, screen-reader, orientation, form submission, and complete visual logo/content comparison remain open.
- No fixes were applied during this pass, so findings remain OPEN.
