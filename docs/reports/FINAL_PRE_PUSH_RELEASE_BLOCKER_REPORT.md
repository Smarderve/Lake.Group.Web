# FINAL PRE-PUSH RELEASE-BLOCKER REPORT

Date: 2026-08-29  
Starting commit: `d02d85c`  
Required commit: `perf(site): finish pre-push stability and performance blockers`

## Release decision

**NOT READY FOR PRODUCTION DEPLOYMENT**

Remaining blocker: Gallery still transfers approximately 12.17 MB in the local uncached Chromium crawl. The first visible Gallery image is now eager/WebP, but the full gallery still requests too much initial media. Home improved materially but remains heavy at approximately 9.99 MB locally. The implementation is stable and deterministic; the remaining issue is performance budget, not a claim of completion.

## Inherited QA status

| ID | Status | Files changed | Root cause / fix / verification |
|---|---|---|---|
| QA-001 | FIXED | `gallery.html`, `assets/images/group/ops/depot-aerial.webp` | Terminal image mapping now uses a shipped asset; local 47-page crawl has zero failures. |
| QA-002 | FIXED | prior remediation files | Fleet mapping uses the shipped tanker asset; local crawl clean. |
| QA-003 | FIXED | prior remediation files, `gallery.html` | Depot/poster mapping uses shipped depot asset; Lake Oil and Gallery requests are valid locally. |
| QA-004 | FIXED | prior remediation files | Station/image extension mappings use approved existing assets; local crawl clean. |
| QA-005 | FIXED | prior remediation files | Stale slider-7 references were removed/mapped; no active local asset failure. |
| QA-006 | FIXED | `projects.html`, prior remediation | Projects terminal mapping is valid locally. |
| QA-007 | FIXED | `lake-oil.html`, prior remediation | Lake Oil imagery/poster mappings are valid locally; no local failed requests. |
| QA-008 | FIXED LOCAL | `vercel.json` | CSP includes the narrow WASM permission required by the local dotLottie runtime; live deployment verification remains pending. |
| QA-009 | PARTIAL / OPEN | `index.html`, `assets/images/home/verticals/automotive-truck-lineup.webp` | Home hero staging, globe deferral, font-preload reduction, and automotive WebP reduce local transfer from 13.81 MB to 9.99 MB; budget remains high. |
| QA-010 | PARTIAL / OPEN | `gallery.html`, `assets/images/group/ops/*.webp`, `assets/images/lakegas/ops/*.webp`, `assets/images/lakeoil/current/*.webp` | Featured hero is eager/WebP and tiles are lazy, but local Gallery transfer remains 12.17 MB; further gallery media staging/variants are required. |
| QA-011 | FIXED LOCAL / DEPLOYMENT PENDING | `sw.js`, `assets/pwa.js` | v74 cache generation, network-first HTML/design assets, activation cleanup, and deferred registration are present; live activation cannot be proven before push. |
| QA-012 | FIXED | `sw.js`, `tests/cache-lifecycle.test.js` | 66 precache entries validated against the local web root; no missing entries. |
| QA-013 | FIXED | prior remediation files | UI category terminology uses Business Verticals. |
| QA-014 | NOT CHANGED / OPEN APPROVAL | `contact.html` | Remaining factual “subsidiary” wording is not a navigation/category label and requires content-owner approval. |
| QA-015 | FIXED LOCAL | `assets/under-construction.js`, `vercel.json` | dotLottie fallback/CSP path is guarded; local runtime gate has no shared error. |
| QA-016 | FIXED | `lake-oil.html`, `lake-lubes.html`, prior remediation | YouTube facades contain no iframe before interaction. |
| QA-017 | FIXED | prior remediation company pages | Missing placeholder logo references were replaced by approved wordmarks. |
| QA-018 | FIXED | `la-home.html`, `la-projects.html`, `vercel.json`, local crawler | Legacy routes redirect to canonical Lake Agro; local crawler mirrors production redirects. |
| QA-019 | FIXED | prior remediation, `assets/site.js` | Duplicate reveal startup call removed; public-page suites pass. |
| QA-020 | FIXED | `assets/pwa.js` | Worker registration is deferred from the critical render path. |
| QA-021 | FIXED LOCAL | `scripts/full-site-audit.mjs`, reload test | Full local crawl and reload test report no overflow; transformed-rect-specific legacy issue did not reproduce. |
| QA-022 | NOT REPRODUCED | Lake Steel / prior remediation | Logo exists and no visible failure reproduced locally. |
| QA-023 | FIXED LOCAL / DEPLOYMENT PENDING | `assets/under-construction.js`, CSP | No known local dotLottie initialization error; production requires deployment verification. |
| QA-024 | NOT TESTED — environment unavailable | — | Chromium available; Playwright Firefox/WebKit and independent native Edge executables unavailable. |

## Performance measurements

Measurements are fresh local Chromium runs from the full local crawler. Transfer is uncached static-server transfer; LCP was unavailable in this crawler and is not invented.

| Page | Prior local sample | Current local sample | Result |
|---|---:|---:|---|
| Home | 13.81 MB / 101 resources / DCL 1.02 s | 9.99 MB / 99 resources / DCL 0.73 s | Improved, still heavy |
| Gallery | 11.22 MB / 104 resources / DCL 0.97 s | 12.17 MB / 110 resources / DCL 0.69 s | Correctness improved; transfer blocker remains |
| About | 4.73 MB / 71 resources / DCL 1.00 s | 4.73 MB / 71 resources / DCL 0.67 s | Timing improved; transfer unchanged |
| Lake Oil | 6.01 MB / 71 resources / DCL 0.63 s | 6.01 MB / 71 resources / DCL 0.53 s | No local failures; transfer unchanged |

