# Phase 0 — Discovery & Audit

**Repo:** Lake Group website (`lakegroup.vercel.app` source)
**Audit date:** 2026-08-10
**Method:** Read-only inspection. No file other than this document was created or modified.
**Scope note:** This checkout contains the static front-end site only. There is **no backend, database, or admin server in this repository** (see Task 0.6 and 0.8 for the two client-side "CMS-ready" hooks that expect one).

---

## Task 0.2 — Stack (documented first for structural context)

| Concern | Finding |
|---|---|
| Framework | **None (static multi-page HTML site).** 49 `.html` files at repo root; each page is a complete, hand-authored HTML document with inline `<style>`/`<script>` plus shared `assets/` files. No page-level build step, no templating engine at runtime. |
| React islands | Three small React islands, bundled to plain scripts: **hero globe** (`assets/hero-globe/` source → `assets/hero-globe.bundle.js` via `npm run build:hero-globe` / `scripts/build_hero_globe.js`, esbuild); **LogoLoop** (`assets/components/LogoLoop.jsx` + `logo-loop-mount.js`); **SplitText** (`assets/components/SplitText.jsx`). |
| Styling | Custom CSS. Design tokens in `assets/tokens.css`; main layout/theming in `assets/theme.css`, `assets/flagship.css`, `assets/home-redesign.css`, `assets/mobile.css`, `assets/skeleton.css`, `assets/split-text.css`, `assets/assistant.css`, `assets/ui-icons.css`, `assets/fonts/fonts.css`. Self-hosted fonts (Jost, Playfair Display, Material Symbols) under `assets/fonts/files/`. |
| JS | Vanilla ES5-style scripts in `assets/` (`site.js`, `motion.js`, `i18n.js`, `news.js`, `assistant.js`, `dashboard-cms.js`, `home-hero.js`, `pwa.js`, `skeleton.js`). No framework, no bundler for these. |
| Routing | Plain `.html` filenames; cross-page links point at `.html` files directly. Redirects (old slugs → new) and cache headers in `vercel.json`. 41 URLs in `sitemap.xml`. |
| Deployment | Vercel (`vercel.json`; `lighthouserc.json` CI). `package.json` also ships a Firebase-hosting script (`npm run serve` / `npm run deploy`) that is not the active deployment path. |
| PWA | `sw.js` service worker (version `v68`; precache + runtime caches) + `manifest.webmanifest` + `offline.html` / `404.html`. |
| i18n | `assets/i18n.js` re-renders `data-i18n` elements using `window.__LAKE_I18N_CONTENT__` loaded from `assets/i18n-content.js` (≈11,000 lines; EN/FR/PT/ES/SW/AR). No network fetch — deliberately reads a global so the site works under `file://`. |
| Icons | `<iconify-icon icon="mdi:...">` custom elements (Iconify web component, network-loaded) used sitewide; some inline SVGs (`assets/icons/*.svg`) and Material Symbols font. |
| Maps | Leaflet (`assets/vendor/leaflet/`) powers the Africa operations map in `africa-network.html`; the homepage globe uses `react-globe.gl` with local textures. |
| Separate subproject | `lake-3d/` — a full **Next.js 16** app (React 19, `three`, `@react-three/fiber`, framer-motion, Tailwind v4) — a cinematic 3D brand experience that runs on its own dev server (port 3001). It is **not linked from any live page** (orphaned; the README calls it archived, but it physically lives at the repo root). |

---

## Task 0.3 — Page / route inventory

All pages render **hardcoded content** (inline HTML and/or bundled JS data). The only "fetched" path is the news page's optional CMS call, which is **not configured** (see Task 0.6). 49 `.html` files exist; the sitemap lists 41 URLs.

