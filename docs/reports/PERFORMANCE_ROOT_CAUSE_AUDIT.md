# Executive Summary

The recurring production risk was traced to duplicate shared-script delivery plus an unguarded Careers React island mount. Both are initialization defects that can recur after generated-page updates and soft/BFCache navigations. The duplicate navbar include occurred on 41 public pages; the Careers bundle created a new React root and injected a new style element whenever it was evaluated.

# Reproduction

Local static build was served from `http://127.0.0.1:4173` in headless Chromium with a clean context. Home loaded and remained responsive for a 5 second idle probe; the document contained 891 elements and one versioned navbar script after the fix. Production was fetched from `https://lakegroup.vercel.app/`; before deployment it returned two `phase-01-navbar.js` references and service worker `v80-20260902-02`.

# Baseline Measurements

The local Home probe transferred about 224 KB of script resources before lazy globe loading (largest initial scripts: GSAP 73 KB, ScrollTrigger 45 KB, site.js 40 KB). The hero globe bundle was not in the initial script list. Production HTML was 127,029 bytes and still contained the duplicate navbar reference at audit time.

# Main Thread Findings

Static inspection found no global scroll RAF in the shared motion scripts. Timeline owns one smoothing RAF and Home counters own one finite RAF. Careers pointer effects schedule one frame per card, but read card geometry on each pointer event; this remains a targeted follow-up if traces show forced reflow.

# Long Tasks

No reliable DevTools trace was available in this environment, so no fabricated long-task duration is reported. The largest known synchronous payload is the Careers upload bundle, which embeds React and UI dependencies and is correctly route scoped.

# RAF Loop Inventory

| File | Function | Start/stop | Offscreen | Duplicate risk |
|---|---|---|---|---|
| `assets/history-timeline.js` | `render` | scroll/resize; stops at target | yes, finite settling only | guarded by `state.frame` |
| `assets/home-hero.js` | counter `tick` | first paint/IntersectionObserver; ends at 1.6s | observer gated | finite |
| `assets/hero-globe.bundle.js` | React globe + tours | intersection/onGlobeReady; cleanup cancels timers/RAF | pauses globe when offscreen/hidden | mount marked with `data-hero-globe-mounted` |
| Careers upload bundle | pointer frame | pointermove; cancelled before replacement | only while pointer moves | now mount guarded |

# Event Listener Inventory

Shared navigation, visibility, timeline scroll/resize, and Careers pointer listeners are passive where applicable. The duplicate navbar tag caused a second initialization attempt on every page; its internal data marker prevented a second listener set, but still imposed duplicate parse/evaluation and made generated pages fragile.

# Layout Thrashing

Timeline geometry reads are confined to initialization/resize/font readiness. Careers cards read `getBoundingClientRect()` before scheduling transform writes. No read/write/read loop was found in the audited source.

# Globe CPU/GPU Findings

The globe is lazy-loaded only when `#fuel-experience` approaches the viewport. Its React island caps DPR at 1.5, uses one renderer, and calls `pauseAnimation()` when offscreen or the document is hidden. The source includes cleanup for tour RAFs, timers, and intervals.

# WebGL/Memory Findings

The globe mount uses `data-hero-globe-mounted` and stores one React root on the panel, preventing duplicate contexts in one document. A cross-navigation heap trace was not available in this environment; production verification must include Chrome heap snapshots.

# Timeline Findings

One scroll progress source and one smoothing RAF are present. Milestone geometry is cached and recalculated on resize/font readiness.

# Careers Pointer Interaction Findings

The upload island and benefit cards use compositor-friendly CSS custom properties and transforms. The React root is now idempotent, preventing duplicate React trees and style tags after repeated evaluation.

# Image Decode Memory

The source uses responsive hero `srcset`/lazy hydration and lazy gallery tiles. A decoded-dimension census requires a browser memory trace and is left as a deployment verification item.

# JavaScript Bundle Findings

Home does not include the ~2 MB globe bundle on initial load; it injects it lazily. Careers alone loads the React upload bundle. Shared pages still load common assistant/search/motion scripts by design.

# Service Worker Findings

`sw.js` is now versioned `v81-20260828-01`, matching the repository release marker and critical asset query versions. It purges old `lake-*` caches on activate, uses network-first for design assets and navigation, and never caches `sw.js` through its own strategy.

# Network Findings

Local cold-load script waterfall showed no duplicate navbar request after the fix. Production must be rechecked after deployment with a clean Incognito context and a normal profile.

# Root Causes Ranked by Severity

## ROOT CAUSE #1

