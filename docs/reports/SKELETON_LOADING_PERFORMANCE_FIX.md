# Skeleton loading performance fix

## Root cause

Every public shell began in `lg-loading` and shipped both a fixed viewport veil
and a generated full-page skeleton overlay. The overlay mirrored ready text,
navigation and media while the real document was already rendering beneath it.

## New behavior

- Static HTML, navigation, links, text, buttons and footer content render
  immediately.
- The shared loader tracks only unresolved `<img>` elements and explicitly
  marked CSS-background regions.
- A local placeholder appears only after a 150ms delay and retains the media
  element's own dimensions.
- Each image settles independently after `load` and `decode()`; no component
  waits for other media, galleries, logo loops or page scripts.
- Placeholders are decorative (`pointer-events: none`), expose only regional
  `aria-busy` state, and disable shimmer for reduced-motion users.
- Lake/Agrinova/Lake Agro placeholders retain their blue/teal or green family
  respectively. No page-level veil remains.

## QA

- Warm cache: placeholders are skipped when media is already complete before
  the 150ms threshold.
- Cold/throttled: tests delay image responses and confirm local media
  placeholders appear while real navigation, heading and links remain visible.
- Mobile: throttled checks run at 430px, 390px, 375px and 360px; local
  placeholders do not block navigation or scrolling.
- Public shell audit covers every root public HTML document, including Home,
  About, Leadership, Contact and all public company pages.
- Visual check: a throttled 390px Lake Oil load showed its real navigation,
  heading and copy with only the unresolved hero media locally placeholdered.

## Result

There is no fixed full-page skeleton overlay, page-level opacity mask or
`lg-loading` document gate in the public HTML output.
