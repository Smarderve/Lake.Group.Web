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

Each year group now receives a measured local SVG overlay. A single-event year
gets one cubic Bézier branch. Multi-event years use one stronger curved primary
branch into a short shared spine, then lighter curved twigs to each card; this
avoids five independent spaghetti curves. Paths terminate at the card edge,
reveal with the existing year state, and do not animate perpetually. Layout
measurement runs on initial load, font settle, resize, and breakpoint changes
only.

Cards use warm white surfaces, restrained shadows, Lake blue typography and
yellow only for milestones/status. Desktop pointer tilt is capped at 3.2°;
mobile and reduced-motion modes remain static while branches stay visible.

QA verified 44 organized branch paths for 15 year groups, no horizontal overflow at
390, 430, 768, 1024, 1280, 1366, 1440, 1536, and 1920px, and whole-card hover
tilt with neutral reset. Existing 2026 tail and progress mechanics remain in
`assets/history-timeline.js`. Performance guardrails, cache consistency and
secret scan passed. The broad Phase 03 visual runner encountered unrelated
Playwright resource exhaustion after the about page; the focused History
browser checks passed.

The authoritative footer styles in `assets/phase-01-footer.css` now keep all
five social icons in one row at the available column width. All 42 active HTML
footers use the Iconify `simple-icons:linkedin` glyph with the required URL,
label, `target`, and `noopener noreferrer`; rendered centerlines match the
other social icons and the footer still reads Kigamboni.
