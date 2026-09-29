# Homepage Globe Quality Audit

Date: 2026-09-09  
Route: `index.html` · “One Network. Ten Countries.”

## Architecture

The homepage uses one route-scoped React island mounted by `assets/hero-globe/mount.jsx` and bundled to `assets/hero-globe.bundle.js`. The bundle is loaded after idle or when the section approaches the viewport. The renderer is `react-globe.gl`; no second globe, canvas label layer, or duplicate WebGL island was added.

Aceternity globe patterns were used as interaction references only. No Aceternity demo component or dependency was installed, and no demo content or coordinates were shipped.

## Motion and routes

The camera settles to an Africa-facing POV (`lat: -4`, `lng: 33`) with cubic ease-in-out motion. Controls allow restrained user rotation while disabling zoom and pan. Routes are great-circle arcs from Tanzania and awaken in the fixed sequence Kenya, Uganda, Rwanda, Burundi, DR Congo, Zambia, Mozambique, Ethiopia, UAE. Each destination marker and label is revealed after its route completes; the sequence then holds before its controlled replay.

Routes are thin Sunrise Yellow arcs with low altitude, no neon bloom, no thick tubes, and globe depth testing supplied by the WebGL renderer. The final composition keeps East, Central, and Southern Africa dominant, with UAE toward the upper-right edge.

## Label system

There is one authoritative visible label system: projected HTML markers returned by `react-globe.gl`. Each approved location has a canonical coordinate, local SVG flag, semantic side, and intentional cluster offset.

The layout pass runs outside the WebGL render loop at 180ms cadence. It caches label dimensions, sorts by deterministic priority (Tanzania first), projects marker positions, evaluates collision and viewport-edge penalties, and chooses the lowest-cost displacement from a fixed candidate set. Colliding labels are displaced rather than hidden. A thin leader line is resized and rotated from the geographic marker to the displaced label. This keeps labels attached while preserving readability.

Visibility comes from the globe's hemisphere test. Back-facing markers receive `is-behind-globe`; collision resolution never uses disappearance as a solution. The stable offset map gives hysteresis-like behavior during small camera movements and avoids random reflow. Mobile uses the same ten labels, stronger cluster offsets, smaller readable type, and panel-edge clamping.

## Lifecycle and performance

- One `requestAnimationFrame` owner handles camera and route timing; the route dash refreshes React at a capped 50ms cadence.
- `IntersectionObserver` gates the sequence and the globe's animation pauses when the panel is offscreen.
- `visibilitychange` pauses GPU animation while the document is hidden.
- Renderer DPR is capped at `1.5`.
- React cleanup cancels timers, RAF, intervals, camera cancellation, observers, and event listeners.
- Pointer interaction raycasting is disabled because the presentation does not need per-frame picking.
- Reduced-motion mode immediately presents the complete network and all front-facing labels without cinematic animation.

## Responsive QA

Rendered checks covered 390, 430, 768, 1024, 1280, 1366, 1440, 1536, and 1920px viewports. At each width the final state contained ten unique approved labels, zero measured visible-label overlaps, zero label clipping, and zero horizontal overflow. The 1440px final view was captured at `docs/qa/phase-02-homepage/globe-final-1440.png`.

The animated sequence was observed at 1440px: Tanzania appeared first, followed by progressive destination additions at approximately 5s (Kenya), 7.5s (Uganda/Rwanda), 10s (Burundi), and 13s (DR Congo/Zambia), with later routes continuing in order.

## Country label matrix

| Country | Coordinate source | Flag | Unique | Front-facing QA | Cluster/edge handling |
| --- | --- | --- | --- | --- | --- |
| Tanzania | Approved Dar es Salaam anchor | Local SVG | Pass | Pass | Highest priority, east offset |
| Kenya | Approved Nairobi anchor | Local SVG | Pass | Pass | Upper-right offset |
| Uganda | Approved Kampala anchor | Local SVG | Pass | Pass | Upper-left offset |
| Rwanda | Approved Kigali anchor | Local SVG | Pass | Pass | Left offset |
| Burundi | Approved Bujumbura anchor | Local SVG | Pass | Pass | Lower-left offset |
| DR Congo | Approved Kinshasa anchor | Local SVG | Pass | Pass | Lower-left displacement |
| Zambia | Approved Lusaka anchor | Local SVG | Pass | Pass | Lower-left mobile displacement |
| Mozambique | Approved Maputo anchor | Local SVG | Pass | Pass | East offset |
| Ethiopia | Approved Addis Ababa anchor | Local SVG | Pass | Pass | Upper-right offset |
| UAE | Approved Abu Dhabi anchor | Local SVG | Pass | Pass | Upper-right edge clamp |

## Validation and limitations

Passed `npm run test:performance-guardrails`, `npm run test:cache-consistency`, and `npm run secret:scan`. The globe bundle rebuilt successfully with esbuild. Existing homepage visual tests remain the primary browser regression coverage; unrelated stale content tests in the dirty worktree still report pre-existing asset/content expectation failures. As with any WebGL experience, devices without WebGL use the existing accessible error state.
