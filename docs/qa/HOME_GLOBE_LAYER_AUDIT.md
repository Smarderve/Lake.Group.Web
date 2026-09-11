# Homepage globe layer audit

Target: `index.html`, “One Network. Ten Countries.”

| Layer | Background | Opacity | z-index | Position | Blend mode | Filter | Pointer events | Repair |
|---|---|---:|---:|---|---|---|---|---|
| `.experience-3d` section | `var(--blue3)` | 1 | auto | static | normal | none | auto | Retained as the single continuous section surface. |
| `.experience-3d-grid` | transparent | 1 | auto | static grid | normal | none | auto | Retained. |
| `.experience-3d-viewport` | formerly `var(--blue3)` | 1 | auto | relative | normal | none | auto | Made transparent so it cannot read as a nested panel. |
| `#hero-globe-root` | transparent | 1 | 0 | absolute, inset 0 | normal | none | auto | Retained as the mount and input boundary. |
| `#hero-globe-root > .experience` | formerly near-black radial gradient | 1 | auto | relative | normal | none | auto | Gradient removed; this was the visible black rectangle. |
| `.experience::before` | formerly full-size star field | .32 | -1 | absolute, inset 0 | normal | mask gradient | none | Removed to eliminate a second rectangular compositing surface. |
| `.planet-halo` | broad blue radial wash | 1 | auto | absolute | normal | 24px blur | none | Removed; this was the flat cyan cast around the globe area. The WebGL atmosphere remains. |
| React Three Fiber wrapper | transparent | 1 | auto | relative | normal | none | auto | Retained. |
| WebGL canvas | transparent clear color | 1 | auto | absolute, inset 0 | normal | none | auto; `touch-action: pan-y` | Renderer alpha is enabled and clear alpha is explicitly 0. Horizontal globe drag works after settle while vertical page scroll remains available. |
| Three.js scene | no background | 1 | n/a | WebGL scene | normal | none | n/a | Retained with no `scene.background`. |
| atmosphere mesh | transparent edge shader | max .19 | scene depth | globe-local | additive | shader falloff | n/a | Retained as a subtle Earth-edge atmosphere. |
| route layer | transparent Sunrise Yellow lines | .68 | scene depth | globe-local | normal | none | n/a | Retained and thinned to a one-pixel WebGL line. |
| marker layer | Sunrise Yellow spheres | 1 | scene depth | globe-local | normal | none | n/a | Reduced to approximately 4px destination cores and a restrained Tanzania origin. |
| `.leaders` SVG | transparent; pale lines | animated | auto | absolute, inset 0 | normal | none | none | Retained; cannot intercept input. |
| `.labels` | transparent | animated | auto | absolute, inset 0 | normal | text shadow only | none | Retained; cannot intercept input. |
| `.experience-3d-vignette` | blue gradient | 1 | 1 | absolute | normal | none | none | Legacy class is not present in this section’s DOM and therefore does not paint. |
| `.experience-3d-finale` | transparent | 0 unless legacy state | 3 | absolute | normal | none | none | Legacy class is not present in this section’s DOM and therefore does not paint. |

The former animation used `performance.now()`. Its time continued while the offscreen observer set the render loop to `never`, so the first visible frame could jump to the end. The repaired animation advances from frame deltas, pauses with rendering, and enables restrained pointer interaction after the 11.5-second settle.