### Marketing / corporate pages (all hardcoded)
| File | Content | Source of content |
|---|---|---|
| `index.html` | Homepage: hero slideshow (5 slides), key facts (employees/trucks/stations/countries), services overview, action gallery (10 companies), 3D globe, visual-diary coverflow, founder quote | Hardcoded HTML + inline JS (`ITEMS` array ≈ L2988) + `assets/home-hero.js` + `assets/hero-globe/locations.js` |
| `about.html` | Company story, mission/vision/values, CEO message, stats, leadership teaser | Hardcoded HTML (stats ≈ L499–501) |
| `our-story.html` | Full-screen cinematic 8-scene story page ending on stats | Hardcoded HTML (ending stats ≈ L553–556) |
| `history.html` | Timeline (2006 → present) | Hardcoded HTML (timeline starts ≈ L272) |
| `leadership.html` | Founder feature + 6 leadership cards | Hardcoded HTML (cards ≈ L499–560) |
| `leadership-{person}.html` ×7 | Individual leadership profiles (Ally Edha Awadh, Dileep Kumar, Bibhuti Singh, Biji Lapat, Sridhar Mani, Mohammed Khalid, Juma Nuru) | Hardcoded HTML |
| `csr.html`, `sustainability.html` | CSR & sustainability copy, stats | Hardcoded HTML |
| `investors.html` | Investor-relations narrative, financial highlights | Hardcoded HTML |
| `projects.html` | Major projects showcase | Hardcoded HTML |
| `gallery.html` | Photo gallery (dozens of hardcoded tiles with `data-src`/`data-cat`/`data-caption`) | Hardcoded HTML |
| `media-center.html` | Press releases / media kit | Hardcoded HTML |
| `careers.html` | Careers copy, values, mock application form | Hardcoded HTML (form posts nowhere) |
| `contact.html` | Per-division contact directory, JSON-LD, map | Hardcoded HTML (JSON-LD ≈ L254–275; division blocks ≈ L507+) |
| `station-locator.html` | Station search UI + 5 hardcoded sample stations | Hardcoded HTML (stations ≈ L348–363) |
| `africa-network.html` | Interactive Leaflet map + country/subsidiary lists | `assets/africa-network-map.js`, `assets/data_countries_africa.js`, HTML |
| `fleet.html` | Fleet page (1,200+ trucks, vehicle categories) | Hardcoded HTML |

### Subsidiary pages (all hardcoded)
`lake-oil.html`, `lake-gas.html`, `lake-lubes.html`, `lake-aviation.html`, `lake-steel.html`, `lake-trans.html`, `lake-premix-cement.html`, `gulf-aggregates.html`, `lake-buildings.html`, `lake-plastics.html`, `lake-cylinders.html`, `atl.html`, `aficd.html`, `acfs.html`, `aill.html`, `cross-country.html`, `ocean-galleria.html`, `lake-agro.html`, `services.html` (division index listing all subsidiaries).

### News (hardcoded dataset, CMS hook dormant)
| File | Content | Source |
|---|---|---|
| `news.html` | Featured article + card grid, categories, pagination, view-mode toggle | Rendered by `assets/news.js` from `window.LAKE_NEWS` (hardcoded in `assets/news-data.js`) |
| `news-article.html` | Single article (`?id=N`) | Same `window.LAKE_NEWS` dataset |

### Console / dashboard pages (hardcoded; mock or indicative data)
| File | Content | Notes |
|---|---|---|
| `dashboard.html` | "Content Management Console" login + admin UI | Backed by `assets/dashboard-cms.js`; talks to a Payload CMS only if `window.LAKE_CMS_API_URL` is set — it is **not**, so the console is effectively offline. |
| `lake-group-financial-dashboard.html` | Financial dashboard: $1B revenue (Forbes 2017), metrics, revenue projections | All figures hardcoded; projections explicitly labelled "indicative estimates" (≈ L643–724) |
| `lake-group-org-chart.html` | Org chart with "$1B Revenue (Forbes 2017)" (≈ L211) | Hardcoded HTML |

### System pages
`404.html`, `offline.html`, `sw.js` (service worker), `manifest.webmanifest`, `robots.txt` (disallows `offline.html`, `dashboard.html`), `sitemap.xml`.

---

## Task 0.4 — Component inventory

There are **no web components or framework components in the live pages** except three small React islands. Reusable "components" are implemented as shared files/templates and DOM conventions:

