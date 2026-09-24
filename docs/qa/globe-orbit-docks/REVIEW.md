# Orbit Dock callout review

Starting HEAD: `19770620c01db5328a58d24a3be58a97453c8007`.
Restore tag: `restore/pre-orbit-dock-20260925`.

Only the annotation source, its homepage styles, rebuilt globe bundle and QA were changed. Globe model, camera, dimensions, lighting, texture, geographic coordinates, rotation, drag, markers and yellow route timing remain unchanged.

The previous polylines are replaced with ten quadratic SVG paths and tiny docking dots. Fixed authored angles use two invisible bands at 1.10 and 1.16 times the projected radius. Each path uses normalized SVG pathLength=1 and stroke-dashoffset progression; flags/names fade and translate 5px after the line draws. Reduced motion shows the final state immediately. Reveal follows existing destination marker timing, rather than accelerating the locked yellow markers to match the suggested faster stagger.

Clockwise angles from the right horizon; I = inner, O = outer:

| Country | Desktop / landscape tablet | Portrait tablet | Phone |
|---|---|---|---|
| UAE | -52 O | -52 O | -57 O |
| Ethiopia | -32 I | -33 I | -35 I |
| Uganda | -14 O | -15 O | -17 O |
| Kenya | 2 I | 2 I | 1 I |
| Rwanda | 18 O | 19 O | 19 O |
| Tanzania | 34 I | 35 I | 37 I |
| Burundi | 49 O | 51 O | 54 O |
| Mozambique | 65 I | 68 I | 73 I |
| Zambia | 87 O | 91 O | 101 O |
| DR Congo | 151 I | 151 I | 151 I |

The 12 requested viewport checks found ten visible labels and paths, zero path intersections, zero foreign-label collisions, zero label overlaps and zero clipped labels. Maximum connector length is about 242px desktop, 199px landscape tablet, 152px portrait tablet and 125px phone. The enforced limit is one projected globe radius. Central geographic markers necessarily require nearly a radius to reach the outer halo; these are outward connectors, not routes across the globe center.

Screenshots for desktop, portrait/landscape tablet and phones were inspected. The full-cycle recording was captured and sampled frames across rotation, drawing, hold and retraction were visually reviewed. Animation instrumentation verified hidden, partial, full and retract states for every path. See `animation-verification.json` and `full-cycle.webm`.

## Remaining visual limitation

The existing fixed back-to-top control can cover a mobile label at particular scroll positions. Moving all phone labels left to reserve its corridor caused foreign-label collisions, so that experiment was reverted. The global control was outside the permitted annotation scope. Final visual acceptance and freeze remain pending resolution of this overlap; geometry QA alone does not establish complete mobile visual acceptance.
