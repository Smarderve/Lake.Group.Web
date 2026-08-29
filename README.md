# Lake Group Website

## Repository structure

```
lake.group.web/
├── *.html                  All pages (static site root — what ships)
├── assets/                 CSS, JS, fonts, icons, images (incl. assets/images/our-story/)
├── sw.js                   Service worker
├── manifest.webmanifest    PWA manifest
├── 404.html / offline.html / robots.txt / sitemap.xml / favicon.ico
├── scripts/                Dev tooling & one-off migration/QA scripts
├── docs/                   Documentation, reports, and generated deliverables
├── backend/                Self-hosted Payload CMS (Postgres + API, docker-compose)
├── archive/                Orphaned/retired projects & snapshots (lake-3d, _tmp)
├── vercel.json / lighthouserc.json / package.json / .gitignore / README.md
└── .github/                CI workflows (Lighthouse, accessibility)
```

Everything the live site needs is served from the root. `docs/` and
`archive/` hold non-served material; `backend/` is the CMS that will
drive this site's data.

## Developer guides

- **[Backend Developer Guide](docs/backend-guide.html)** — everything about
  the Payload CMS backend: architecture, collections, REST API, Docker &
  deployment, seeding, and wiring the static pages to it.
- **[Website Developer Guide](docs/developer-guide.html)** — the static
  site's architecture, systems, and page reference.


## For the content team — updating the website without touching code

The website's news, leadership, company and country content is managed in a
private online editor called the **CMS** (Content Management System) — a
bit like a blog dashboard. You do not need any technical knowledge to use
it, and you will never have to touch a file or write code.

### Logging in

1. Open the CMS in your browser at the address your IT team shares with you
   (it ends in `/admin`).
2. The very first time anyone opens it, the site asks you to **create the
   first account** — your name, your email address, and a password you
   choose. Please pick a strong password and keep it safe; you will use it
   every time you log in.
3. On later visits, just enter your email and password.

> If you ever forget your password, ask your IT team — they can create a
> new account or reset one from the command line.

### Adding a news article

1. In the menu on the left, click **News Articles**.
2. Click the **Create New** button.
3. Fill in the article:
   - **Title** — the headline visitors will see.
   - **Date** — when the article is dated (usually today).
   - **Category** — pick from the list (Expansion, LPG, Awards, Business,
     Logistics, Events, Sports, CSR, Announcements).
   - **Summary** — one or two sentences shown on the news cards.
   - **Body** — write your article in the main text area; press Enter to
     start a new paragraph.
   - **Banner image** and **gallery images** — optional photos.
4. Choose a **status**:
   - **Draft** — saved but not visible to visitors. Great for work in progress.
   - **Published** — live on the website.
   - **Archived** — hidden again after it has been live.
5. Click **Save**. Published articles appear on the News page right away.

### Managing leadership profiles

1. In the menu on the left, click **Leaders**.
2. Click an existing person's name to edit their profile, or **Create New**
   for someone new.
3. Fill in the fields:
   - **Name** and **Role** (their job title, e.g. "Executive Chairman & Owner").
   - **Unit** — which part of the group they belong to.
   - **Summary** — one line about them.
   - **Bio** — their profile text.
   - **Quote** — an optional quote to highlight.
   - **Responsibilities** — a short list of what they oversee.
   - **Facts** — quick facts shown on their profile.
   - **Photo** — their portrait.
4. Two switches matter for ordering: **Featured** highlights the Executive
   Chairman slot on the leadership page, and **Sort order** controls the
   order people appear in.
5. Click **Save**. Changes show on the Leadership page immediately.

### Managing companies & countries

- **Companies** — the group's subsidiaries (Lake Oil, Lake Steel, etc.).
  Each has a name, division (e.g. Energies, Manufacturing, Logistics),
  tagline, description, logo, and key statistics. These feed the subsidiary
  pages and the website menu.
- **Countries** — the countries Lake Group operates in, with their flags,
  map position and a short summary. These feed the Africa operations map.

### Images

The **Media** library stores every uploaded picture — news banners, leader
portraits, company logos and country flags. You can browse it, upload new
images, and reuse anything in it when adding news, leaders or companies.

### Where each piece of content appears

| What you edit | Where it shows on the website |
| ------------- | ----------------------------- |
| News Articles | News page and article pages |
| Leaders | Leadership page and individual profiles |
| Companies | Subsidiary pages and the main menu |
| Countries | Africa operations map |
| Media | Images used across all of the above |

*If you make a mistake, don't worry — edits are saved as you go and can be
changed again at any time. Ask your IT team to point you at the CMS
address and set up your first login.*

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

2. **The 3D hero** was loaded as an ES module. Module scripts are blocked
   under `file://`. Fixed by bundling a React + `react-globe.gl` island into
   a classic IIFE: `assets/hero-globe.bundle.js`, built via
   `npm run build:hero-globe` (`scripts/build_hero_globe.js`). `index.html`
   lazy-loads that bundle when `#fuel-experience` nears the viewport.

**If you edit `assets/hero-globe/*`, re-run `npm run build:hero-globe`** —
editing the source alone won't change what's loaded by `index.html`.
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
(30,000+ employees, 1,600+ trucks, 154 fuel stations, 10 countries) with a link
back to the main site. Click/tap or press Space/→ to skip ahead; it also
auto-advances on a timer. Not yet linked from the main nav — open it
directly as `our-story.html`, or add a link from `index.html` if you want
it discoverable.

## `archive/lake-3d/` — not currently part of the live site

`archive/lake-3d/` is a separate Next.js project (moved from the repo
root when it was archived): a much more elaborate scroll-driven cinematic
3D experience (see `archive/lake-3d/README.md`). It:

- Runs as its own dev server on port 3001 (`npm run dev` inside `archive/lake-3d/`)
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

## 3D hero (`assets/hero-globe/`)

Homepage globe in `#fuel-experience` / `#experience-3d-panel`. Source is a
small React island using `react-globe.gl`, bundled to
`assets/hero-globe.bundle.js`. Textures are local under
`assets/images/globe/` (no CDN). Nine hub-spoke markers (Dar HQ → 8 sites)
with brand-yellow arcs; respects `prefers-reduced-motion`.

Rebuild: `npm run build:hero-globe`

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