| Component | File(s) | Renders hardcoded data? | Accepts data via props? |
|---|---|---|---|
| Site nav (desktop + mobile) | `scripts/templates/nav.html`, `scripts/templates/mobile_nav.html` (normalized into every page via `scripts/normalize_nav.py`) | **Yes** — menu structure, subsidiary names, contact links are literal HTML | No |
| Site footer | `scripts/templates/footer.html` | **Yes** — HQ address, `+255 222 780 510` / `479`, `admin@lakeoilgroup.com` hardcoded on every page | No |
| Chat widget / assistant | `scripts/templates/chat_widget.html`, `assets/site.js` (classic chatbot), `assets/assistant.js` + `assets/assistant-kb.js` (offline KB) | **Yes** — keyword replies and knowledge-base facts are hardcoded strings/data | No |
| Hero slideshow | `assets/home-hero.js` + inline HTML in each hero | Yes (slide list in HTML; rotating captions in JS) | No |
| Hero globe | `assets/hero-globe/` (React) → `hero-globe.bundle.js` | **Yes** — `locations.js` holds the 10 marker coords; textures local | Data is a module constant |
| LogoLoop | `assets/components/LogoLoop.jsx` | Data passed in by `logo-loop-mount.js` (which reads hardcoded logo list) | Yes (props) |
| SplitText | `assets/components/SplitText.jsx` | No | Yes (props) |
| Coverflow (homepage "Visual Diary") | inline in `index.html` | **Yes** — images/captions inline | No |
| i18n re-renderer | `assets/i18n.js` | Reads `window.__LAKE_I18N_CONTENT__` (hardcoded dictionary) | Data is a global |
| News renderer | `assets/news.js` | Renders `window.LAKE_NEWS` (hardcoded dataset) | Reads global |
| Map renderer | `assets/africa-network-map.js` | **Yes** — site/country coordinates + labels hardcoded | No |
| CMS console | `assets/dashboard-cms.js` | No live data — generates forms from a `COLLECTIONS` registry; expects an API that is not configured | — |
| Skeleton/loading, motion, PWA, theme | `assets/skeleton.*`, `assets/motion.js`, `assets/pwa.js`, `assets/theme.css` | — | — |

---

## Task 0.1 — Hardcoded corporate data inventory (primary task)

Every item below is literal text/number in the listed file. Where the same fact is duplicated, all locations are listed — **duplication is the norm** (see also Task 0.8).

### 1. Group statistics — **inconsistent across files (flagged)**
| Stat | Location(s) | Notes |
|---|---|---|
| Employees `30,000+` | `index.html` L10/L16 (meta), L2511, L2516, L2661; `about.html` L468, L499; `our-story.html` L501, L553; `careers.html` L6 (meta), L276; `africa-network.html` (KB copy); `csr.html` (KB copy); `sustainability.html` (KB copy); `assets/i18n-content.js` `hero.sub` L89; `assets/assistant-kb.js` `fact:workforce` | — |
| Employees `4,600+` (OLD) | `assets/i18n-content.js.bak` (`hero.sub`, `ose.s6.body`, `about.12`, `africa_network.10`) | **Leftover backup with the previous numbers — evidence of an incomplete stats migration.** |
| Trucks `1,200+` | `index.html` L10/L16, L2512, L2520, L2662; `about.html` L437, L500, L520; `our-story.html` L456, L501, L554; `sustainability.html` L291; `services.html` L329; `assets/site.js` L559/L561; `assets/assistant-kb.js` `fact:fleet` | — |
| Trucks `700+` (OLD) | `assets/i18n-content.js.bak` (`hero.sub`, `ose.s3.title`, `about.11`) | Old backup |
| Fuel stations `152` | `index.html` L10/L16, L2662; `about.html` L501; `our-story.html` L555; `station-locator.html` L290, L365; `lake-oil.html` (fs-check ≈L316); `assets/site.js` L561; `assets/assistant-kb.js` `fact:stations`, `fact:lakeoil` | — |
| Fuel stations `85+` (OLD) | `assets/i18n-content.js.bak` (`chat.reply.station`, `africa_network.9`) | Old backup |
| Countries `10` | `index.html` L9, L2511, L2579; `about.html` L468, L520; `our-story.html` L501, L516; `careers.html` L276; `lake-oil.html` (hero ≈L283); `assets/assistant-kb.js` `fact:countries` | — |
| Countries `9` | `index.html` L2529 (hero keyfact) — **conflicts with "10 countries" in the same page's hero sub (L2511)** | Inconsistency on one page |
| Countries `8` | `our-story.html` L556 (ending stat) — conflicts with the page's own text "10 countries" (L516); also in `assets/i18n-content.js.bak` | Inconsistency |
| Nationalities `21` | `about.html` L468; `careers.html` L276; `index.html` L2661; `our-story.html` L501; `assets/assistant-kb.js` | — |
| Subsidiaries `20+` / `18+` / `17` | `index.html` L2663; `careers.html` L6 (`18+`); `services.html` (`17 independent companies`, KB copy); `investors.html` (KB copy) | Count varies by page |
| Fleet detail | `assets/assistant-kb.js` `fact:fleet` (tankers 12,000–40,000 L, GPS-tracked; workshops Kibaha/Kigamboni/Morogoro/Nairobi/Ndola) | Chatbot KB only |

