# Lake Group Website

## Critical fix: the site now works when opened directly (file://), not just when served over a web server

Both translations and the 3D hero used to silently fail if you opened
`index.html` by double-clicking it instead of serving the folder over
HTTP. Two separate causes, both fixed:

1. **Translations** used `fetch('assets/i18n-content.json')`, which
   browsers block under `file://` due to CORS policy (no visible error —
   it just silently never loads). Fixed by shipping the same data as
   `assets/i18n-content.js`, a plain `<script>`-loaded file that sets
   `window.__LAKE_I18N_CONTENT__`. `assets/i18n.js` now reads that global
   instead of fetching. Every page's `<head>`/`<body>` now loads
   `i18n-content.js` immediately before `i18n.js`.

2. **The 3D hero** was loaded as `<script type="module" src="assets/hero-3d.js">`.
   Module scripts are blocked entirely under `file://` (a stricter rule
   than plain `fetch()` — this applies even to local same-folder imports).
   Fixed by bundling `hero-3d.js` + the three.js import into a single
   classic script with no `import`/`export` statements:
   `assets/hero-3d.bundle.js`, built via `scripts/build_hero_bundle.sh`
   (uses esbuild). `index.html` now loads the bundle, not the raw module
   file. There was also a leftover explicit guard in the old code that
   detected `file://` and showed a "run a local server" message instead
   of trying to render — that's now removed since the bundle doesn't need
   it.

**If you edit `assets/hero-3d.js` in the future, re-run
`bash scripts/build_hero_bundle.sh` to regenerate the bundle** — editing
`hero-3d.js` alone won't change what's actually loaded by `index.html`.
Likewise, if you edit translations via `scripts/translation_dict.py`,
re-run `build_master_en.py` then `build_i18n_content.py` — that second
script now produces both `i18n-content.json` (for reference/tooling) and
`i18n-content.js` (what the site actually loads).

The site still works perfectly fine over a real web server too — both
fixes are protocol-agnostic.

## What's live

The 28 `.html` files in this directory (plus `assets/`) are the actual
Lake Group website — a static, multi-page site. This is what ships.

Shared chrome (navigation, mobile nav, footer, chat widget) is now
identical across every page, generated from the templates in
`scripts/templates/`. Don't hand-edit nav/footer markup in an individual
page — edit the template and re-run `scripts/normalize_nav.py`, or your
change will be inconsistent with every other page.

## `our-story.html` — cinematic brand story page

A standalone, full-screen animated "story" page in the same visual
language as the rest of the site (navy/gold), built from a slideshow
template: eight auto-advancing scenes with real Lake Group photography
(storage terminal, the founder, the truck fleet, LPG cylinders, GCCP
concrete trucks, the leadership team, AFICD containers, the logo) telling
the company's growth story from 2006 to today, ending on the key stats
(30,000+ employees, 1,200+ trucks, 152 stations, 8 countries) with a link
back to the main site. Click/tap or press Space/→ to skip ahead; it also
auto-advances on a timer. Not yet linked from the main nav — open it
directly as `our-story.html`, or add a link from `index.html` if you want
it discoverable.

## `lake-3d/` — not currently part of the live site

`lake-3d/` is a separate Next.js project: a much more elaborate
scroll-driven cinematic 3D experience (see `lake-3d/README.md`). It:

- Runs as its own dev server on port 3001 (`npm run dev` inside `lake-3d/`)
- Is **not linked from, embedded in, or referenced by** any of the live
  `.html` pages
- Cannot be embedded inline without either an iframe (not recommended for
  a hero section — separate document context, no shared styling/state,
  worse performance than a native embed) or migrating the whole site to
  Next.js (a much bigger undertaking than what's been done so far)

It's real, working code — not a stub — but right now it's an orphaned
artifact that adds no value to visitors because nothing points to it.
Two honest paths forward:

1. **Delete it.** If there's no plan to use it, it's just bytes in the
   repo. Low risk to remove.
2. **Use it as the basis for a future relaunch.** If the intent was
   eventually to migrate the whole site to Next.js and make this the new
   homepage hero, keep it and budget that as its own project — it's a
   bigger scope than a patch to the existing static site.

What I did **not** do: silently leave it in place with no explanation,
which is how it ended up orphaned in the first place.

## 3D hero (`assets/hero-3d.js`)

This is the 3D animation that's actually live, on the homepage. It was
rewritten for performance:

- Geometry buffers for the petrol stream are built once and updated in
  place every frame (`updateTubeBuffers`), instead of the original
  approach of calling `new THREE.TubeGeometry(...)` on nearly every frame
  — that repeated allocation was the main source of jank.
- An `IntersectionObserver` pauses the render loop when the hero scrolls
  out of view (in addition to the existing tab-visibility pause).
- A runtime FPS monitor (`maybeDemoteQuality`) detects sustained
  sub-30fps and demotes pixel ratio live, catching mid-tier devices that
  the boot-time low/high quality split misses.

## Translations (EN / FR / PT)

The previous i18n setup only ever translated nav/footer/hero text (about
35 strings) — every page's real content stayed in English regardless of
the language button clicked. That's now architecturally fixed:

- `assets/i18n.js` re-renders every `data-i18n`-tagged element on the page
  when the language changes, not just a fixed set of chrome elements.
- `assets/i18n-content.json` holds the EN/FR/PT dictionary for every
  tagged string across the whole site (currently **1,442 keys**).
- Translation coverage is partial: shared chrome, the chatbot, and the
  homepage are fully translated. Long-tail page-specific content (product
  specs, history timeline entries, leadership bios, etc.) currently shows
  English as a graceful fallback rather than a broken key or blank text.

To extend coverage: add entries to `PHRASES_FR`/`PHRASES_PT` (full
sentences) or `TERMS_FR`/`TERMS_PT` (short labels) in
`scripts/translation_dict.py`, then run:

```bash
python3 scripts/build_master_en.py
python3 scripts/build_i18n_content.py
```

This regenerates `assets/i18n-content.json`. No HTML changes needed for
new translations — only for new untagged content (see
`scripts/i18n_extract.py`).

## Other fixes made

- Removed ~17 pages' worth of dead `data-it="..."` attributes (leftover
  scaffolding from an abandoned translation tool that nothing ever read).
- Removed a `<script src="assets/i18n-content.js">` tag that 404'd on
  every page load (the file never existed).
- Fixed a duplicated `data-i18n-placeholder` attribute on the chat input.
- Fixed the chatbot's keyword matching (`assets/site.js`), which used to
  match substrings anywhere in a message — "hi" inside "this"/"history",
  "fuel" inside "refuel" — causing wrong replies. Now uses word-boundary
  matching and prefers the most specific keyword when several match.
- Fixed nav active-link highlighting, which used to match any href
  containing the current page's filename as a substring rather than
  comparing exact filenames.
