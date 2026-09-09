# Performance guardrails

These rules protect the static site from recurring runtime regressions.

- No uncontrolled perpetual `requestAnimationFrame` loop. Every loop has one owner, a start gate, and cancellation.
- Every animation, observer, timer, WebGL renderer, and React root has lifecycle cleanup.
- Pause heavy animation when its section is substantially offscreen and when the document is hidden.
- Pointer and scroll handlers record input and schedule one frame; they do not rerender a large subtree or perform expensive work directly.
- Batch layout reads before writes. Do not call `getBoundingClientRect()` repeatedly from an animation frame.
- Match image delivery dimensions to rendered dimensions; never use a 4K source for a small card without a measured reason.
- Keep page-specific heavy bundles route scoped. Careers upload code stays on Careers; globe code stays on Home.
- Make initialization idempotent and prevent duplicate script includes.
- Dispose WebGL geometries, materials, textures, and renderers when their owner unmounts.
- Profile new visual effects in Chrome and Firefox before shipping them.
- Keep service-worker cache names/versioning synchronized with asset query versions; test cold and warm navigations.
- Re-run the performance smoke checks after changes to navigation, animation, images, or service-worker routing.