### 2. Leadership (client-confirmed names; see `DATA_GAPS.md`)
- Founder / Founder & Chairman: **Ally Edha Awadh** — `leadership.html` (featured), `leadership-ally-edha-awadh.html`, `about.html` L39–44, `index.html` (founder quote), `assets/assistant-kb.js` `fact:leadership`.
- Six card profiles in `leadership.html` (≈L499–560): **Dileep Kumar** (CEO Manufacturing), **Bibhuti Singh** (CFO AFICD), **Biji Lapat** (CEO Lake Energies), **Sridhar Mani** (Director of Digital Transformation), **Mohammed Khalid** (MD ATL), **Juma Nuru** (Director of Operations).
- Profile pages: `leadership-dileep-kumar.html`, `leadership-bibhuti-singh.html`, `leadership-biji-lapat.html`, `leadership-sridhar-mani.html`, `leadership-mohammed-khalid.html`, `leadership-juma-nuru.html`, `leadership-ally-edha-awadh.html`.
- **Nassoro Abubakari** (Project Manager · Lake Agro) is in `DATA_GAPS.md` as confirmed but has **no profile page**.
- Photo filenames do not match the leaders: `sibtian-ansari.png` (Dileep Kumar), `pankaj-kumar.png` (Bibhuti Singh), `vivek-choudhary.png` (Sridhar Mani), `bhaskar-shetty.png` (Mohammed Khalid) — leftovers from a leadership rename (`vercel.json` has matching redirects).
- `leadership.html` ≈L585 contains a mangled tag: `with <30,000+< professionals` — raw `<` characters, likely broken `<strong>` markup.

### 3. Contact details (single source replicated everywhere)
- Group HQ: **Plot 49, Mikocheni Light Industrial Area, P.O. Box 5055, Dar es Salaam, Tanzania** — `contact.html`; footer of every page via `scripts/templates/footer.html` (e.g., `about.html` L622); JSON-LD `contact.html` L254–275; `assets/assistant-kb.js` `fact:contact`.
- Phones: **+255 222 780 510** and **+255 222 780 479** — footer of every page (e.g., `about.html` L623–624; dozens of matches across all `.html`), `contact.html` division blocks (L508+), JSON-LD L271, chatbot replies (`assets/site.js` L560/L568), KB `fact:contact`.
- Email: **admin@lakeoilgroup.com** — footer of every page (e.g., `about.html` L625), `contact.html`, `media-center.html` L337, JSON-LD L272, chatbot, KB.
- Per-division contacts: `contact.html` division blocks (Lake Energies ≈L507, Lake Oil ≈L521 with its own address "Plot 72 & 73, Vijibweni Area, Kigamboni", plus Lake Gas/Lubes/Trans/Steel/GCCP/AFICD/ATL/etc.) — many reuse HQ lines and are labelled with their source (e.g., "Source: Group HQ (lakeoilgroup.com) — division line not published").
- HQ coordinates: **-6.762806, 39.241447** (via `assets/assistant-kb.js` `pg:contact`; not present as a numeric literal elsewhere).
- Socials: LinkedIn/Facebook/Instagram referenced in `assets/site.js` chatbot + `docs/lake_group_verified_data.json` (verified-data export, not rendered on site).

