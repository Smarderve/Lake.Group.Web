# History Aceternity Cards Audit

Restore point: `pre-history-aceternity-cards-20260909` (`cfb01eb23a63441af4ce5c48feaec5c1bc029ff1`)

The required `@aceternity/3d-card-demo` registry was inspected. The obtained
files are retained in `assets/history-aceternity/3d-card.tsx`,
`3d-card-demo.tsx`, and `3d-card.json`.

The implementation adapts the supplied `CardContainer` motion system: a
perspective wrapper, preserve-3d card surface, pointer normalisation, one
shared pending RAF, and smooth neutral reset. The History card is intentionally
one rigid surface. No `CardItem` translateZ behavior is used; heading, country,
description, and status remain attached to the same plane.

Each year group now receives a measured local SVG overlay. Cubic Bézier paths
start at the milestone dot center and terminate at the leading card edge. A
single-event year gets one branch; multi-event years share the same dot origin
and fan into a compact tree. Paths reveal with the existing year state and do
not animate perpetually. Layout measurement runs on initial load, font settle,
resize, and breakpoint changes only.

Cards use warm white surfaces, restrained shadows, Lake blue typography and
yellow only for milestones/status. Desktop pointer tilt is capped at 3.2°;
mobile and reduced-motion modes remain static while branches stay visible.

QA verified 35 branch paths for 15 year groups, no horizontal overflow at
390, 430, 768, 1024, 1280, 1366, 1440, 1536, and 1920px, and whole-card hover
tilt with neutral reset. Existing 2026 tail and progress mechanics remain in
`assets/history-timeline.js`. Performance guardrails, cache consistency and
secret scan passed. The broad Phase 03 visual runner encountered unrelated
Playwright resource exhaustion after the about page; the focused History
browser checks passed.
