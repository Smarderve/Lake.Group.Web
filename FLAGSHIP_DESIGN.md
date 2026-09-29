# Lake Group — Flagship Design System ("Meridian") Rollout Guide

The flagship redesign replaces the legacy `assets/theme.css` + `assets/motion.js`
pair with `assets/flagship.css` + `assets/flagship-motion.js` on a page-by-page
basis. A migrated page loads the new pair INSTEAD of the old one; un-migrated
pages keep the old pair (both remain precached in `sw.js` until rollout
completes). Reference implementation: `about.html`. Applied at scale by the
services/divisions migration (9 pages, journal:
`scripts/_migrate_services_notes.md`) and the company/network migration
(9 pages, journal: `scripts/_migrate_company_notes.md`).

## 1. Design language

A precision-engineering editorial system:

- **Ink ↔ paper rhythm** — immersive ink-navy bands (`--ink` #070C1E)
  alternating with warm porcelain sections (`--paper` #F6F5F1) down every page.
- **Type** — Bebas Neue as oversized display type; Inter for body; Playfair
  Display italic reserved for pull quotes (`.fs-serif-quote`).
- **Meridian tick** — signature motif: an 8×8px square of brand gold seated on
  a hairline rule. Appears in eyebrows, rules, stat baselines, nav/footer
  hairlines, register rows.
- **Corner registration brackets** (`.fs-corners`) — technical-drawing corners
  on media and framed blocks.
- **Numbered section markers** (`.fs-marker`, "01 — Our Story") give pages a
  drafting-set rhythm.
- **Sharp geometry** — radius 0/2px only. Gold #FFD700 used surgically (ticks,
  rules, key numerals, primary CTA), never as a decoration wash.
- Never style `.experience-3d-*` or `#fuel-experience` — owned elsewhere.

## 2. Tokens (defined in `flagship.css :root`)

| Group | Tokens |
|---|---|
| Brand | `--blue` #1D3EA8 · `--blue-deep` #12297A · `--navy` #0E1F5A · `--gold` #FFD700 · `--gold-deep` #C79B00 (WCAG-safe on light) · `--red` #CC1E1E |
| Ink (dark bands) | `--ink` #070C1E · `--ink-2` #0A1128 · `--ink-3` #101A3D · `--ink-line`, `--ink-line-2` (hairlines) · `--ink-text`, `--ink-mute` |
| Paper (light) | `--paper` #F6F5F1 · `--paper-2` #EFEDE6 · `--surface` #FFF · `--text` #0A1024 · `--mute` #4E5568 · `--line`, `--line-2` |
| Legacy aliases | `--blue2/3`, `--yellow/2/3`, `--white`, `--offwhite`, `--light`, `--muted`, `--border`, `--radius` (0), `--radius-lg` (2px) — so shared widgets keep resolving |
| Spacing | `--sp-1` (4px) … `--sp-36` (144px), 4px base scale |
| Type scale | `--fs-hero` (clamp 4–9.5rem) · `--fs-display` · `--fs-title` · `--fs-lede` · `--fs-body` · `--fs-small` · `--fs-micro` · `--fs-stat`; families `--font-display/body/serif` |
| Chrome | `--nav-h` 76px |
| Elevation | `--shadow-1/2/3` (used sparingly; hairlines carry structure) |
| Motion | `--ease-out` (expo-out) · `--ease-inout` · `--ease-snap` · `--dur-1` 0.22s … `--dur-4` 1.3s |

Pages that used legacy page-local variables map them in the page layer, e.g.
`:root{--amber:var(--gold-deep);--amber2:var(--gold);--navy:var(--ink);--bone:var(--paper-2)}`
as a safety net for stragglers. `contact/careers`-style map chrome may need
`--shadow`/`--shadow-lg` aliases (see company journal).

## 3. Component inventory

**Motifs / typography**
- `.fs-eyebrow` — tick + tracked uppercase micro label (`.on-dark` or inside
  `.fs-on-dark` for gold-on-ink)
- `.fs-rule` — hairline with seated tick (use on `<hr>`)
- `.fs-corners` — corner registration brackets (media, framed panels)
- `.fs-marker` > `.fs-marker-no` + label — numbered section marker
- `.fs-index` — oversized ghost outline numeral for section corners
- `.fs-display`, `.fs-hero-title`, `.fs-outline`, `.fs-outline-gold`,
  `.fs-serif-quote`, `.fs-lede`

**Layout**
- `.container`/`.fs-container` (1240px) · `.fs-container-wide` (1440px) ·
  `.fs-container-narrow` (880px)
- `.fs-section` / `.fs-section-sm` (also legacy `.section`/`.section-sm`)
- Surfaces: `.fs-on-dark` (= `.section-dark`) ink band · `.fs-surface-2` ·
  `.section-light`/`.section-offwhite`/`.section-bone` → `--paper-2`
- Splits: `.fs-split` (5/7) · `.fs-split-even` · `.fs-split-rev` (7/5); all
  collapse ≤880px
- Grids: `.grid-2/3/4` (legacy names preserved); mobile guard collapses any
  inline `grid-template-columns` style ≤720px

**Blocks**
- `.fs-head` / `.fs-head-center` — section header stack (eyebrow + display + lede)
- Legacy header names restyled: `.section-label`, `.section-title`,
  `.section-subtitle`, `.divider-yellow`
- Buttons: `.btn` + `.btn-primary` (gold, notched corner) / `.btn-blue` /
  `.btn-white` / `.btn-outline`|`.btn-ghost` (on dark) /
  `.btn-outline-dark` / `.btn-sm` / `.btn-lg`; `.is-loading` spinner;
  `.fs-arrow` affordance; primary CTAs get magnetic hover automatically
- Cards: `.card`/`.fs-card` (+ `.card-body`, `.fs-card-no` drafting number);
  gold top-left tick grows on hover; auto-adapts inside `.fs-on-dark`
- Stats: `.fs-stat` > `.fs-stat-no` (+ `em` for gold digit) + `.fs-stat-label`;
  baseline hairline + tick; `.fs-stat-rail` for rows; legacy `.stat-number`/
  `.stat-label` restyled
- Media: `.fs-media` (+ img) · `.fs-media-caption` · `.photo-card` ·
  `.fs-band` full-bleed parallax band (`.fs-band-img` + `.fs-band-tint` +
  `.fs-band-content`, needs `data-fx-scroll` for parallax)
- Forms: `.form-group`, `.form-row` (unchanged markup, restyled)
- `.fs-table`, `.timeline`/`.fs-timeline` (drafting rail, Bebas years),
  `.badge{-yellow|-blue|-green|-red}` (`.badge-amber`→`.badge-yellow`,
  `.badge-navy`→`.badge-blue` also styled), `.country-tag`, `.alert`,
  `.tab-nav`/`.tab-pane`

**Chrome (restyled legacy markup — do not change the HTML)**
- `.site-nav` ink drafting bar: `.nav-inner`, `.nav-logo` (white plate),
  `.nav-links`, `.nav-dropdown`, `.dd-label`, `.nav-cta`, `.nav-toggle`,
  `.nav-mobile`, `.lang-switcher`/`.lang-btn`
- `.page-hero` ink masthead: faint meridian grid + gold meridian line;
  `.breadcrumb`, `.eyebrow`, `h1` (Bebas at `--fs-hero`; `em`/`.fs-outline`
  for gold-outline word), optional `.fs-hero-meta` strip and `.hero-media`
  photographic plate (page layer: `position:absolute;inset:0;opacity:.15`)
- `.site-footer` ink sheet: `.footer-grid`, `.footer-brand`, `.footer-logo`
  (white plate), `.footer-motto`, `.footer-col h5` (tick heading),
  `.footer-bottom`, `.footer-social`/`.social-link`
- Chat widget `#chat-widget` etc. — fully restyled, markup untouched

## 4. Nav / footer template

As implemented in `about.html` (and byte-identical across all pages): keep the
existing `<nav class="site-nav">…</nav>`, `<div class="nav-mobile">…</div>`,
`<footer class="site-footer">…</footer>` and `#chat-widget` markup **verbatim**,
including every `data-i18n` key, the EN/FR/SW `.lang-switcher`, and per-page
footer keys (e.g. `about.47`–`about.52` social/email/copyright keys on
about.html). `flagship.css` restyles all of those class names directly. Inline
legacy styles inside chrome (e.g. footer country-tag backgrounds) are
overridden by flagship.css where needed — leave them in place.

## 5. Section composition recipes

1. **Page hero**: `.page-hero` > `.container` > `.breadcrumb` + `.eyebrow` +
   `h1` + lede `p`. Optional `.hero-media` photo plate (same image the page
   used before, opacity .15 under the grid) and `.fs-hero-meta`.
2. **Editorial split** (about.html §01): `.fs-section` > `.fs-split`; left =
   `.fs-marker` + `.fs-display` + `hr.fs-rule` + copy + buttons; right =
   2×2 `.fs-stat` board + `.fs-media.fs-corners` figure.
3. **Ink band** (about.html §02–03): `.fs-section.fs-on-dark` >
   `.fs-split-even` of marker/display/rule/copy columns; follow with a
   hairline tile grid (about's `.val-grid`/`.val-tile` pattern: 1px
   `--ink-line-2` borders, gold corner tick, icon in hairline square).
4. **Register / index rows** (services.html): `.div-index` border-top +
   `.div-row` grid rows (numeral · title · description), gold tick on hover;
   highlight a row on ink with `.div-row--map.fs-corners`.
5. **Stat rail on ink**: `.fs-on-dark` band + `.fs-stat-rail` of `.fs-stat`
   blocks (keep `data-count`/`data-suffix` — site.js animates them; new pages
   may use `data-fs-count` for the flagship counter).
6. **CTA band** (services.html): gold plate, ink notched corner
   (`clip-path` triangle), display h2 + `.btn` row.
7. **Spotlight** (about.html §04): `.fs-split` with `.fs-media.fs-corners`
   portrait + `.fs-serif-quote` pull quote.
8. **Full-bleed photo band**: `.fs-band[data-fx-scroll]` > `.fs-band-img`
   (background-image) + `.fs-band-tint` + `.fs-band-content`.

## 6. Motion classes (`flagship-motion.js`)

All reveal-hiding is gated behind `html.fs-motion` (added at runtime only when
JS runs and reduced-motion is off) — content can never be stranded invisible.

- `.fx` + variant: `.fx-rise` (34px rise) · `.fx-left`/`.fx-right` ·
  `.fx-scale` · `.fx-mask` (upward wipe out of clip mask) · `.fx-wipe`
  (left→right, for rules/eyebrows) · `.fx-clip` (frame opens, image settles
  from zoom). Stagger via `--fx-d` (seconds).
- **Auto-tagger**: untagged children of `.fs-section > .container` (and
  `.section > .container`), grid cells (`.grid-*`, `.fs-stat-rail`), and
  standalone `.fs-media`/`.photo-card` get variants automatically — most pages
  need zero hand-tagging. Hand-placed `.fx`/`.reveal` classes are respected.
  Skip zones: `#fuel-experience`, `.experience-3d`, `.our-story-embed`,
  `.ose-stage`, nav, `.nav-mobile`, `#lightbox`, `#chat-widget`, `.page-hero`.
- Legacy `.reveal` keeps animating (gets `.visible` + `.in`).
- Hero entrance choreography is CSS-only (breadcrumb → eyebrow → h1 mask →
  lede → meta).
- `[data-fx-scroll]` gets `--fxp` (0→1 viewport progress) for parallax.
- Nav hide-on-scroll-down / show-on-scroll-up; `.nav-scrolled` elevation.
- Counters: `[data-fs-count]` (flagship) and legacy `[data-count]` if site.js
  hasn't claimed it; 4s safety flush so counters never stay stuck.
- Magnetic hover on `.btn-primary`/`[data-magnetic]` (pointer:fine only).
- `prefers-reduced-motion: reduce` inerts everything through a single gate.

## 7. Per-page migration checklist

1. `rg -o 'data-i18n' page.html | wc -l` — record the baseline count.
2. Replace BOTH legacy inline `<style>` blocks with one compact
   "MERIDIAN PAGE LAYER" block: page-specific compositions only; map legacy
   page-local vars to Meridian tokens in `:root` as a safety net. Keep any
   embedded-experience CSS (e.g. about.html's OSE block) verbatim.
3. Swap `assets/theme.css` → `assets/flagship.css`;
   `assets/motion.js` → `assets/flagship-motion.js` (stays LAST in the chain).
   Script order otherwise untouched: i18n-content → i18n → site → flexsearch →
   assistant-kb → assistant → (page scripts) → pwa → flagship-motion.
4. Preserve byte-for-byte: head tags (meta/OG/canonical/JSON-LD/manifest/
   theme-color/favicons/title), nav + nav-mobile + footer + chat widget markup,
   form IDs/names, map/embed wiring, all `data-i18n*` attributes and copy,
   `data-count`/`data-suffix`, `alt` attributes, exactly one `h1`.
5. Recompose body sections using §5 recipes; strip legacy inline styles from
   the sections you own.
6. Verify:
   - `data-i18n` count unchanged (`git show HEAD:page.html | rg -o 'data-i18n' | wc -l`)
   - zero console errors (headless Chrome against `http://127.0.0.1:8734/`)
   - screenshots at 1440 and 390 (top/mid/footer)
   - `document.documentElement.scrollWidth <= 390` at 390px viewport
   - after scrolling through, no `.fx`/`.reveal` element left at opacity 0
   - `LakeI18n.apply('sw')` translates the redesigned DOM (spot-check nodes)
7. Commit only the pages you own.

## 8. Service worker

`sw.js` precaches BOTH pairs during rollout: `assets/theme.css` +
`assets/motion.js` (legacy pages) and `assets/flagship.css` +
`assets/flagship-motion.js` (migrated pages). Bump `VERSION` whenever the
precache list or any precached asset changes. Once every page is migrated,
drop the legacy pair from the precache and from the repo.

## 9. Verification log (about.html reference)

- Head/chrome/i18n invariants vs `git show HEAD:about.html`: data-i18n 178/178,
  alt 20/20, data-count 3/3, data-i18n-html 14/14, data-i18n-aria 2/2,
  placeholders 1/1, one h1, head tags identical, OSE cinematic embed untouched.
- Headless-Chrome QA @ 127.0.0.1:8734 — see final report: console clean,
  1440/390 top/mid/footer screenshots in `.shots/fs-about-*`, scrollWidth 390,
  no stranded reveals, `LakeI18n.apply('sw')` translates hero/nav/footer.