### 4. Subsidiary / company facts
- **Lake Oil** — flagship; top-5 Tanzanian petroleum distributor; 152 stations; storage TZ/Kenya/Burundi/DRC; bunkering — `lake-oil.html` (hero ≈L280, fs-check ≈L316, "Operations by Country" table ≈L345–372), KB `fact:lakeoil` (38M L Kigamboni depot, 85 owned stations, 300 tankers).
- **Lake Gas** — LPG across 6 countries; 6/10/15/38 kg cylinders; composite cylinder pioneer; Tanga terminal (1,000→3,000 MT) — `lake-gas.html`, `projects.html`, `media-center.html`, KB `fact:lakegas`, `pg:lpg`.
- **Lake Trans** — logistics, est. 2008, 1,200+ trucks — `lake-trans.html`, `fleet.html`, `services.html` L329, KB `fact:fleet`.
- **Lake Lubes** — est. 2014, product names (LAKE 4T, LAKE HD SUPREME, LAKE POWER…) — `lake-lubes.html`, KB `fact:lubricants`.
- **Lake Steel** — HS-CR rebar, 100,000 MT/yr, 25 t/hr, Visiga Kibaha — `lake-steel.html`, `projects.html`, KB `fact:lakesteel`.
- **GCCP / Premix** — est. 2010; Lugoba quarry; 30,000 m³/month aggregate; 20 mixers (12 m³); Sany plants — `lake-premix-cement.html`, KB `fact:concrete`.
- **AFICD / ACFS** — Tazara Pugu Road; 14,000 m² / 4,000 TEU; ACFS 52,000 m², 5,000 TEU, 13 acres, 2 rail tracks (exact figures in `acfs.html` L430–435) — `aficd.html`, `acfs.html`, KB `fact:containers`.
- **ATL** — "Only aluminium trailer manufacturer in Tanzania" — `atl.html` L394.
- **MERM (Dubai)** — ready-mix since 2005; **SAFF** — freight forwarding — `projects.html`, `africa-network.html`, KB `fact:subsidiaries`.
- Other subsidiaries with pages: Lake Aviation, Lake Buildings, Lake Plastics, Lake Cylinders, Gulf Aggregates, AILL, Cross Country, Ocean Galleria, Lake Agro — each page hardcodes its own narrative/figures.

### 5. News items (24 hardcoded articles)
- `assets/news-data.js` — `window.LAKE_NEWS` array, ids 24→1 (2024–2026 researched items): title, date, category, banner image, multi-paragraph description, gallery images, `video: null`. Examples: LPG Vipingo terminal (id 24, 23), founder award (id 22).
- Thumbnails: `assets/news-thumbnails.js` (generated 20px blurred data-URIs keyed by image path).
- Rendered by `assets/news.js` (featured + cards, pagination, category filters, `?id=` articles on `news-article.html`).

### 6. Locations / coordinates
- `assets/africa-network-map.js` — 8 country entries (center/zoom, L10+) + 20+ named sites with `lat`/`lng` (L23–78): HQ Dar, Dar port, AFICD Dar, Lake Steel Kibaha, GCCP Dar, Lake Oil depots, Lake Trans hub, Kenya (Nairobi/Mombasa), Zambia (Lusaka), Rwanda (Kigali), Burundi (Bujumbura), DRC (Lubumbashi/Goma), Ethiopia (Addis), Mozambique (Beira), UAE (Dubai), Uganda (Kampala).
- `assets/hero-globe/locations.js` — 10 locations (TZ HQ + 9 regional points incl. Dubai) with `lat`/`lng` and source comments.
- `assets/data_countries_africa.js` — full GeoJSON country boundary polygons (static).
- `station-locator.html` — **no coordinates**; 5 sample stations (Mikocheni, Kariakoo, Arusha, Mwanza, Dodoma) name/address only; page claims 152 total (L290, L365).

