# Approved Globe Lab Promotion

## Restore point

- Tag: `pre-home-globe-promotion-20260909-215247`
- Commit: `4cdc3555c03132c513a111eca2b5d81d51537599`

## Frozen approved implementation

- Page entry: `globe-lab.html`
- React source: `globe-lab/entry.tsx`
- Production bundle: `assets/globe-lab.bundle.js`
- Build entry: `scripts/build-globe-lab.mjs`
- Earth textures: `assets/images/globe/earth_day.webp` and `assets/images/globe/earth_topology.webp`
- Label flags: `assets/images/flags/{tz,ke,ug,rw,bi,cd,zm,mz,et,ae}.svg`

The promoted implementation preserves the lab's ten coordinates, Tanzania origin,
route points and altitudes, `43` degree camera field of view, final rotation,
camera pullback, marker and route reveal timing, label offsets, Earth materials,
lighting, atmosphere, and `1.65` DPR cap. The source change is limited to selecting
the lab root or the homepage root and pausing the shared renderer when its section
is offscreen or the document is hidden.

## Homepage integration

- `index.html` keeps the existing **One Network. Ten Countries.** copy and section.
- The panel contains one `#hero-globe-root` mount.
- The existing intersection-based lazy loader requests `assets/globe-lab.bundle.js`.
- `assets/hero-globe.bundle.js` is no longer referenced or requested by Home.
- `sw.js` routes the promoted bundle network-first and advances the cache generation.

## Verification

`scripts/verify-promoted-home-globe.mjs` rendered Home at 390, 430, 768, 1024,
1280, 1366, 1440, 1536, and 1920 pixels. Every viewport produced one canvas,
one WebGL context, one promoted-bundle request, zero obsolete-bundle requests,
and the exact ten approved labels. Detailed results are in
`docs/qa/home-globe-promotion-verification.json`.
