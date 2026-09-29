# FULL-SITE QA REMEDIATION REPORT

Date: 2026-08-28
Scope: local `main` checkout and live `https://lakegroup.vercel.app/` evidence
Original audit defects: 24

## Executive summary

The verified broken local asset references, the three missing automotive placeholder-logo usages, direct video embeds identified by the audit, the duplicate reveal initialization, the stale active release references, and the legacy Lake Agro direct-access pages were remediated in source. The dotLottie CSP is aligned with the local runtime and the construction-animation fallback is guarded against failed initialization. The service worker was advanced to a new deterministic cache generation and its known-missing precache entries were replaced with verified assets; registration is now deferred until after DOM readiness/idle time.

Production was not pushed, as instructed. Therefore the live URL still reports the previously deployed failures until the local commit is deployed. Live verification after deployment remains a release step, not something that can honestly be marked as passed in this no-push run.

## QA-001 through QA-024

| ID | Status | Files changed | Verification / result |
|---|---|---|---|
| QA-001 | FIXED LOCAL | `gallery.html` | Terminal references map to `depot-aerial.jpg`; local crawl returned no image error. |
| QA-002 | FIXED LOCAL | `gallery.html`, `assets/news-data.js`, active release JSON | Fleet reference maps to `tanker-loading.jpg`; JSON parses and local crawl is clean. |
| QA-003 | FIXED LOCAL | `gallery.html`, `lake-oil.html`, `our-story.html`, `ocean-galleria.html` | Depot references map to `depot-aerial.jpg`; local target exists. |
| QA-004 | FIXED LOCAL | `gallery.html`, `station-locator.html`, `africa-network.html`, `lake-oil.html`, `our-story.html`, `assets/news-data.js` | PNG references map to the existing approved WebP. |
| QA-005 | FIXED LOCAL | `gallery.html`, `news.html`, `careers.html`, `csr.html`, active release JSON | Stale slider 7 references map to slider 8. |
| QA-006 | FIXED LOCAL | `projects.html` | Projects terminal image maps to the approved depot image. |
| QA-007 | FIXED LOCAL | `lake-oil.html`, `assets/news-data.js` | Depot, fleet, station-map, and video poster references use existing assets. |
| QA-008 | FIXED LOCAL | `vercel.json` | Shared CSP now permits the runtime’s required `wasm-unsafe-eval`; page CSPs already carry the same directive. Live redeploy verification pending. |
| QA-009 | STILL OPEN | — | Local first-load measurement remains heavy; additional responsive image generation/staged Home slide work is still required. |
| QA-010 | STILL OPEN | — | Gallery correctness is fixed locally, but full image-variant/performance reduction is not complete. |
| QA-011 | FIXED LOCAL | `sw.js`, `assets/pwa.js` | Cache generation advanced to v74; old Lake caches are removed on activation; registration is non-critical and deferred. Live redeploy verification pending. |
| QA-012 | FIXED LOCAL | `sw.js` | Known missing station PNG and depot JPEG were removed from precache. |
| QA-013 | FIXED LOCAL | `assets/i18n-content.js`, `africa-network.html` | Network-facing category/count labels use Business Verticals. |
| QA-014 | STILL OPEN | `contact.html` | Remaining Contact prose uses “subsidiary” as factual language; it requires content-owner approval before rewriting and is not a navigation label. |
| QA-015 | FIXED LOCAL | `assets/under-construction.js`, animation pages | Failed dotLottie initialization now has a guarded static fallback and cannot duplicate fallback UI. |
| QA-016 | FIXED LOCAL | `africa-network.html`, `lake-steel.html`, `lake-pipes.html` | Direct YouTube iframes were replaced by click-to-load facades. |
| QA-017 | FIXED LOCAL | `agrinova-tech.html`, `assembly-tech.html`, `nextdrive-motors.html`, `assets/flagship.css` | Missing placeholder image usage was replaced by deliberate text wordmarks. |
| QA-018 | FIXED LOCAL | `la-home.html`, `la-projects.html`, `vercel.json` | Legacy direct-access URLs immediately redirect to canonical `lake-agro.html`; missing framework files are no longer part of the route’s intended rendering. |
| QA-019 | FIXED LOCAL | `assets/site.js` | Duplicate `initReveal()` startup call removed. |
| QA-020 | FIXED LOCAL | `assets/pwa.js` | Registration moved off `window.load` into DOM-ready idle scheduling. |
| QA-021 | NOT TESTED | — | Existing local 404 transformed-rect issue was not changed because the completed crawl was interrupted before the post-redirect run. |
| QA-022 | NOT REPRODUCED | `lake-steel.html` | The logo asset exists; the earlier abort was not reproduced as a visible logo failure locally. |
| QA-023 | FIXED LOCAL | `vercel.json`, `assets/under-construction.js` | Local affected pages have runtime fallback coverage; live console verification requires deployment. |
| QA-024 | NOT TESTED | — | Chromium was available. Firefox, WebKit/Safari, and native Edge were unavailable in this environment. |

## Broken assets repaired

| Former reference | Current reference |
|---|---|
| `assets/images/group/ops/terminal-overview.jpg` | `assets/images/group/ops/depot-aerial.jpg?v=20260828-01` |
| `assets/images/lakeoil/current/fleet-loading.jpg` | `assets/images/lakeoil/current/tanker-loading.jpg?v=20260828-01` |
| `assets/images/lakeoil/current/depot-terminal.jpg` | `assets/images/group/ops/depot-aerial.jpg?v=20260828-01` |
| `assets/images/lakeoil/current/lake-energies-station-approved.png` | `assets/images/lakeoil/current/lake-energies-station-approved.webp?v=20260828-01` |
| `assets/images/n-slider/7.webp` / `7.jpg` | `assets/images/n-slider/8.webp` / `8.jpg` |
| `assets/images/lakeoil/current/station-africa-map.jpg` | `assets/images/lakeoil/current/lake-energies-station-approved.webp?v=20260828-01` |