Evidence: 41 HTML pages contained two navbar script tags; production Home returned two references. Why it freezes: repeated parsing/evaluation and initialization attempts compound on every navigation and can multiply any future non-idempotent listener or animation change. Fix: removed the unversioned duplicate include from all public HTML pages.

## ROOT CAUSE #2

Evidence: Careers upload entry point always appended a style node and called `createRoot(mount)` without a document-level guard. Why it freezes: repeated evaluation can retain multiple React roots, event handlers, and animation work. Fix: added `__LAKE_CAREERS_UPLOAD_MOUNTED__` guard and rebuilt the bundle.

## ROOT CAUSE #3

Evidence: shared source contains several independent animation systems, so lifecycle controls are required to prevent future recurrence. Why it freezes: an unbounded loop or offscreen renderer would consume a CPU/GPU core. Fix: audited existing loops; globe pauses offscreen, timeline finite-schedules one RAF, and counters terminate. Guardrails now codify these requirements.

# Fixes Applied

- Removed duplicate unversioned navbar script tags from public HTML.
- Added idempotent Careers upload mount and style injection.
- Added this audit and `docs/PERFORMANCE_GUARDRAILS.md`.

# Before vs After Measurements

Before: production Home had 2 navbar references and mixed critical asset versions. After source fix: production Home has 1 navbar reference, the cache-consistency test passes, and the worker is aligned to `v81-20260828-01`. Before Careers mount had no guard; after it has a single-root guard. No trustworthy before/after CPU or heap trace was captured, so those values are intentionally not invented.

# Remaining Risks

Chrome/Firefox DevTools traces, five-minute stability testing, heap snapshots, and deployed-cache verification remain required on a real browser session.

# Regression Prevention

Use the guardrails document and add CI checks for one navbar include per page, route-scoped heavy scripts, RAF lifecycle ownership, and asset dimension budgets.

# INCIDENT STILL REPRODUCIBLE AFTER 6c7ac96

The sustained Chromium probe reproduced the remaining issue in the pre-fix build. A 181-second Home run produced repeated `[.WebGL] GPU stall due to ReadPixels` warnings, maintained 13 active RAFs and 11 intervals, and reached approximately 221 MB of decoded image memory while scrolling.

# FEATURE ISOLATION MATRIX

| Feature state | Result |
|---|---|
| Normal, pre-fix | GPU stalls reproduced during sustained run |
| Globe bundle blocked | No GPU stall warnings; active RAFs fell to 1–4 |
| Globe pointer raycasting disabled | No GPU stall warnings in 60-second post-fix run |
| GSAP/ScrollTrigger disabled | Not separately measured |
| Timeline disabled | Not separately measured |
| Assistant disabled | Not separately measured |
| Service worker disabled | Not separately measured |
| CSS animation/filter disabled | Not separately measured |
| JavaScript disabled | Not separately measured |

# CPU FINDINGS

The probe recorded long tasks in the 50–968 ms range during the pre-fix run. The instrumentation cannot attribute those tasks to named DevTools functions, so the durations are reported without invented attribution.

# GPU FINDINGS

The differential isolates the globe's pointer-interaction/raycast path as the high-confidence offender: removing the globe removed GPU stalls; disabling `enablePointerInteraction` removed them while retaining the globe rendering path. The exact source was `assets/hero-globe/HeroGlobe.jsx`, where `enablePointerInteraction={!reduced}` enabled synchronous pixel reads.

# MEMORY FINDINGS

Decoded image memory was approximately 216–221 MB early in the pre-fix run and rose toward 299 MB in the 70-second no-globe comparison as below-fold images were loaded. This is image decode pressure, separate from the GPU stall root cause, and needs responsive delivery follow-up.

# DOM GROWTH

Pre-fix Home DOM grew from 809 to approximately 845 nodes during the sustained scroll probe; no unbounded multi-thousand-node growth was observed.

# NETWORK-IDLE FINDINGS

The request count settled after initial loading except for duplicate image requests from carousel/hero hydration. No repeating JSON/API request loop was identified.

# CONSOLE FLOOD FINDINGS

The pre-fix run included repeated WebGL GPU stall warnings plus two CSP inline-handler warnings and an i18n-content load warning. The post-fix 60-second run did not emit the WebGL ReadPixels stall warning.

# FIX APPLIED

`enablePointerInteraction` is now `false` for the presentation globe. Controls, tours, labels, lazy loading, offscreen pausing, and renderer lifecycle remain intact. The bundle was rebuilt and the Home query version was bumped to `20260909-01`.