Current mobile samples: Home 8.99 MB, Gallery 11.31 MB, About 4.60 MB, Lake Oil 5.03 MB. The largest Home resource after deferral is `assets/i18n-content.js?v=20260828-01` at 873,715 bytes; the 2.09 MB globe bundle no longer appears in the 800 ms critical crawl sample.

Implemented performance changes:

- Home first hero remains eager/high priority; remaining slides remain lazy.
- Automotive lineup PNG is replaced in Home with a visually equivalent 103,676-byte WebP (source PNG was 1,476,352 bytes).
- Home globe bundle is deferred to idle time and zero-margin viewport intersection.
- Home removes two unnecessary extended-font preloads.
- Gallery featured image is eager/high priority and uses WebP; gallery tiles remain lazy.
- Additional depot, cylinder-yard, cylinder-stack, and tanker WebP variants are supplied and used where updated.
- YouTube facades remain click-to-load.
- Business Verticals/Lottie assets remain outside the critical initial navigation path.

## Stability and cache verification

- `npm.cmd run test:reload-stability`: PASS — 80 isolated mobile reloads, one build marker (`2026-08-28.01`), zero HTTP failures, zero loading deadlocks, zero overflow.
- `npm.cmd run test:cache-lifecycle`: PASS — 66 v74 precache entries exist; `skipWaiting`, `clients.claim`, old-cache deletion, and no-cache fetch controls present.
- `npm.cmd run test:cache-consistency`: PASS — 47 public HTML files use the deterministic release version.
- `vercel.json`: valid JSON; legacy Lake Agro redirects are now in the real top-level `redirects` array, not inside `headers`.
- Full local crawler: PASS — 47 root pages, 89 local viewport runs, zero console errors, zero failed requests, zero HTTP error responses, zero document overflow in Chromium.
- Skeleton test: PASS — terminates normally with `Skeleton loader contract passed.` The previous apparent hang was the bounded 47-page sequential suite taking about two minutes, not an open runtime handle.
- Back/forward, JS-disabled, Fast 3G/Slow 4G, and 20-cycle tests against live production: NOT TESTED in this no-push pass.

## Test results

PASS:

- `npm.cmd run test:skeleton`
- `npm.cmd run test:phase01-navbar`
- `npm.cmd run test:phase01-footer`
- `npm.cmd run test:phase01-launch`
- `npm.cmd run test:phase01-responsive`
- `npm.cmd run test:phase02-homepage`
- `npm.cmd run test:phase03-public`
- `npm.cmd run test:correction01-03`
- `npm.cmd run test:public-delivery`
- `npm.cmd run test:performance-sanity`
- `npm.cmd run test:cache-lifecycle`
- `npm.cmd run test:cache-consistency`
- `npm.cmd run test:reload-stability`
- `node --check scripts/full-site-audit.mjs`
- `git diff --check`

The phase-01-03 correction test expectations were updated only where they encoded superseded approved behavior: transparent navbar surface, transparent logo area, and the canonical Business Verticals mobile trigger. The History test now checks the current approved `history-event` structure rather than inventing nine obsolete `timeline-item` nodes. The responsive footer expectation now accounts for intentional footerless under-construction routes.

## Browser and viewport matrix

- Chromium: TESTED through the full local crawler and release suites.
- Firefox: NOT TESTED — executable unavailable.
- WebKit/Safari: NOT TESTED — executable unavailable.
- Native Edge: NOT TESTED — independent executable unavailable.
- Android Chrome/iPhone Safari: NOT TESTED as native browsers; Chromium mobile emulation was used for 390×844.
- Local crawler viewports: 1440×900, 820×1180, 390×844 across the 47-page inventory; key routes receive all three.
- Requested complete 2560/1920/1600/1440/1366/1280 desktop, 1180/1024/820/768 tablet, and 430–320 mobile matrix: NOT COMPLETED in this pass.

## Files changed in this pass

- `index.html`
- `gallery.html`
- `vercel.json`
- `scripts/full-site-audit.mjs`
- `tests/phase-01-footer.test.js`
- `tests/phase-01-responsive.test.js`
- `tests/phase-01-03-correction.test.js`
- `tests/phase-03-public-pages.test.js`
- `tests/performance-sanity.test.js`
- `tests/cache-lifecycle.test.js`
- `tests/reload-stability.test.js`
- `package.json`
- `assets/images/home/verticals/automotive-truck-lineup.webp`
- `assets/images/group/ops/depot-aerial.webp`
- `assets/images/lakegas/ops/cylinders-yard.webp`
- `assets/images/lakegas/ops/cylinder-stacks.webp`
- `assets/images/lakeoil/current/tanker-lake-energies.webp`

## Remaining limitations / blockers

1. Gallery still exceeds an acceptable initial transfer budget and needs explicit collection-level staging or responsive variants beyond the featured image.
2. Home remains resource-heavy, largely due shared `i18n-content.js` and globally requested media/logo resources.
3. Live post-deployment SW v74 activation, Vercel headers, and production reload consistency cannot be proven without pushing/deploying.
4. Firefox, WebKit/Safari, native Edge, physical Android/iOS, throttled network, CPU trace, JS-disabled, and complete requested viewport matrix remain unavailable or incomplete.
5. QA-014 factual terminology remains pending approval.

**NOT PUSHED — awaiting visual review.**