### 7. History / timeline
- `history.html` — hardcoded timeline items with years: 2006 (L273), 2008 (L280), 2010 (L287), 2012 (L294), and later years (2014 composite cylinders, 2017 Hashi/Kenya + Tanga, 2022/2023 awards, 2025 per `media-center.html` / KB). Text lives both in HTML and in the i18n dictionary (`history.*` keys).
- `our-story.html` — 8 hardcoded story scenes (founding → today) ending on stats.

### 8. Financial figures (indicative / mock)
- `lake-group-financial-dashboard.html` — "$1B Revenue (Forbes 2017)" hero (L369), revenue/scale timeline (L412), metrics (L454+), revenue projections for Lake Steel & Lake Trans with EBITDA ranges (L650–724), explicitly labelled **"indicative estimates"** (L644). "Audited Financial Statements: Not publicly disclosed" (L807).
- `lake-group-org-chart.html` — "$1B Revenue (Forbes 2017)" (L211).
- `investors.html` — narrative highlights (10 countries, 20+ subsidiaries, 8 business lines — note "8 high-growth markets" vs "10 countries" inconsistency in KB copy).

### 9. Projects
- `projects.html` — Tanga LPG import terminal (1,000→3,000 MT, SPM buoy), pan-African petroleum supply chain, Lake Steel rolling mill, MERM Dubai, AFICD network, composite cylinders.

### 10. Chatbot knowledge base (a concentrated hardcoded data store)
- `assets/assistant-kb.js` — `window.__LAKE_ASSISTANT_KB__` with curated fact cards (`fact:countries`, `fact:founding`, `fact:leadership`, `fact:contact`, `fact:workforce`, `fact:fleet`, `fact:stations`, `fact:lakeoil`, `fact:lakegas`, `fact:lakesteel`, `fact:concrete`, `fact:lubricants`, `fact:containers`, `fact:subsidiaries`, `fact:careers`, `fact:values`) plus per-page content chunks (`pg:*`) — all six languages. Header says it is generated by `scripts/build_assistant_kb.js` from i18n content.
- `assets/site.js` (L555–570) — chatbot keyword→reply map with contact strings.

### 11. i18n dictionary (translated copies of all of the above)
- `assets/i18n-content.js` (~11,015 lines) — `window.__LAKE_I18N_CONTENT__`, 1,442+ keys × 6 languages. Contains translated text for nav, footer, hero, about, history, leadership, contact, station locator, services, etc. The English layer is a **second copy of much of the hardcoded content** (e.g., `hero.sub` L89, `stat.*` L90–93). Generated by `scripts/build_master_en.py` + `scripts/build_i18n_content.py` from `scripts/translation_dict.py`.

---

## Task 0.5 — Media / assets tied to hardcoded data

- **All media is local** under `assets/images/` (≈305 files, 26 subfolders): `banner/`, `main-slider/`, `n-slider/`, `news/{1..18}/`, `leadership/`, `logos/` (+`logos/companies/*.png`, `LAKE_GROUP_LOGO.png`, `LAKE_LOGO_LAKE_ONLY.png`), `flags/*.svg`, `globe/` (globe textures), plus per-company folders (`lakeoil/`, `lakegas/`, `lakesteel/`, `laketrans/`, `lakelubes/`, `lakeplastics/`, `lakebuildings/`, `lake-agro/`, `aficd/`, `atl/`, `gccp/`, `merm/`, `acfs/`, etc.).
- Paths are **hardcoded in HTML** (`<img src="assets/images/...">`, CSS `background-image:url(...)`) with **`?v=N` cache-busting query strings** maintained by a family of scripts (`scripts/bust_asset_cache.js`, `scripts/_bump_*.js`).
- **Hardcoded data ↔ media coupling:** news articles in `assets/news-data.js` carry banner/gallery image paths; the homepage action gallery `ITEMS` array (index.html ≈L2988) maps company → image; leadership pages point at `assets/images/leadership/*`; the Africa map and globe reference local textures/SVGs; `sw.js` precaches a subset of these (L24–80).
- **External URLs:** only OG/Twitter `og:image` meta (e.g., `index.html` L11/L17 → `https://www.lakeoilgroup.com/...`), Iconify icon CDN (network), and embedded YouTube links (added by `scripts/_embed_yt_videos.js`). No third-party image CDN.
- **Known image gaps** (documented in `DATA_GAPS.md`): some companies reuse photos from other companies (Gulf Aggregates ← GCCP; Lake Buildings ← GCCP; AILL ← Lake Trans; Ocean Galleria ← Dubai MERM; Lake Cylinders ← Lake Gas; Lake Aviation ← oil imagery).

