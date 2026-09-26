# Surgical nation-label review

Starting HEAD: `ba4f19711ed76db149b6a65ebe49e515b1074ce6`.
Restore tag: `restore/pre-nation-label-surgical-20260925`.
Work performed directly on `main`.

## Scope

Changed `globe-lab/entry.tsx` annotation docks and leader geometry, rebuilt `assets/globe-lab.bundle.js`, updated its cache query in `index.html`, strengthened `scripts/verify-globe-leader-geometry.mjs`, and refreshed this QA directory.

Source comparison against the starting commit confirms the model, geographic coordinates, camera, rotation/drag, yellow routes, reveal timing, materials and markup are unchanged. No globe dimensions, styles, flags, section content, forms, CMS or infrastructure were changed.

## Authored positions

Rwanda is upper-left, Burundi mid-left below Rwanda. Their explicit left assignments cannot be changed by an automatic side solver. DR Congo and Zambia complete the left side. UAE, Ethiopia, Uganda, Kenya, Tanzania and Mozambique occupy the right side.

Clockwise angles from the right horizon; I = inner band (1.10 radius), O = outer band (1.16 radius). Desktop includes landscape tablet; portrait tablet applies from 600px through 959px; phone applies below 600px.

| Country | Desktop | Portrait tablet | Phone |
|---|---|---|---|
| UAE | -52 O | -52 O | -57 O |
| Ethiopia | -32 I | -33 I | -29 I |
| Uganda | -14 O | -15 O | -17 O |
| Kenya | 2 I | 2 I | -7 I |
| Rwanda | -166 I, left | -162 I, left | -160 I, left |
| Tanzania | 34 I | 35 I | 37 I below 420px; 28 I from 420px |
| Burundi | 177 I, left | 174 I, left | 174 I, left |
| Mozambique | 65 I | 68 I | 73 I |
| Zambia | 110 O, left | 110 O, left | 110 O, left |
| DR Congo | 151 I | 151 I | 145 I |

Leader endpoints are calculated from measured label boxes after boundary clamping, leaving a 12px gap at the designated edge. Foreign labels have an 8px protected margin. Rwanda and Burundi use two controlled quadratic bends with separate vertical exits. Their required left docks make these paths longer than the former right-side paths: the test explicitly permits up to 1.5 projected radii for these two countries, while retaining one radius for all others. They are not single straight diagonals or a many-segment lane maze.

## Browser verification

### UAE/Ethiopia spacing polish (2026-09-26)

The UAE label dock now uses a 1.40 projected-radius orbit band along its existing authored angle (desktop/landscape -52°, portrait tablet -52°, phone -57°). Previously it used the 1.16 outer band. This moves only the UAE dock and its measured leader endpoint up and right; Ethiopia stays at its prior dock and its geographic leader anchor is unchanged. The geographic UAE anchor, country markers, all other eight docks, and shared leader animation are unchanged. The existing curve automatically terminates at the new dock; no separate route timing or stroke change was made.

The geometry verifier now reports the measured closest edge-to-edge gap between UAE and Ethiopia label boxes and requires at least 32px. The same existing path-vs-flag/text, protected foreign-label zone, crossing, clipping and endpoint checks continue to apply. The final run passed at all 12 viewports: UAE/Ethiopia label gap ranged from 60.4px (360×800) to 122.2px (desktop). Every viewport had zero text, flag, safe-zone, crossing, overlap, clipping or endpoint violations. Full results are in `verification.json`.

Final combined run on 2026-09-26: PASS (exit 0), all 12 viewports. Each has ten visible labels, zero text collisions, zero flag collisions, zero foreign-label collisions, zero leader crossings, zero label overlaps, zero clipped labels and zero endpoint or side violations. Rotation-hidden check passed. Desktop, tablet and phone captures were visually reviewed.

`node scripts/verify-globe-leader-geometry.mjs` checks the real rendered SVG paths and DOM label, text and flag rectangles. It samples each path into 64 segments, so intersection results are numerical approximations backed by screenshot review.

Viewport coverage:

- Desktop: 1280×720, 1366×768, 1440×900, 1536×864, 1920×1080.
- Tablet: 768×1024, 820×1180, 1024×768.
- Phone: 360×800, 390×844, 412×915, 430×932.

See `verification.json` for per-viewport results and `globe-<width>x<height>.png` for captures. Tests require ten visible labels, Rwanda/Burundi entirely left, zero text/flag/foreign-label collisions, zero leader crossings, zero label overlaps, zero clipping and valid endpoints. The 360px Ethiopia/UAE crossing found during iteration was corrected by moving Ethiopia's phone dock. Kenya's phone dock was subsequently raised after visual inspection found the fixed back-to-top button obscuring it at the captured scroll position. That global control remains unchanged; these captures do not prove clearance at every possible scroll position.

Tanzania's dock also moves upward on phones from 420px to clear the back-to-top control in the 430px capture. Final 360px and 430px captures were visually rechecked after these adjustments. Screenshot writes use a temporary file and rename, with retries for brief Windows file locks. Measurements wait for all ten labels to be fully visible; waiting for path progress alone could sample a frame before label attachment. Geometry assertions are unchanged by these harness corrections.

## Animation and build

The bundle was rebuilt with `node scripts/build-globe-lab.mjs`.

`node scripts/verify-globe-orbit-animation.mjs` passed: all ten paths reached hidden, partial, full and retract states. Sampled frames spanning the 40-second browser recording were reviewed, including rotation, draw, hold, retract and clean phases. See `full-cycle.webm`, `cycle-review.jpg`, phase PNGs and `animation-verification.json`. The recording uses desktop geometry, which was unchanged by the subsequent phone-only dock corrections. White stroke style, normalized dash drawing and marker-to-label timing remain unchanged.
