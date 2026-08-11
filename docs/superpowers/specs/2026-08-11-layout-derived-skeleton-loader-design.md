# Layout-Derived Skeleton Loader

## Goal

Replace the current set of route-specific, hand-authored skeleton templates with one loader that mirrors the visible structure of every public page automatically.

## Approach

The loader keeps the existing early loading curtain, then—once the document's layout is available—builds a fixed, non-interactive overlay from the geometry of the live page. It identifies visible structural elements in the shared navigation, main content, and footer, and produces skeleton blocks matching their rendered bounds:

- Images and video regions become media placeholders.
- Text, headings, labels, links, and buttons become line or control placeholders.
- Cards, form controls, maps, and other visual containers become surface placeholders.
- Decorative, hidden, zero-size, and loader-owned nodes are ignored.

The overlay is derived from each page's actual DOM and computed position rather than a page-name switch. A design change therefore changes the skeleton automatically on the next load. The loader does not clone content, expose content beneath the curtain, or add interactive targets.

## Lifecycle

1. Critical CSS immediately covers the page when `html.lg-loading` is present.
2. `assets/skeleton.js` waits for DOM layout, batches the required geometry reads, and mounts a semantic `aria-hidden` overlay.
3. Resource tracking and the existing timeout determine when the curtain fades out.
4. The loader removes the overlay and all temporary classes after completion.

## Accessibility & Performance

- The overlay is `aria-hidden`, `inert`, and `pointer-events: none`.
- Shimmer is disabled under `prefers-reduced-motion: reduce`.
- Loading is communicated through a visually-hidden `role="status"` message ending in an ellipsis.
- Geometry collection is batched once per loading cycle; no scrolling listeners or continuous measurements are used.
- Skeleton blocks inherit the actual page geometry, avoiding layout shift and duplicate content markup.

## Verification

- Add an automated structural test that opens every shipping page and verifies that the shared skeleton overlay mounts, contains blocks, covers visible page regions, and is removed after completion.
- Run the site’s applicable test/build checks and a browser smoke test across representative desktop and mobile layouts.

## Scope

The work is limited to the shared skeleton assets and associated verification. It does not redesign page content, navigation, or the live visual system.