---

## Task 0.6 — Chatbot & data-fetching code

**Chatbot:**
- Two implementations coexist: the classic widget in `assets/site.js` (keyword → hardcoded reply string, L555–570) and the richer assistant in `assets/assistant.js` backed by the offline knowledge base `assets/assistant-kb.js` (generated from i18n content; 6 languages; fuzzy search via vendored `flexsearch`). Both rely **entirely on hardcoded strings/data** — no external service.

**Data fetching:**
- `assets/news-api.js` — the **only real fetch in the site**. It calls a Payload-CMS REST endpoint (`GET {base}/api/news?...`) **only if** `window.LAKE_NEWS_API_URL` is set before it loads. In all shipped pages it is set to `''` (`news.html` L802, `news-article.html` L511), so the site always falls back to the bundled `window.LAKE_NEWS` dataset. The 4s timeout + fallback behaviour is deliberate.
- `assets/dashboard-cms.js` — full admin console for `dashboard.html` (login, CRUD forms, KPI rail, media upload) targeting a Payload CMS (`window.LAKE_CMS_API_URL`), with the same "not configured → offline" behaviour. Collections defined in code: news, leaders, companies, countries, media (+ more).
- `assets/i18n.js` — deliberately **avoids** `fetch` (reads a global from `i18n-content.js`) so `file://` works (documented in the file header and README).
- `assets/africa-network-map.js` (L320–321) — comments note it loads GeoJSON via a script tag rather than `fetch` for the same `file://` reason.
- **Conclusion:** the site is fully hardcoded; the two CMS hooks are dormant and point at a backend that does not exist in this repo.

---

## Task 0.7 — Environment variable NAMES only

**Runtime (`.env.local` at repo root):**
- `VERCEL_OIDC_TOKEN`

**Referenced in code** (dev/test tooling in `scripts/` and `lake-3d/`; **not** used by the live static site):
- `CHROME`, `CHROME_PATH`, `HERO_QA_PORT`, `HERO_QA_CDP`, `QA_URL`, `PHASES`, `DESKTOP_ONLY`, `POS`, `CMS_ADMIN_EMAIL`, `CMS_ADMIN_PASSWORD`, `LOCALAPPDATA`
- `lake-3d/`: `NEXT_PUBLIC_SITE_URL`

**Referenced in documentation only** (planned/absent Payload backend — `docs/backend-guide.html`, `scripts/_gen_backend_docs.js`):
- `PAYLOAD_SECRET`, `DATABASE_URI`, `PAYLOAD_PUBLIC_SERVER_URL`, `NODE_ENV` (build define)

No values were read or recorded for any of these.

---

## Task 0.8 — Dependencies & technical debt

### Dependencies (root `package.json`)
- **dependencies:** `animejs` ^4.5.0, `docx` ^9.7.1, `react` ^18.3.1, `react-dom` ^18.3.1, `react-globe.gl` ^2.38.0
- **devDependencies:** `esbuild` ^0.28.1, `firebase-tools` ^13.35.1, `playwright` ^1.62.0, `sharp` ^0.35.3
- **`lake-3d/package.json` (orphaned subproject):** `next` 16.2.9, `react` 19.2.4, `three` ^0.184.0, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `framer-motion` ^12.40.0, `gsap`, `postprocessing`, Tailwind v4, TypeScript 5.

