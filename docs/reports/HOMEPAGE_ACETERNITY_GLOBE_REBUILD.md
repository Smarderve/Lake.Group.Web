# Homepage Aceternity globe rebuild audit

Date: 2026-09-09

## Restore and recovery

Restore point: `pre-aceternity-home-globe-recovery-20260909` (`ed852bff5179b7d8742f8c306baf2d862ea651f2`).
The last-known-good globe is commit `0f79a10` (`feat(home): perfect cinematic globe and country labels`). Its globe source and bundle were recovered under `assets/hero-globe-recovered/` and are not mounted.

## Aceternity sources and embed

The required commands were run and the registry payloads were inspected. The exact supplied UI sources are retained under `assets/hero-globe/aceternity-supplied/components/ui/`:

- `globe.tsx` from `@aceternity/globe-demo`
- `3d-globe.tsx` from `@aceternity/3d-globe-demo`

The new production embed is isolated under `assets/hero-globe-aceternity/` and bundled by `scripts/build_hero_globe.js`. It uses the Globe demo's ThreeGlobe arc/data configuration and material setup, and the 3D Globe demo's projection utility, bump/terrain configuration, marker geometry contract, and atmosphere relationship through `AceternityWorld.js`. The old globe remains available as recovered fallback source; only the new embed is mounted by `index.html`.

The upstream demos assume Next.js/Tailwind aliases and remote demo data, so their source is adapted into this static React island instead of mounting two canvases. Demo cities, sample arcs, avatars, and colors were replaced with Lake data.

## Lake behavior

Exactly ten countries are used: Tanzania, Kenya, Uganda, Rwanda, Burundi, DR Congo, Zambia, Mozambique, Ethiopia, and UAE. Every route begins at Tanzania using the approved coordinates. Routes use the Aceternity/ThreeGlobe arc system, Sunrise Yellow `#FFF200`, and progressive one-route-at-a-time reveal. Africa is the final camera composition, with East Africa central and UAE upper-right.

The existing label layer remains geographic and deterministic: projected anchors, front/back visibility, collision candidates, edge clamping, leader lines, and previous-position memory. Reduced motion and offscreen/document-hidden lifecycle guards remain enabled. One canvas, one WebGL context, one route animation owner, capped DPR, and cleanup are retained.

## Evidence and QA

- Final capture: `docs/qa/home-globe-aceternity-final-1440.png`
- Chromium: one canvas, ten labels, no errors; sequence samples show Tanzania first and progressive destination activation.
- Responsive Chromium checks: 390, 430, 768, 1024, 1280, 1366, 1440, 1536, and 1920px; one canvas, ten labels, no horizontal overflow.
- Firefox headless was attempted, but this environment does not provide a usable WebGL context for Playwright Firefox; this is recorded as an environment limitation rather than a claimed pass.
- `npm run test:homepage-globe` (if unavailable, the phase homepage contract), performance guardrails, cache consistency, and secret scan are required before release.
