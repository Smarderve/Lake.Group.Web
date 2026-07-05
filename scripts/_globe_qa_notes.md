# Globe experience QA notes (Interactive Global Operations Experience)

Working notes for the hero-3D replacement (fueling concept removed permanently).
Successor: read this + `scripts/_globe_qa.js` (the CDP QA runner; run with the
HTTP server up: `nohup python3 -m http.server 8734 --bind 127.0.0.1 &` from repo
root; Chrome needs `--use-angle=swiftshader-webgl --enable-unsafe-swiftshader`
for WebGL in headless).

## Status
- [x] assets/hero-3d.js fully rewritten (globe-only; no fueling remnants — rg
      confirms `nozzle|dispenser|tanker|hatch|splash|pour` returns nothing).
- [x] index.html copy replaced (One Network. Eight Countries. / Global
      Perspective / Our Footprint / On the Ground), same data-i18n keys
      (index.18–index.26 values changed; index.17/27/28/29/30 kept).
- [x] i18n en+fr updated in assets/i18n-content.json; sw updated in
      scripts/_sw_out_3.json; `node scripts/build_sw_lang.js` passed
      (1356 keys, tag check clean; regenerates i18n-content.json/.js).
- [x] Bundle rebuilt: 544.1KB (budget 700KB). sw.js VERSION v4 -> v5.
- [x] QA round 1 (scripts/_qa_screens/globe-*.png): no console errors on
      desktop/mobile/reduced-motion; is-scrolly applies at 1440; mobile 390
      runs autonomous tour; reduced-motion = static branded overlay, no canvas;
      page top/bottom scroll normally.

## Round 2/3 results — ALL RESOLVED, experience shipped
- Round 2 fixes: atmosphere 1.18R→1.10R + weaker falloff, darker ocean +
  weaker specular, brighter/denser land dots (uSize 3.8, 13.0 numerator),
  camera pulled back (3.45/3.05/2.45R), label sprites shrunk (0.24–0.30)
  and fanned via per-site sprite.center anchors, ch3 country-label dim 0.92.
- Round 3 fix: DAR ES SALAAM PORT callout off [0.95,-0.15]→[0.45,-1.05]
  (was cropping right edge); LAKE STEEL off [-1.05,0.15]→[-0.72,0.42].
- Final state: all 4 facility callouts inside frame at p0.8/p0.94, labels
  legible, zero console errors on all three profiles, finale overlay OK.
- QA runner supports env vars: POS=0.8,0.94 (desktop positions),
  DESKTOP_ONLY=1 (skip mobile/reduced-motion legs).
- NOTE: when jumping straight to a deep position (POS=0.8), the scrub lerp +
  callout fades need ~2s; the default full sweep gives enough settle time.

## Round 1 visual findings (fixed in round 2)
1. Ch1: atmosphere rim too thick/bright (1.18R backside additive) — planet
   reads as a fuzzy blue ball; land dots too faint vs bright ocean + big
   specular blob. Fix: smaller/weaker atmosphere, darker ocean, weaker spec,
   brighter/larger land dots.
2. Ch2/Ch3 camera too close (2.55R / 1.95R) — globe overflows frame, labels
   huge. Fix: 3.0R / ~2.45R and smaller sprite heights.
3. Country labels overlap in the East-Africa cluster (Kigali/Bujumbura/Nairobi/
   Dar). Fix: per-site label offsets (east/north surface units) fanning them
   out; dim country labels harder during ch3 (facility callouts take over).
4. Facility callout labels crop at frame edge at p0.8 — mitigated by farther
   camera + smaller label height.

## Data provenance (scripts/_verified_lake_facts.md)
- 9 markers: Dar es Salaam HQ (Plot 49 Mikocheni), Nairobi, Kigali, Bujumbura,
  Lubumbashi, Ndola, Addis Ababa, Beira, Dubai (MERM/SAFF) — all verified
  country entities/addresses in the facts file.
- Arcs: Dar HQ -> each of the 8 others (official "operations across 8
  countries" + Dubai presence).
- Facility callouts: Tanga LPG 3,000 MT; Dar port bunkering + 38M-litre
  Kigamboni depot; Lake Steel Kibaha ~100,000 MT/yr; GCCP Dar + Lugoba quarry.
- Copy stats: 8 countries, 700+ trucks, 85 stations (Tanzania) — all [official].
