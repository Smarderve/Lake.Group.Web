# Lake Group Website — QA Report

**Date:** 2026-07-04
**Scope:** Full pre-deployment QA of the static Lake Group site (29 HTML pages, shared theme/motion layer, 3D experiences, PWA/service worker, i18n EN/FR/SW).
**Method:** Headless-Chrome visual audit at desktop (1440×900) and mobile (390×844) viewports with a full screenshot matrix; static checkers for links, i18n coverage, head-tag/accessibility consistency; targeted browser re-verification after each fix.

---

## Executive summary

The site went through a three-pass QA cycle: a full visual/static audit, a fix pass, and a final verification pass. The audit surfaced **one critical defect** (an infinite reload loop in `offline.html`), **one high-severity defect** (horizontal overflow on five pages at mobile width), and a handful of lower-severity gaps (missing `404.html`, favicon 404, i18n orphans). All of these are now **fixed and re-verified in headless Chrome**. Link integrity, i18n key coverage (1,356 keys × 3 languages), head-tag consistency, and static accessibility checks all pass cleanly.

What remains is **editorial, not technical**: a small set of content claims (leadership names/tenures, the "20+ subsidiaries" figure) could not be verified against Lake Group's official sources and should be confirmed by the client before or shortly after launch. Real-device GPU performance and Lighthouse scoring could not be exercised in this environment.

## Deployment verdict

### APPROVED WITH MINOR FIXES REQUIRED

All functional, visual, and PWA defects found during QA are fixed and verified. The site is technically ready to deploy. The verdict is qualified only by the **content-verification items** listed under "Flagged, not fixed" (unverifiable leadership names and the subsidiary count), which need client/editorial sign-off, and by the recommendation to run a production Lighthouse + real-device pass post-deploy.

---

## Issues found → fixed

| # | Severity | Issue | Root cause | Fix | Verified |
|---|----------|-------|------------|-----|----------|
| 1 | CRITICAL | `offline.html` reloaded in an infinite loop when viewed while online (crashed the audit run on both viewports) | `window.online` handler called `location.reload()` unconditionally; when the browser serves `offline.html` under its own URL, reload serves the same page again forever | Reload now only navigates away meaningfully: if the address bar holds `offline.html` itself it navigates to `index.html` once; a plain reload only happens in the SW-fallback case where the address bar holds the originally requested page | Yes — simulated the offline→online transition in headless Chrome: exactly **1** navigation in 5 s, landing on `index.html`, no bounce-back |
| 2 | HIGH | Horizontal overflow at 390 px on about (+201 px), fuel (+46 px), contact (+119 px), news (+82 px), careers (+210 px) | Inline-styled multi-column grids (`style="grid-template-columns:1.4fr 1fr…"`) with no mobile breakpoint; long unbreakable strings (emails, phone numbers) pushed them past the viewport; nowrap `.ose-label` captions on about | Mobile overflow guard in `assets/theme.css` (§14b): collapses every inline-templated grid to one column ≤720 px with `min-width:0` on children; `.ose-label` wraps; plus defense-in-depth `overflow-x: clip` on `html, body` (clip, not hidden, so `position: sticky` keeps working) | Yes — all five pages re-measured in headless Chrome at 390 px: `document.documentElement.scrollWidth = 390` on every page |
| 3 | HIGH (dismissed) | "Nav did not re-show on scroll up" on index (both viewports) | **Timing artifact, not a bug** — the audit asserted while smooth-scroll was still in flight (still moving down), so the nav was legitimately hidden. A debug run on about.html confirmed the nav re-shows on scroll up | Logic in `assets/motion.js` re-reviewed in this pass: delta-based show/hide with rAF throttling, always-show above 120 px, correct handling of reduced-motion and open mobile menu. No bottom-of-page or clamping bug found. No change made | Yes — code review + prior debug run |
| 4 | MEDIUM | `404.html` did not exist | Never created | Branded 404 page created with links back into the site | Yes — clean at both viewports, console clean (screenshots) |
| 5 | MEDIUM | Favicon 404 on every page | No `favicon.ico` at site root | `favicon.ico` added and referenced | Yes — earlier verification pass |
| 6 | LOW | Service-worker cache staleness risk after fixes | Precached files (`theme.css`, `offline.html`, `404.html`) changed during QA | `VERSION` bumped to `v4` (final bump after the last `theme.css` change in this pass); old caches are deleted on activate | Yes — precache list re-checked (see PWA section) |