### Technical-debt observations (observation only — no fixes applied)
1. **Stat inconsistency across the site** — the most material finding for future data work. The same figures differ by page/file: employees 30,000+ vs 4,600+; trucks 1,200+ vs 700+; stations 152 vs 85+; countries 10 vs 9 vs 8. `assets/i18n-content.js.bak` preserves the old numbers, and even within one page (`index.html` hero keyfact "9 Countries" vs hero text "10 countries"; `our-story.html` ending "8 Countries" vs its own "10 countries") numbers conflict. Any CMS migration must treat one set as canonical.
2. **README describes infrastructure that does not exist in this checkout** — it references `backend/` (Payload CMS) and `archive/` (lake-3d), neither of which is present; lake-3d is physically at the repo root and is unlinked from the live site. README also describes content-team CMS workflows that are not runnable here.
3. **Duplicate data in at least four layers** — raw HTML, `assets/i18n-content.js` (translated copies), `assets/assistant-kb.js` (generated KB chunks), and `assets/news-data.js`/`assets/site.js` (chatbot strings). Editing one fact means touching several files.
4. **Leftover artifacts of renames/migrations** — `assets/i18n-content.js.bak`; leader photos named after former leaders (`sibtian-ansari.png`, `pankaj-kumar.png`, `vivek-choudhary.png`, `bhaskar-shetty.png`); `vercel.json` redirects for old leadership slugs; a mangled `<30,000+<` tag in `leadership.html` (~L585).
5. **~250 scripts in `scripts/`** (many `_`-prefixed one-offs) with generated artifacts committed (e.g., `scripts/_verify_render_out.json`, `_qa_screens/`, `_scraped/` — including scraped copies of third-party sites `lakeagro.com` and `atl-tz.com`). The live site doesn't need most of these.
6. **Manual `?v=` cache-busting everywhere** via a growing family of `_bump_*` scripts — fragile and easy to miss a reference.
7. **Two chatbot implementations** (classic `site.js` widget + `assistant.js` KB assistant) — duplicated contact strings and potentially divergent facts.
8. **Mock forms** — `careers.html` / `contact.html` forms do not submit anywhere (per `DATA_GAPS.md`: "form is currently mock — does not email anyone").
9. **Partial i18n coverage** — long-tail page content (product specs, bios, history entries) falls back to English in FR/PT/etc. (documented in README).
10. **Vendored libraries committed** (`assets/vendor/`: animejs, flexsearch, gsap, leaflet) — upgrades require manual replacement.
11. **News `video` field is always `null`** — no videos exist yet (top priority in `DATA_GAPS.md`).
12. **Borrowed/reused imagery** across companies (see Task 0.5) — noted as a content issue in `DATA_GAPS.md`.
13. **`docs/` contains deliverable documents and source docs** (docx/pdf sources, verified-data export `lake_group_verified_data.json`, generated guides) alongside repo docs; several are duplicated in .docx/.pdf/.html forms.

---

## Task 0.9 — Audit notes, gaps, and confidence

- **Coverage:** All 49 `.html` pages, all `assets/*.js`/`.css`, `sw.js`, `vercel.json`, `package.json`, `sitemap.xml`, `robots.txt`, `DATA_GAPS.md`, `docs/lake_group_verified_data.json`, and `lake-3d/package.json` were inspected. `docs/backend-guide.html` and `docs/developer-guide.html` (generated) were referenced for env-var names only.
- **Line numbers** are accurate to the searches performed; a few are marked "≈" where the exact line shifts across identical page blocks (nav/footer are duplicated per page). **Content duplicated inside `assets/assistant-kb.js` and `assets/i18n-content.js` carries no page line numbers** — it is referenced by source page (`"u"` field) and i18n key instead.
- **Not exhaustively itemized:** every per-company page's marketing paragraphs (they are hundreds of hardcoded strings); the full 1,442-key × 6-language i18n dictionary; the ~305 media files one-by-one (folders and coupling described instead). These are enumerated by category rather than line-by-line to keep the audit usable.
- **Data-source documents found:** `docs/lake_group_verified_data.json` (v3.0, July 2026 — verified contacts/subsidiaries with VERIFIED/SECONDARY/ESTIMATED/UNVERIFIED tags) and `DATA_GAPS.md` (content still needed) — both are **not consumed by the site**; they are the natural seed material for Phase 1+ data work.
- **Nothing was modified, deleted, renamed, or reformatted.** No dependencies installed. No secrets/values recorded — variable names only.

---

*End of Phase 0 audit. Awaiting human review before Phase 1 (Foundation).*
