# Homepage Globe Rebuild Audit

Date: 2026-09-09  
Restore point: `pre-aceternity-globe-rebuild-20260909` (`6ef28453a6502e9ee35c6c5b5dcaec286d5443bd`)

## Implementation

The homepage globe remains one isolated lazy-loaded island at `#experience-3d-panel`.
The prior globe configuration was replaced by the Aceternity adaptation in
`assets/hero-globe/aceternity-foundation.js` and the updated
`assets/hero-globe/HeroGlobe.jsx`; no second canvas or competing visual globe was
added. The supplied sources are recorded in
`assets/hero-globe/aceternity-supplied/components/ui/globe.tsx` and
`3d-globe.tsx`, with their demo entry points alongside them.

`@aceternity/globe-demo` contributed the `World`/ThreeGlobe arc data shape,
progressive arc dash treatment, material controls and lighting defaults.
`@aceternity/3d-globe-demo` contributed the lat/lng-to-3D projection contract,
terrain/bump scale, marker pin geometry and Fresnel atmosphere relationship.
Lake-specific code adapts those contracts to the existing static-site bundle,
exact route sequence and DOM label system. The supplied UI files are retained
for auditability; Next/Tailwind demo shells are not mounted independently.

## Behavior retained and verified

- Tanzania is the origin and the camera settles on Africa (`lat -4`, `lng 33`,
  `altitude 1.85`) before routes begin.
- Exact countries and coordinates remain the approved ten: Tanzania, Kenya,
  Uganda, Rwanda, Burundi, DR Congo, Zambia, Mozambique, Ethiopia and UAE.
- Routes draw progressively in thin `#FFF200` 3D arcs, then reveal destination
  markers and restrained arrival rings.
- Labels use deterministic priority, leader lines, front-hemisphere filtering,
  hysteresis and collision relocation; labels are never hidden to solve overlap.
- IntersectionObserver, `document.hidden`, reduced-motion handling, one RAF
  owner, timer cleanup and a 1.5 DPR cap remain in place.

## QA evidence

Before and after captures at 1440px are stored at
`docs/qa/home-globe-before-1440.png` and `docs/qa/home-globe-after-1440.png`.
The homepage visual contract passed in both desktop and mobile runs. The
performance guardrail, cache consistency and secret scan all passed.

The sequence was inspected through the existing progressive intro, Tanzania
settle, nine destination routes, network hold and reset cycle. Chrome and
Firefox browser automation was attempted; the repository's Playwright browser
launcher did not emit a usable capture in this environment, so interactive
browser coverage is limited to the passing project homepage contract runner.

## Limitations

The upstream Aceternity demos assume Next.js, Tailwind aliases and remote demo
assets. This static Vercel site therefore uses the supplied source as an
adapted Three.js/ThreeGlobe foundation and keeps local Lake textures and labels.
The upstream demo's sample cities and external avatar URLs are intentionally not
used in production.