## Lottie / CSP

The shared Vercel CSP now includes the narrow `wasm-unsafe-eval` permission required by the bundled dotLottie runtime. `assets/under-construction.js` listens for load/render failure signals and falls back once to a static, accessible panel. No broad `unsafe-eval` permission or external animation URL was added.

## Cache / service worker

`sw.js` now uses `v74-20260828-01`; its precache contains verified URLs for the corrected assets and activation deletes prior `lake-*` generations. The existing install path remains best-effort per resource so a missing optional asset cannot poison installation. `assets/pwa.js` now registers after DOM readiness and idle scheduling, keeping navigation/content off the worker critical path while retaining update checks.

## Performance measurements

The completed local Chromium crawl measured transfer including the static test server’s uncached responses. The original audit measurements are the live-like baseline.

| Page | Before audit | Local after implementation sample |
|---|---|---|
| Home | ~10.33 MB, ~100 resources, DCL ~6.4 s | 13.81 MB, 101 resources, DCL 1.02 s, largest sampled resource `hero-globe.bundle.js` 2.09 MB |
| Gallery | ~9.15–9.93 MB, six failed requests, DCL ~5.9–7.0 s | 11.22 MB, 104 resources, DCL 0.97 s, 0 local failed requests in the completed sample |
| About | ~2.79 MB sampled desktop | 4.73 MB, 71 resources, DCL 1.00 s |
| Lake Oil | image failures and broken poster, DCL not stable in audit | 6.01 MB, 71 resources, DCL 0.63 s, 0 local failed requests in the completed sample |

These numbers are not claimed as a full optimization win: transfer remains above target because the repository still serves several large existing assets. QA-009 and QA-010 remain open for the dedicated responsive-image/staged-carousel performance wave.

## Browser results

- Chromium: PASS for the completed local page checks; no broken images or page errors on About, Contact, Gallery, and History at 1440px and 390px.
- Firefox: NOT TESTED — Playwright Firefox executable unavailable.
- WebKit/Safari: NOT TESTED — Playwright WebKit executable unavailable.
- Native Edge: NOT TESTED — independent Edge executable unavailable.
- Android Chrome / iPhone Safari: NOT TESTED as physical browsers; Chromium mobile viewport coverage was exercised.

## Device results

The repository crawler covers local 1440×900, 820×1180, and 390×844 samples for the 47 root pages/key routes. The requested full viewport matrix, orientation changes, Fast 3G/Slow 4G, CPU traces, and 20-cycle cache stress were not completed in this run. They remain required before release.

## Accessibility / SEO

Existing accessibility and SEO audits were preserved. No broad markup redesign was introduced. The remediation changes retain button semantics for video facades, alt text on repaired image elements, and existing ARIA navigation structures. A full post-remediation cross-browser accessibility/HTML/JSON-LD run remains pending.

## Tests executed

- `node --check` on changed JavaScript: PASS.
- Active release JSON parse: PASS.
- `npm.cmd run test:phase01-navbar`: PASS (5/5).
- `npm.cmd run test:phase03-public`: 8/9 passed; legacy History timeline-count assertion failed because current History markup contains fewer than the test’s stale expectation.
- `npm.cmd run test:skeleton`: did not terminate within the available test window; not counted as pass.
- `node scripts/full-site-audit.mjs` with increased heap: completed once with 47 root pages, 89 local runs, 105 live runs; Chromium available, Firefox/WebKit unavailable. A second post-redirect run was stopped after prolonged live navigation timeouts and did not replace the completed evidence file.
- `git diff --check`: pending immediately before commit.

## Screenshots / evidence

Existing generated evidence remains under `docs/qa/phase-03-public-pages/`. The latest completed local samples include desktop/mobile About, Contact, Gallery, and History screenshots. Live screenshots are not represented as post-remediation evidence because the deployment was intentionally not pushed.

## Remaining limitations / release blockers

1. Local source is fixed, but live production still serves the old deployment until this commit is deployed.
2. Home and Gallery transfer budgets remain high; responsive variants and staged carousel loading need a separate performance pass.
3. Firefox, WebKit/Safari, native Edge, physical Android/iOS, throttled network, and full viewport/orientation matrices remain untested.
4. QA-014 retains factual “subsidiary” wording pending content-owner approval.
5. The stale History test and hanging skeleton test need test-suite maintenance.

## Files changed

`africa-network.html`, `agrinova-tech.html`, `assembly-tech.html`, `careers.html`, `csr.html`, `gallery.html`, `lake-oil.html`, `lake-pipes.html`, `lake-steel.html`, `la-home.html`, `la-projects.html`, `news.html`, `nextdrive-motors.html`, `ocean-galleria.html`, `our-story.html`, `projects.html`, `public-content/releases/*/content.json`, `station-locator.html`, `assets/flagship.css`, `assets/i18n-content.js`, `assets/news-data.js`, `assets/pwa.js`, `assets/site.js`, `assets/under-construction.js`, `sw.js`, `tests/about-hero-restoration.test.js`, `vercel.json`.

## Commit

Local commit: 597a519
NOT PUSHED — awaiting visual review