## Flagged, NOT fixed (needs client/editorial review)

- **Leadership names and tenures** — `leadership.html` names executives (Juma Nuru, Nassoro Abubakari) beyond the founder/CEO. Per the research dataset (`scripts/_verified_lake_facts.md`), **only Ally Edha Awadh (Chairman & Group CEO) is verifiable from official Lake Group sources**; other executive names/titles/tenures could not be confirmed and must be validated by the client before launch.
- **"20+ subsidiaries" claim** (`index.html`) — the verified-facts dataset enumerates roughly 15 distinct legal entities/country operations from official sources. "20+" may be accurate internally but is not externally verifiable; confirm with the client.
- **Fleet-size conflict** — official Lake Group sources themselves conflict (600 / 1,200+ / 750 / 850+ vehicles). The site should consistently use "1,200+" (the about-page figure) per the facts dataset; worth a final editorial sweep.
- **i18n dictionary orphans** (`scripts/_qa_i18n_orphans.txt`) — 12 keys exist in the dictionary but not in page markup: 11 are `chat.reply.*` keys **used by the chat widget JS** (intentional), plus `about.34` which appears genuinely unused (harmless dead data, safe to leave).

---

## Per-layer results

### Content
- All 29 pages carry unique titles, meta descriptions, and canonicals (no duplicates — see `scripts/_qa_out_matrix.txt`).
- Content was rebuilt against `scripts/_verified_lake_facts.md`; unverifiable claims are listed above for editorial review.

### Design / motion
- Shared design system (`assets/theme.css`) enforces brand tokens (blue `#1D3EA8`, yellow `#FFD700`) over legacy styles on all pages.
- Scroll-reveal system is JS-gated (`html.lg-motion`): if JS fails, content is never left hidden. Reveal transforms are translateY/scale only — verified they cannot cause horizontal overflow.
- Nav hide-on-scroll-down / show-on-scroll-up verified working; respects reduced motion and open mobile menu.
- `prefers-reduced-motion` disables all animation/transitions in a single gate (theme.css §15).
- Mobile overflow guard added (§14b) — see issue #2.

### 3D experiences
- Index 3D scroll experience: sticky pinning verified at desktop (`top: 72px` through the scrub), start/mid/finale states captured in screenshots. Console clean throughout.
- 3D zones are correctly excluded from the reveal/tilt systems (skip zones in `motion.js`).
- Real-device GPU performance is untested in this environment — see risks.

### PWA / offline
- `sw.js` precache verified to include `./offline.html`, `./404.html`, `./assets/theme.css`, `./assets/motion.js`, plus fonts/logos/core pages. `VERSION` is `v4`, bumped after the final `theme.css` change so all clients pick up the fixes.
- Offline fallback chain: network-first navigations → cached page → `offline.html` → plain-text 503. Non-GET, cross-origin, and authenticated-looking requests are never cached.
- Offline reload loop fixed and verified (issue #1).

### SEO
- Sitemap and robots.txt present; all sitemap URLs resolve (`scripts/_qa_out_links.txt`).
- Canonical, meta description, viewport, lang attribute present on all pages (404/offline intentionally minimal: no canonical/description needed on error/fallback shells — they are `noindex` by nature of their role; 404 has canonical omitted deliberately).

### Accessibility
- Static checks: **0 findings** — every `<img>` has alt text, every page has exactly one `<h1>`, every form control is labelled (`scripts/_qa_out_matrix.txt`).
- Visible focus states on all interactive elements (theme.css §3).
- Full reduced-motion support.

### Security
- Service worker never caches non-GET or authenticated-looking URLs (token/key/session query params excluded).
- No third-party origins are handled by the SW; all fonts/images self-hosted.
- Static site — no server-side attack surface. Recommend standard security headers (CSP, X-Content-Type-Options, HSTS) at the hosting layer.

### Performance
- Fonts self-hosted as woff2 and precached; images lazy-loaded with `decoding="async"`; hero 3D shipped as a single cached bundle; animations use transform/opacity only (no layout thrash); `will-change` used sparingly and released after reveal.
- Lighthouse could not be run in this environment — see risks.

### i18n
- EN/FR/SW: 1,356 keys per language, all page keys resolve in all three languages (`scripts/_qa_out_i18n.txt`). Orphan analysis in `scripts/_qa_i18n_orphans.txt` (see flagged items).

### Links
- All internal references across 29 pages resolve; sitemap consistent; no references to deleted pages (`scripts/_qa_out_links.txt`).

---

## Evidence

- **Screenshot matrix (53 images):** `scripts/_qa_screens/` — `{page}-{desktop|mobile}-{top|mid|footer}.png` for index/about/fuel/contact/gallery/news/careers/404, plus `index-desktop-3d-{start|mid|finale}.png` and `index-mobile-3d-start.png`.
- **Audit findings:** `scripts/_qa_screens/_findings.txt`
- **Checker outputs:** `scripts/_qa_out_links.txt`, `scripts/_qa_out_i18n.txt`, `scripts/_qa_out_matrix.txt`, `scripts/_qa_i18n_orphans.txt`
- **Re-verification tool:** `scripts/_qa_overflow_check.js` (dependency-free CDP client; measures `scrollWidth` at 390 px and counts `offline.html` navigations after a simulated online event)
- **Verified facts dataset:** `scripts/_verified_lake_facts.md`

## Remaining risks / post-deploy recommendations

1. **Real-device GPU performance untested** — the 3D scroll experiences were verified functionally in headless Chrome (SwiftShader). Test on mid-range Android and older iPhones after deploy; the reduced-motion path is the built-in escape hatch.
2. **Lighthouse not run in this environment** — run a production Lighthouse pass (performance, a11y, SEO, best practices) against the live URL post-deploy and fix any regressions.
3. **Editorial sign-off** on the flagged content items (leadership names, "20+ subsidiaries", fleet figure) before or immediately after launch.
4. **Hosting-layer headers** — add CSP, HSTS, X-Content-Type-Options, and long-cache headers for `assets/` (the SW versioning already handles cache busting for precached files).
5. **Service-worker rollout** — clients with the old SW will update on next visit (v4 activation deletes old caches); no manual action needed, but avoid renaming precached paths without another VERSION bump.

---

## Addendum — 2026-07-04: Hero 3D experience replaced (fueling → Global Operations globe)

The scroll-driven fueling simulation (dispenser / nozzle / pour / tanker truck)
in `assets/hero-3d.js` was **permanently removed** per client directive and
replaced with an **Interactive Global Operations Experience**: a procedurally
shaded Earth (no external textures) carrying only the verified footprint from
`scripts/_verified_lake_facts.md` — 9 markers (Dar es Salaam HQ + Nairobi,
Kigali, Bujumbura, Lubumbashi, Ndola, Addis Ababa, Beira, Dubai), HQ→spoke
route arcs, and 4 verified facility callouts (Tanga LPG 3,000 MT, Dar port
bunkering/38M-litre depot, Lake Steel Kibaha, GCCP Dar + Lugoba quarry).
Section copy (index.18–index.26) rewritten in en/fr/sw
(`node scripts/build_sw_lang.js` passed, 1356 keys). Bundle rebuilt: 544 KB
(budget 700 KB). `sw.js` VERSION bumped v4 → v5.

Verified (3 headless-Chrome rounds, runner `scripts/_globe_qa.js`, shots in
`scripts/_qa_screens/globe-*.png`, notes in `scripts/_globe_qa_notes.md`):
- Desktop 1440px: scroll-scrub through all four chapters at 9 positions;
  zero console errors; no fueling remnants anywhere in the cycle
  (`rg -i 'nozzle|dispenser|tanker|hatch|splash|pour' assets/hero-3d.js`
  returns nothing); brightness acceptable in every frame.
- Page above/below the section scrolls normally (top hero and footer reached).
- Mobile 390px: autonomous tour runs in the fixed panel, no errors.
- Reduced motion: static branded overlay (logo + tagline), no canvas/WebGL.
- Real-device GPU performance remains untested (same caveat as item 1 above).
