#!/usr/bin/env node
/**
 * _sync_developer_guide.js
 *
 * Brings the main documentation (docs/developer-guide.html) and its Python
 * generator (docs/_gen_developer_guide.py) up to date with the current
 * repository state:
 *   - 48 HTML pages (was 29) incl. lake-*.html company pages + leadership profiles
 *   - Homepage 3D hero is now hero-globe (React + react-globe.gl), not hero-3d
 *   - Deployment is Vercel (vercel.json), not Firebase
 *   - i18n supports 6 languages: en, fr, sw, pt, es, ar
 *   - New sections: 41 Backend CMS (Payload), 42 Production Shipping, 43 Update Log
 *
 * Shared replacements are applied to BOTH files so a future regeneration of
 * the HTML from the Python generator produces the same content.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'docs', 'developer-guide.html');
const pyPath = path.join(root, 'docs', '_gen_developer_guide.py');

function readFile(p) {
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}
function writeFile(p, s) {
  fs.writeFileSync(p, s, 'utf8');
}

// ---------------------------------------------------------------------------
// NEW SECTION BLOCKS (HTML)
// ---------------------------------------------------------------------------
const SEC8_NEW = `<section id="sec-8" class="chapter page-break">
<h2>8. 3D Hero Architecture (hero-globe — React + react-globe.gl)</h2>
<p class="lede">Interactive WebGL globe on index.html, rebuilt as a small React island using <code>react-globe.gl</code>. It permanently replaced the earlier Three.js fueling simulation (<code>hero-3d.js</code>) — that code no longer exists in the repo.</p>

<h3>8.1 File Pipeline</h3>
<ol>
<li><code>assets/hero-globe/</code> — React source: <code>HeroGlobe.jsx</code>, <code>mount.jsx</code>, <code>locations.js</code></li>
<li><code>scripts/build_hero_globe.js</code> — esbuild bundles React + react-globe.gl into a classic IIFE</li>
<li><code>assets/hero-globe.bundle.js</code> — production payload (~2 MB, minified, IIFE)</li>
<li>index.html lazy-loads the bundle when <code>#fuel-experience</code> enters the viewport (+600px rootMargin)</li>
</ol>
<p><strong>Rebuild:</strong> <code>npm run build:hero-globe</code> (runs <code>node scripts/build_hero_globe.js</code>)</p>

<h3>8.2 Source Files (assets/hero-globe/)</h3>
<table class="data-table">
<thead><tr><th>File</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>mount.jsx</code></td><td>Entry — creates the <code>#hero-globe-root</code> div, WebGL feature detection, <code>.experience-3d-error</code> fallback, <code>aria-hidden</code> decorative mount</td></tr>
<tr><td><code>HeroGlobe.jsx</code></td><td>The <code>&lt;Globe&gt;</code> component — day/bump textures, brand-yellow arcs, site markers, camera tour, reduced-motion fallback</td></tr>
<tr><td><code>locations.js</code></td><td>Verified footprint data — 9 sites (TZ HQ + 8 spokes) with lat/lng, brand tokens (<code>#FFF200</code>), texture paths under <code>assets/images/globe/</code></td></tr>
</tbody>
</table>

<h3>8.3 Verified Sites (locations.js)</h3>
<table class="data-table">
<thead><tr><th>Key</th><th>City / Country</th><th>Hub</th></tr></thead>
<tbody>
<tr><td>tz</td><td>Dar es Salaam · Tanzania (HQ, Plot 49 Mikocheni)</td><td>yes</td></tr>
<tr><td>ke</td><td>Nairobi · Kenya</td><td>no</td></tr>
<tr><td>zm</td><td>Lusaka · Zambia</td><td>no</td></tr>
<tr><td>rw</td><td>Kigali · Rwanda</td><td>no</td></tr>
<tr><td>bi</td><td>Bujumbura · Burundi</td><td>no</td></tr>
<tr><td>cd</td><td>Lubumbashi · DR Congo</td><td>no</td></tr>
<tr><td>et</td><td>Addis Ababa · Ethiopia</td><td>no</td></tr>
<tr><td>mz</td><td>Beira · Mozambique</td><td>no</td></tr>
<tr><td>ae</td><td>Dubai · UAE (MERM / SAFF)</td><td>no</td></tr>
</tbody>
</table>

<h3>8.4 Textures (assets/images/globe/)</h3>
<p>Self-hosted, no CDN: <code>earth_day.jpg</code> (day map) and <code>earth_topology.png</code> (bump). Brand-yellow <code>#FFF200</code> hub→spoke arcs draw from Dar HQ to each of the 8 spoke sites on an autonomous loop.</p>

<h3>8.5 Behaviour &amp; Accessibility</h3>
<ul>
<li><strong>Autonomous tour:</strong> hub-spoke arcs draw outward from Dar HQ on a repeating loop</li>
<li><strong>Lazy-loaded:</strong> bundle never blocks first paint; rAF pauses when the section is off-screen or the tab is hidden</li>
<li><strong>prefers-reduced-motion:</strong> static branded overlay — no WebGL canvas is created</li>
<li><strong>WebGL unavailable:</strong> <code>.experience-3d-error</code> fallback message</li>
<li><strong>ARIA:</strong> the mount is <code>aria-hidden</code> (decorative)</li>
<li><strong>SW routing:</strong> network-first for hero-globe.bundle.js (never stale cache)</li>
</ul>

<h3>8.6 Editing Workflow</h3>
<ol>
<li>Edit <code>assets/hero-globe/*</code> (JSX source)</li>
<li>Run <code>npm run build:hero-globe</code></li>
<li>Bump <code>?v=N</code> on the hero-globe.bundle.js script tag in index.html</li>
<li>Bump <code>VERSION</code> in sw.js</li>
<li>QA: <code>node scripts/_globe_qa2.js</code> (automated frame capture)</li>
</ol>
</section>
`;

const SEC8B_NEW = `<section id="sec-8b" class="chapter page-break">
<h2>8A. hero-globe — Implementation Deep Dive</h2>

<h3>8A.1 Boot Sequence (mount.jsx)</h3>
<ol>
<li><code>mountHeroGlobe(selector)</code> locates <code>#fuel-experience</code> and creates <code>#hero-globe-root</code> (absolute, inset 0, <code>aria-hidden</code>)</li>
<li>Checks <code>webglAvailable()</code> — creates a probe canvas and requests a <code>webgl</code> context; on failure renders <code>.experience-3d-error</code> and stops</li>
<li>Checks <code>prefers-reduced-motion</code> — if set, shows the static branded finale overlay instead of creating the globe</li>
<li>Otherwise <code>createRoot(mount).render(&lt;HeroGlobe /&gt;)</code> with React 18</li>
</ol>

<h3>8A.2 Component (HeroGlobe.jsx)</h3>
<p>Renders a <code>&lt;Globe&gt;</code> from react-globe.gl:</p>
<ul>
<li>Day texture + topology bump from <code>assets/images/globe/</code></li>
<li>One marker per location (9 total); Dar HQ rendered as the hub</li>
<li>Great-circle arcs styled in brand yellow (<code>#FFF200</code>) with a soft alpha ring, animated to draw outward on the loop</li>
<li>Camera keyframes tour East Africa then pulls back to a full-planet identity shot</li>
</ul>

<h3>8A.3 Data (locations.js)</h3>
<p>Each entry: <code>{ id, name, lat, lng, hub, source }</code>. Coordinates use city centres from the approved location table; TZ HQ uses the precise Plot 49 Mikocheni coordinate. <code>TEX</code> maps point at <code>assets/images/globe/</code>.</p>

<h3>8A.4 Bundling (scripts/build_hero_globe.js)</h3>
<pre class="code-block">esbuild entry: assets/hero-globe/mount.jsx
  → bundle: true, minify: true, format: 'iife', jsx: 'automatic'
  → outfile: assets/hero-globe.bundle.js
  → define: process.env.NODE_ENV = 'production'</pre>
<p>The IIFE output is file:// compatible (classic script, no ES modules).</p>

<h3>8A.5 Performance &amp; Reduced Motion</h3>
<ul>
<li>IntersectionObserver pauses rendering when <code>#experience-3d-panel</code> leaves the viewport</li>
<li><code>visibilitychange</code> pauses when the tab is hidden</li>
<li>Reduced motion = static overlay, no WebGL context created (saves ~2MB download + GPU work)</li>
<li>Bundle is network-first in sw.js so updates arrive immediately</li>
</ul>
</section>
`;

const SEC41_NEW = `<section id="sec-41" class="chapter page-break">
<h2>41. Backend CMS — Self-Hosted Payload (backend/)</h2>
<p class="lede">A headless content backend under <code>backend/</code> gives the content team a real admin dashboard (news, leadership, companies, countries, media) while the static site keeps serving hand-authored HTML. Reads are public; writes require login.</p>

<h3>41.1 What It Is</h3>
<p>Payload 3 running inside Next.js 15, backed by PostgreSQL 16 in Docker. It exposes an admin UI at <code>/admin</code> and a REST API at <code>/api/{collection}</code>. It mirrors content the static site currently ships as JS globals (<code>window.LAKE_NEWS</code>, <code>COUNTRY_META</code>, leadership pages) so the site can later fetch from one source of truth.</p>

<h3>41.2 Collections</h3>
<table class="data-table">
<thead><tr><th>Collection</th><th>Slug</th><th>Mirrors on the site</th><th>Write access</th></tr></thead>
<tbody>
<tr><td>News</td><td><code>news</code></td><td><code>assets/news-data.js</code> (<code>window.LAKE_NEWS</code>)</td><td>authenticated</td></tr>
<tr><td>Leaders</td><td><code>leaders</code></td><td><code>leadership-*.html</code> profile pages</td><td>authenticated</td></tr>
<tr><td>Companies</td><td><code>companies</code></td><td>Subsidiary pages + megamenu divisions</td><td>authenticated</td></tr>
<tr><td>Countries</td><td><code>countries</code></td><td><code>assets/africa-network-map.js</code> + flag SVGs</td><td>authenticated</td></tr>
<tr><td>Media</td><td><code>media</code></td><td>Uploads: banners, photos, logos, flags</td><td>authenticated</td></tr>
<tr><td>Users</td><td><code>users</code></td><td>Admin login (admin-only read)</td><td>admin</td></tr>
</tbody>
</table>

<h3>41.3 How It Works</h3>
<ul>
<li><code>src/payload.config.ts</code> wires the six collections, the Postgres adapter, Lexical editor, CORS/CSRF whitelists and <code>PAYLOAD_SECRET</code></li>
<li><code>src/access/index.ts</code> — <code>isAuthenticated</code> (any signed-in user can write) and <code>isAdmin</code> (users collection is admin-only read)</li>
<li><code>scripts/site-data.ts</code> — pure extraction of static-site content (no DB required): news, countries, leaders</li>
<li><code>scripts/seed.ts</code> — idempotent upsert (news by <code>legacyId</code>, countries by <code>code</code>, leaders by <code>slug</code>); media uploaded once and cached by path</li>
<li><code>scripts/verify-site-data.ts</code> — dry-run checks with no database (<code>npm run seed:verify</code>)</li>
</ul>
<p>REST reads are public: <code>GET /api/news?sort=-date&amp;depth=1</code>, filter with <code>?where[status][equals]=published</code>, etc.</p>

<h3>41.4 How It Ships to the Company (production)</h3>
<pre class="code-block"># On the company's server (Docker + Postgres)
cd backend
cp .env.example .env          # set PAYLOAD_SECRET, POSTGRES_PASSWORD, CORS_ORIGINS
docker compose up -d --build  # db → migrate → cms (port 3000)</pre>
<ul>
<li>First visit to <code>/admin</code> bootstraps the first admin account (or <code>npx payload create-user</code>)</li>
<li>Data survives restarts via the <code>db-data</code> and <code>media-data</code> Docker volumes</li>
<li><code>CORS_ORIGINS</code> whitelists the live site origin so the static pages can call the API</li>
<li>The static pages switch from JS globals to <code>fetch()</code> collection-by-collection, News first, with graceful fallback to the bundled data while the CMS is unreachable</li>
</ul>
<p>Full reference: <code>docs/backend-guide.html</code> and <code>backend/ADMIN_ROUTE_PLAN.md</code>.</p>
</section>
`;

const SEC42_NEW = `<section id="sec-42" class="chapter page-break">
<h2>42. Shipping to the Company (Production Handoff)</h2>
<p class="lede">How the whole system moves from this repository to the company's live website once production is complete.</p>

<h3>42.1 The Static Site (what visitors see)</h3>
<ul>
<li><strong>Deploy:</strong> Vercel — git push triggers a build and global CDN rollout; <code>vercel.json</code> defines permanent redirects and cache headers</li>
<li><strong>URL renames:</strong> legacy pages (fuel.html, lpg.html, steel.html, concrete.html, logistics.html, lubricants.html, container-services.html, lake-story-assets/*) 301-redirect to the new pages (lake-oil.html, lake-gas.html, …)</li>
<li><strong>PWA:</strong> sw.js v68 — network-first pages, stale-while-revalidate assets, offline.html fallback</li>
<li><strong>Domain:</strong> www.lakeoilgroup.com (canonical), HTTPS via Vercel</li>
</ul>

<h3>42.2 The CMS (content management)</h3>
<ul>
<li><strong>Hosting:</strong> company servers — <code>docker compose up -d --build</code> (db + migrate + cms), ideally behind the company VPN/firewall</li>
<li><strong>Content team:</strong> logs in at <code>/admin</code> with the first-bootstrapped account, adds news/leaders/companies/countries/media with zero code changes</li>
<li><strong>Training:</strong> README "For the content team" section explains login, adding news, managing leaders in plain language</li>
</ul>

<h3>42.3 Phased Cutover Plan</h3>
<ol>
<li><strong>Prepare:</strong> run <code>npm run seed:verify</code> (no DB) then <code>npm run seed</code> to import today's content into the CMS</li>
<li><strong>Wire News:</strong> news.html/news-article.html fetch <code>GET /api/news</code> with fallback to <code>window.LAKE_NEWS</code></li>
<li><strong>Wire Leaders, Companies, Countries:</strong> swap the hardcoded JS globals for the matching endpoints</li>
<li><strong>Dashboard:</strong> point <code>dashboard.html</code> login at <code>/admin</code> (Option A) or build the custom branded dashboard against the API (Option B)</li>
<li><strong>Launch checks:</strong> Lighthouse + real-device GPU pass, offline test, editorial sign-off on DATA_GAPS.md items (videos, images, contacts)</li>
</ol>

<h3>42.4 Handoff Checklist</h3>
<ul>
<li>□ <code>.env</code> created with a strong <code>PAYLOAD_SECRET</code> and <code>POSTGRES_PASSWORD</code></li>
<li>□ <code>CORS_ORIGINS</code> / <code>CSRF_ORIGINS</code> include the live site origin</li>
<li>□ First admin user created and content team briefed</li>
<li>□ Seed verified and run; content spot-checked in /admin</li>
<li>□ Static pages switched to the API with fallbacks intact</li>
<li>□ Vercel project connected; redirects and headers verified in production</li>
<li>□ README content-team section shared with editors</li>
</ul>
</section>
`;

const SEC43_NEW = `<section id="sec-43" class="chapter page-break">
<h2>43. Guide Update Log</h2>
<p>Changes made to align this documentation with the current repository (see <code>docs/backend-guide.html</code> and the README for the backend, content-team, and developer guides):</p>
<ul>
<li><strong>48 pages</strong> (was 29) — added lake-*.html company pages, leadership-*.html profiles, atl/aill/cross-country/gulf-aggregates/ocean-galleria, financial dashboard &amp; org chart</li>
<li><strong>3D hero</strong> — hero-3d (Three.js) removed; hero-globe (React + react-globe.gl) documented in §8 / §8A</li>
<li><strong>Deployment</strong> — Firebase replaced by Vercel (<code>vercel.json</code> redirects + headers) in §1, §16, §20</li>
<li><strong>i18n</strong> — six languages: en, fr, sw, pt, es, ar (§10); new build scripts build_pt_es_lang.js / build_hi_ar_lang.js</li>
<li><strong>Service worker</strong> — VERSION v68 (was v10)</li>
<li><strong>Backend CMS</strong> — new §41 covering the Payload backend, seeding, REST API and self-hosted shipping</li>
<li><strong>Production handoff</strong> — new §42 (phased cutover + checklist)</li>
</ul>
</section>
`;

// ---------------------------------------------------------------------------
// SHARED REPLACEMENTS (applied to BOTH the HTML and the Python generator)
// ---------------------------------------------------------------------------
const shared = [
  // 1. Cover stats
  [
    '<p class="cover-stats">29 HTML pages · 28 live + dashboard demo · Firebase Hosting · PWA-enabled</p>',
    '<p class="cover-stats">48 HTML pages · 28 live + dashboard demo · Vercel · PWA-enabled · 6 languages · Self-hosted Payload CMS</p>',
  ],
  // 2. Architecture diagram — Firebase box → Vercel + optional CMS
  [
    `│              Firebase Hosting (production)                     │
│  npm run deploy  →  firebase deploy --only hosting             │
│  npm run serve   →  firebase emulators:start --only hosting    │
└─────────────────────────────────────────────────────────────┘</pre>`,
    `│                    Vercel (production)                          │
│  git push → Vercel build → global CDN (vercel.json)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│        backend/ — Self-hosted Payload CMS (optional)          │
│  /admin dashboard · REST API · PostgreSQL 16 · Docker         │
└─────────────────────────────────────────────────────────────┘</pre>`,
  ],
  // 3. "What Is NOT Live" paragraph
  [
    '<p><code>lake-3d/</code> is a separate Next.js scroll-driven 3D experience (port 3001). It is <em>not</em> linked from any production HTML page. The live homepage 3D is <code>assets/hero-3d.js</code> (bundled), embedded in <code>index.html</code> only.</p>',
    '<p><code>archive/lake-3d/</code> is a retired Next.js scroll-driven 3D prototype (was port 3001). It is <em>not</em> linked from any production HTML page. The live homepage 3D is the React island bundled to <code>assets/hero-globe.bundle.js</code>, embedded in <code>index.html</code> only. The <code>backend/</code> CMS (Payload) is built and ready but the static pages still ship content from JS globals until the phase-2 REST wiring lands (see Section 41).</p>',
  ],
  // 4. Page load lifecycle — hero bundle name
  [
    '<li>index.html only: IntersectionObserver lazy-loads hero-3d.bundle.js when #fuel-experience nears viewport.</li>',
    '<li>index.html only: IntersectionObserver lazy-loads hero-globe.bundle.js when #fuel-experience nears viewport.</li>',
  ],
  // 5. Tech stack rows
  [
    '<tr><td><code>Three.js (vendor)</code></td><td>3D hero</td><td>Industry-standard WebGL; bundled for non-module contexts</td></tr>',
    '<tr><td><code>React 18 + react-globe.gl</code></td><td>3D hero</td><td>Homepage globe island (hero-globe); bundled to a classic IIFE for file:// compatibility</td></tr>',
  ],
  [
    '<tr><td><code>Firebase Hosting</code></td><td>Deployment</td><td>CDN, HTTPS, SPA-style rewrites optional; team already uses Firebase CLI</td></tr>',
    '<tr><td><code>Vercel</code></td><td>Deployment</td><td>CDN + HTTPS; vercel.json defines permanent redirects and cache headers</td></tr>',
  ],
  [
    '<tr><td><code>esbuild (via build_hero_bundle.sh)</code></td><td>3D bundle</td><td>Inlines Three.js import into classic script</td></tr>',
    '<tr><td><code>esbuild (scripts/build_hero_globe.js)</code></td><td>3D bundle</td><td>Bundles React + react-globe.gl into hero-globe.bundle.js (IIFE)</td></tr>',
  ],
  [
    '<tr><td><code>Self-hosted fonts</code></td><td>Typography</td><td>Inter, Bebas Neue, Playfair, Material Symbols — no Google Fonts CDN</td></tr>',
    '<tr><td><code>Self-hosted fonts</code></td><td>Typography</td><td>Inter, Bebas Neue, Playfair, Material Symbols — no Google Fonts CDN</td></tr>\n<tr><td><code>Payload 3 + Next.js 15</code></td><td>Backend CMS</td><td>Self-hosted headless CMS in backend/ — admin UI + REST API (see §41)</td></tr>\n<tr><td><code>PostgreSQL 16 (Docker)</code></td><td>CMS database</td><td>backend/ docker-compose — db-data + media-data volumes</td></tr>',
  ],
  // 6. §8 whole section → hero-globe
  [null, null], // placeholder, filled below with full-section match
];

// ---------------------------------------------------------------------------
// HTML-ONLY REPLACEMENTS
// ---------------------------------------------------------------------------
const htmlOnly = [
  // Contents guide — hero row
  [
    '<tr><td>Homepage 3D globe</td><td><code>assets/hero-3d.js</code>, <code>hero-3d.bundle.js</code></td><td><code>index.html</code> only</td><td><a href="#sec-8">§8</a>, <a href="#sec-8b">§8b</a></td></tr>',
    '<tr><td>Homepage 3D globe</td><td><code>assets/hero-globe/</code>, <code>hero-globe.bundle.js</code></td><td><code>index.html</code> only</td><td><a href="#sec-8">§8</a>, <a href="#sec-8b">§8b</a></td></tr>',
  ],
  // Contents guide — languages row
  [
    '<tr><td>Languages (EN / FR / SW)</td><td><code>assets/i18n.js</code>, <code>i18n-content.js</code></td><td>All except 404/offline</td><td><a href="#sec-10">§10</a>, <a href="#sec-22">§22</a></td></tr>',
    '<tr><td>Languages (EN / FR / SW / PT / ES / AR)</td><td><code>assets/i18n.js</code>, <code>i18n-content.js</code></td><td>All except 404/offline</td><td><a href="#sec-10">§10</a>, <a href="#sec-22">§22</a></td></tr>',
  ],
  // Contents guide — Firebase hosting row → Vercel + CMS
  [
    '<tr><td>Firebase hosting</td><td><code>package.json</code>, firebase config</td><td>Production deploy</td><td><a href="#sec-20">§20</a></td></tr>',
    '<tr><td>Vercel hosting</td><td><code>vercel.json</code> (redirects + headers)</td><td>Production deploy</td><td><a href="#sec-20">§20</a></td></tr>\n      <tr><td>Backend CMS (Payload)</td><td><code>backend/</code> — docker-compose, collections</td><td>Content management</td><td><a href="#sec-41">§41</a></td></tr>\n      <tr><td>Shipping to the company</td><td>Cutover plan + handoff checklist</td><td>Production handoff</td><td><a href="#sec-42">§42</a></td></tr>',
  ],
  // Contents guide — every HTML page row count
  [
    '<tr><td>Every HTML page</td><td><code>*.html</code> (29 files)</td><td>Per-page deep dive</td><td><a href="#sec-5">§5</a>, <a href="#sec-23">§23</a>, <a href="#sec-39">§39</a></td></tr>',
    '<tr><td>Every HTML page</td><td><code>*.html</code> (48 files)</td><td>Per-page deep dive</td><td><a href="#sec-5">§5</a>, <a href="#sec-23">§23</a>, <a href="#sec-39">§39</a></td></tr>',
  ],
  // Contents guide — SW v10
  [
    '<li><a href="#sec-9"><code>sw.js</code> — four caches (v10), precache list, fetch routing</a></li>',
    '<li><a href="#sec-9"><code>sw.js</code> — four caches (v68), precache list, fetch routing</a></li>',
  ],
  // Contents guide — pages by category (service pages renamed)
  [
    '<li><a href="#sec-5">Services hub + 7 division pages (fuel, lpg, steel, concrete, logistics, lubricants, container-services)</a></li>',
    '<li><a href="#sec-5">Services hub + company pages (lake-oil, lake-gas, lake-steel, lake-premix-cement, lake-trans, lake-lubes, aficd, atl, aill, lake-agro, lake-aviation, lake-buildings, lake-cylinders, lake-plastics, gulf-aggregates, cross-country, ocean-galleria)</a></li>',
  ],
  // Contents guide — homepage description
  [
    '<li><a href="#sec-5">Homepage — <code>index.html</code> (theme.css, hero-3d, motion.js)</a></li>',
    '<li><a href="#sec-5">Homepage — <code>index.html</code> (theme.css, hero-globe, motion.js)</a></li>',
  ],
  // Script load order diagram
  [
    '(Homepage replaces flagship pair with theme.css + motion.js, adds lazy hero-3d.bundle.js)',
    '(Homepage replaces flagship pair with theme.css + motion.js, adds lazy hero-globe.bundle.js)',
  ],
  // Full TOC — add 41/42/43 entries
  [
    '  <li><a href="#sec-38"><span class="toc-num">38.</span> Document Information</a></li>',
    '  <li><a href="#sec-38"><span class="toc-num">38.</span> Document Information</a></li>\n  <li><a href="#sec-41"><span class="toc-num">41.</span> Backend CMS — Self-Hosted Payload</a></li>\n  <li><a href="#sec-42"><span class="toc-num">42.</span> Shipping to the Company</a></li>\n  <li><a href="#sec-43"><span class="toc-num">43.</span> Guide Update Log</a></li>',
  ],
  // §1 diagram: page count line in browser box
  [
    '│  index.html … sustainability.html  (29 pages)               │',
    '│  index.html … ocean-galleria.html  (48 pages)              │',
  ],
  // §1 page-specific line
  [
    '│       └── page-specific: hero-3d, leaflet, news.js           │',
    '│       └── page-specific: hero-globe, leaflet, news.js       │',
  ],
  // §3 key dirs: page count
  [
    '<tr><td><code>/*.html</code></td><td>29 routable pages at site root</td></tr>',
    '<tr><td><code>/*.html</code></td><td>48 routable pages at site root</td></tr>',
  ],
  // §3 key dirs: lake-3d → archive + backend + docs
  [
    '<tr><td><code>lake-3d/</code></td><td>Orphaned Next.js prototype (not deployed with main site)</td></tr>',
    '<tr><td><code>archive/lake-3d/</code></td><td>Retired Next.js prototype (moved out of the tree; not deployed)</td></tr>\n<tr><td><code>backend/</code></td><td>Self-hosted Payload CMS — collections, REST API, Docker, seed scripts (§41)</td></tr>\n<tr><td><code>docs/backend-guide.html</code></td><td>Dedicated backend developer guide</td></tr>',
  ],
  // §5 lede — note the rename
  [
    '<section id="sec-5" class="chapter"><h2>5. HTML Page Reference</h2><p class="lede">Deep reference for every root HTML page.</p>',
    '<section id="sec-5" class="chapter"><h2>5. HTML Page Reference</h2><p class="lede">Deep reference for every root HTML page (48 files — company pages use the lake-* naming, e.g. lake-oil.html; legacy names like fuel.html 301-redirect via vercel.json).</p>',
  ],
  // §8b heading in extended-content (deep dive) — the deep-dive block itself is replaced below
  // §9 PWA version
  [
    '<p>VERSION constant (currently <code>v10</code>) — bump on every deploy that changes precached files. Activate handler deletes all <code>lake-*</code> caches not in KNOWN_CACHES.</p>',
    '<p>VERSION constant (currently <code>v68</code>) — bump on every deploy that changes precached files. Activate handler deletes all <code>lake-*</code> caches not in KNOWN_CACHES.</p>',
  ],
  // §10 supported languages
  [
    '<h3>10.1 Supported Languages</h3>\n<p>English (en), French (fr), Swahili (sw). Portuguese was removed; SW replaced PT in the language switcher.</p>',
    '<h3>10.1 Supported Languages</h3>\n<p>Six languages: English (en), French (fr), Swahili (sw), Portuguese (pt), Spanish (es), Arabic (ar). Built from <code>translation_dict.py</code> plus the <code>build_pt_es_lang.js</code> / <code>build_hi_ar_lang.js</code> cache builders.</p>',
  ],
  // §14 scripts table — add new scripts
  [
    '<tr><td>build_hero_bundle.sh</td><td>esbuild hero-3d.js → hero-3d.bundle.js</td></tr>',
    '<tr><td>build_hero_globe.js</td><td>esbuild hero-globe (React) → hero-globe.bundle.js</td></tr>\n<tr><td>build_leadership_pages.js</td><td>Generate leadership-*.html profile pages</td></tr>\n<tr><td>build_pt_es_lang.js / build_hi_ar_lang.js</td><td>Build PT/ES and HI/AR translation caches</td></tr>\n<tr><td>build_presentation.py</td><td>Generate the company presentation deck</td></tr>\n<tr><td>bust_asset_cache.js</td><td>Bump ?v= cache-busting query params sitewide</td></tr>',
  ],
  // §16 deployment — Vercel
  [
    '<h3>16.3 Deploy</h3>\n<pre class="code-block">npm run deploy       # firebase deploy --only hosting</pre>\n<p>Requires Firebase project configuration (firebase.json + .firebaserc — configure locally, not committed).</p>',
    '<h3>16.3 Deploy</h3>\n<pre class="code-block">git push             # Vercel auto-builds and deploys from the repo</pre>\n<p>Vercel is configured by <code>vercel.json</code> (permanent redirects for renamed pages, cache headers, Service-Worker-Allowed). No Firebase project files are committed.</p>',
  ],
  // §16 pre-deploy hero bundle
  [
    '<li>Run <code>bash scripts/build_hero_bundle.sh</code> if hero-3d.js changed</li>',
    '<li>Run <code>npm run build:hero-globe</code> if assets/hero-globe/* changed</li>',
  ],
  // §16.2 local testing note
  [
    '<pre class="code-block">npm install          # firebase-tools devDependency\nnpm run serve        # Firebase hosting emulator\n# OR any static server:\npython3 -m http.server 8080</pre>',
    '<pre class="code-block"># Any static server works (Vercel preview also available on git push)\npython3 -m http.server 8080   # or: npx serve .</pre>',
  ],
  // §19 troubleshooting — hero bundle name
  [
    '<li>hero-3d.bundle.js not built or 404</li>',
    '<li>hero-globe.bundle.js not built or 404</li>',
  ],
  [
    '<p><strong>Fix:</strong> Bump VERSION in sw.js. User must accept update toast or hard-refresh twice. news-data.js and hero-3d.bundle.js use network-first specifically to avoid this.</p>',
    '<p><strong>Fix:</strong> Bump VERSION in sw.js. User must accept update toast or hard-refresh twice. news-data.js and hero-globe.bundle.js use network-first specifically to avoid this.</p>',
  ],
  // §20 whole section → Vercel
  [
    '<section id="sec-20" class="chapter page-break">\n<h2>20. Firebase Hosting Configuration</h2>\n<p>package.json defines:</p>\n<pre class="code-block">{\n  "scripts": {\n    "serve": "npx firebase emulators:start --only hosting",\n    "deploy": "npx firebase deploy --only hosting"\n  },\n  "devDependencies": {\n    "firebase-tools": "^13.35.1"\n  }\n}</pre>\n<p>A typical <code>firebase.json</code> (create locally) serves the repo root as public directory:</p>\n<pre class="code-block">{\n  "hosting": {\n    "public": ".",\n    "ignore": ["firebase.json", "**/.*", "**/node_modules/**", "lake-3d/**", "scripts/_chrome_profile*/**"],\n    "headers": [\n      {\n        "source": "/sw.js",\n        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]\n      },\n      {\n        "source": "**/*.@(js|css)",\n        "headers": [{ "key": "Cache-Control", "value": "public,max-age=3600" }]\n      }\n    ],\n    "rewrites": [\n      { "source": "/", "destination": "/index.html" }\n    ]\n  }\n}</pre>\n<p><strong>Important:</strong> sw.js must be served with no-cache or short TTL so updates propagate. Production domain: www.lakeoilgroup.com.</p>\n</section>',
    '<section id="sec-20" class="chapter page-break">\n<h2>20. Vercel Hosting Configuration</h2>\n<p>Deployment is driven by <code>vercel.json</code> at the repo root (committed). Key behaviours:</p>\n<ul>\n<li><strong>Permanent redirects</strong> for renamed pages — fuel.html → lake-oil.html, lpg.html → lake-gas.html, steel.html → lake-steel.html, concrete.html → lake-premix-cement.html, logistics.html → lake-trans.html, lubricants.html → lake-lubes.html, container-services.html → aficd.html, legacy leadership names, and lake-story-assets/* → assets/images/our-story/*</li>\n<li><strong>Cache headers</strong> — sw.js and manifest no-cache; core assets no-cache/must-revalidate; fonts/vendor immutable (1y); images/icons swr (7d)</li>\n<li><strong>Service-Worker-Allowed: /</strong> on sw.js so the SW scope covers the whole site</li>\n</ul>\n<p><strong>Important:</strong> sw.js is served with no-cache so updates propagate; <code>?v=</code> query bumps on assets force fresh fetches. Production domain: www.lakeoilgroup.com.</p>\n</section>',
  ],
  // §21 image assets — planet → globe
  [
    '<tr><td>assets/images/planet/</td><td>Earth textures for 3D hero</td><td>cache-first</td></tr>',
    '<tr><td>assets/images/globe/</td><td>Earth textures for hero-globe (day + bump)</td><td>cache-first</td></tr>',
  ],
  // §24 JS extended — hero deep dive reference in section 24
  [
    '<p>IIFE, no exports. Resolves SW URL via new URL(\'../sw.js\', document.currentScript.src). Toast is imperative DOM (not in template) for isolation from i18n. reloadingAfterUpdate flag prevents reload loops.</p>',
    '<p>IIFE, no exports. Resolves SW URL via new URL(\'../sw.js\', document.currentScript.src). Toast is imperative DOM (not in template) for isolation from i18n. reloadingAfterUpdate flag prevents reload loops.</p>',
  ],
  // §27 perf budget
  [
    '<tr><td>hero-3d.bundle.js</td><td>~500KB</td><td>Lazy on IO</td></tr>',
    '<tr><td>hero-globe.bundle.js</td><td>~2MB</td><td>Lazy on IO</td></tr>',
  ],
  // §28 version history rows
  [
    '<tr><td>hero-3d bundle</td><td>v9 query param</td><td>file:// safe</td></tr>',
    '<tr><td>hero-globe bundle</td><td>React/react-globe.gl</td><td>IIFE, file:// safe</td></tr>',
  ],
  [
    '<tr><td>Portuguese (PT)</td><td>Removed</td><td>Replaced with Swahili (SW)</td></tr>',
    '<tr><td>Languages</td><td>6 (en, fr, sw, pt, es, ar)</td><td>PT/ES/AR built via cache scripts</td></tr>',
  ],
  [
    '<tr><td>Flagship CSS rollout</td><td>28/29 pages</td><td>index.html remains on theme.css</td></tr>',
    '<tr><td>Flagship CSS rollout</td><td>47/48 pages</td><td>index.html remains on theme.css</td></tr>',
  ],
  [
    '<tr><td>PWA / Service Worker</td><td>v10</td><td>Bump VERSION per deploy</td></tr>',
    '<tr><td>PWA / Service Worker</td><td>v68</td><td>Bump VERSION per deploy</td></tr>',
  ],
  [
    '<tr><td>lake-3d Next.js</td><td>Orphaned</td><td>Not in production</td></tr>',
    '<tr><td>archive/lake-3d Next.js</td><td>Retired</td><td>Moved to archive/, not in production</td></tr>',
  ],
  // §32 FAQ — hero/languages/hosting answers
  [
    '<dt>Q6. Why is dashboard.html blocked?</dt><dd>It is a mock demo portal, not a real authenticated application. robots.txt Disallow prevents indexing.</dd>',
    '<dt>Q6. Why is dashboard.html blocked?</dt><dd>It is a mock demo portal, not a real authenticated application. robots.txt Disallow prevents indexing. The real authenticated admin lives in the backend CMS at /admin (see §41).</dd>',
  ],
  [
    '<dt>Q7. What is lake-3d/?</dt><dd>Orphaned Next.js prototype. Not linked from production. Delete or budget separate migration project.</dd>',
    '<dt>Q7. What is archive/lake-3d/?</dt><dd>Retired Next.js 3D prototype moved out of the tree. Not linked from production.</dd>',
  ],
  [
    '<dt>Q3. Why bundle hero-3d.js?</dt><dd>ES module scripts are blocked under file://. esbuild produces a classic script with Three.js inlined.</dd>',
    '<dt>Q3. Why bundle hero-globe?</dt><dd>ES module scripts are blocked under file://. esbuild produces a classic IIFE with React + react-globe.gl inlined (npm run build:hero-globe).</dd>',
  ],
  // §36 ADR-001
  [
    '<p><strong>Rationale:</strong> Zero framework runtime cost. Each page is independently cacheable. No hydration complexity. Works on file:// for local preview. Firebase Hosting serves static files efficiently.</p>',
    '<p><strong>Rationale:</strong> Zero framework runtime cost. Each page is independently cacheable. No hydration complexity. Works on file:// for local preview. Vercel serves static files efficiently.</p>',
  ],
  // §36 ADR-005
  [
    '<h3>36.5 ADR-005: Lazy-Load 3D Bundle</h3>\n<p><strong>Context:</strong> hero-3d.bundle.js is ~500KB.</p>\n<p><strong>Decision:</strong> IntersectionObserver on #fuel-experience with 600px rootMargin.</p>\n<p><strong>Rationale:</strong> 3D is below fold. LCP should not wait for WebGL. Users who never scroll still get full page.</p>',
    '<h3>36.5 ADR-005: Lazy-Load 3D Bundle</h3>\n<p><strong>Context:</strong> hero-globe.bundle.js is ~2MB.</p>\n<p><strong>Decision:</strong> IntersectionObserver on #fuel-experience with 600px rootMargin.</p>\n<p><strong>Rationale:</strong> 3D is below fold. LCP should not wait for WebGL. Users who never scroll still get full page.</p>',
  ],
  // §38 — regeneration note + related docs
  [
    '<p>Source of truth is always the repository files — this document is generated from live project metadata and should be regenerated before major releases.</p>',
    '<p>Source of truth is always the repository files — this document is generated from live project metadata and should be regenerated before major releases. Related: <code>docs/backend-guide.html</code> (CMS backend guide) and the README (developer guides + content-team guide).</p>',
  ],
];

// ---------------------------------------------------------------------------
// PYTHON-ONLY REPLACEMENTS (generator source data structures)
// ---------------------------------------------------------------------------
const pyOnly = [
  // TOC items
  [
    '        ("29–38", "Reference Tables &amp; ADRs"),\n    ]',
    '        ("29–38", "Reference Tables &amp; ADRs"),\n        ("41", "Backend CMS — Self-Hosted Payload"),\n        ("42", "Shipping to the Company"),\n        ("43", "Guide Update Log"),\n    ]',
  ],
  // §5 service pages map (renamed)
  [
    '    service_pages = {\n        "fuel.html": "Lake Oil petroleum distribution — 85+ stations, bulk supply, competitive advantages.",\n        "lpg.html": "Lake Gas LPG — cylinder sizes, bottling plants, clean cooking access.",\n        "lubricants.html": "Lake Lubes — greases, industrial and automotive lubricants.",\n        "steel.html": "Lake Steel HS-CR rebars — 100,000 MT/year rolling mill, first in Tanzania.",\n        "concrete.html": "GCCP ready-mix concrete and aggregate — Lugoba quarry, project portfolio.",\n        "logistics.html": "Lake Trans bulk liquid and dry cargo haulage.",\n        "container-services.html": "AFICD inland container depots — Tanzania, Zambia, Mozambique.",\n        "fleet.html": "700+ truck fleet specifications and capabilities.",\n        "station-locator.html": "Lake Oil retail station finder across Tanzania.",\n    }',
    '    service_pages = {\n        "lake-oil.html": "Lake Oil petroleum distribution — 152+ stations, bulk supply, competitive advantages.",\n        "lake-gas.html": "Lake Gas LPG — cylinder sizes, bottling plants, clean cooking access.",\n        "lake-lubes.html": "Lake Lubes — greases, industrial and automotive lubricants.",\n        "lake-steel.html": "Lake Steel HS-CR rebars — 100,000 MT/year rolling mill, first in Tanzania.",\n        "lake-premix-cement.html": "GCCP ready-mix concrete and aggregate — Lugoba quarry, project portfolio.",\n        "lake-trans.html": "Lake Trans bulk liquid and dry cargo haulage.",\n        "aficd.html": "AFICD inland container depots — Tanzania, Zambia, Mozambique.",\n        "atl.html": "ATL Africa Tank Lines — aluminium tanker manufacturing.",\n        "aill.html": "AILL African Inland Logistics — container freight support.",\n        "lake-agro.html": "Lake Agro — commercial farming and integrated agro-processing.",\n        "lake-aviation.html": "Lake Aviation — aviation fuel supply.",\n        "lake-buildings.html": "Lake Buildings Solutions — construction materials.",\n        "lake-cylinders.html": "Lake Cylinders — LPG and industrial cylinder manufacturing.",\n        "lake-plastics.html": "Lake Plastics — plastics manufacturing.",\n        "gulf-aggregates.html": "Gulf Aggregates — quarrying and aggregates supply.",\n        "cross-country.html": "Cross Country — real estate development.",\n        "ocean-galleria.html": "Ocean Galleria — luxury waterfront development.",\n        "fleet.html": "1,200+ truck fleet specifications and capabilities.",\n        "station-locator.html": "Lake Oil retail station finder across Tanzania.",\n    }',
  ],
  // §5 company pages — leadership profiles
  [
    '        "services.html": "Hub page linking all eight business sectors.",\n    }',
    '        "services.html": "Hub page linking all eight business sectors.",\n        "leadership-ally-edha-awadh.html": "Profile — Founder & Chairman.",\n        "leadership-biji-lapat.html": "Profile — CEO Lake Energies.",\n        "leadership-juma-nuru.html": "Profile — Director of Operations.",\n        "leadership-sridhar-mani.html": "Profile — Director of Digital Transformation.",\n        "leadership-dileep-kumar.html": "Profile — CEO Manufacturing Division.",\n        "leadership-bibhuti-singh.html": "Profile — CFO AFICD.",\n        "leadership-mohammed-khalid.html": "Profile — Managing Director ATL.",\n    }',
  ],
  // JS_FILES — hero entries
  [
    '    "hero-3d.js": """Three.js module (bundled to hero-3d.bundle.js). See Section 9.""",\n    "hero-3d.bundle.js": """esbuild output: hero-3d.js + three.module.min.js as classic script. ~0.5MB. Rebuild via scripts/build_hero_bundle.sh."""',
    '    "hero-globe.js": """React island source (assets/hero-globe/ — HeroGlobe.jsx, mount.jsx, locations.js). Bundled to hero-globe.bundle.js. See Section 8.""",\n    "hero-globe.bundle.js": """esbuild output: React + react-globe.gl as classic IIFE. ~2MB. Rebuild via npm run build:hero-globe."""',
  ],
  // §14 scripts_table — new scripts
  [
    '<tr><td>build_hero_bundle.sh</td><td>esbuild hero-3d.js → hero-3d.bundle.js</td></tr>',
    '<tr><td>build_hero_globe.js</td><td>esbuild hero-globe (React) → hero-globe.bundle.js</td></tr>\n<tr><td>build_leadership_pages.js</td><td>Generate leadership-*.html profile pages</td></tr>\n<tr><td>build_pt_es_lang.js / build_hi_ar_lang.js</td><td>Build PT/ES and HI/AR translation caches</td></tr>\n<tr><td>build_presentation.py</td><td>Generate the company presentation deck</td></tr>\n<tr><td>bust_asset_cache.js</td><td>Bump ?v= cache-busting query params sitewide</td></tr>',
  ],
  // §25 workflow — hero-globe rebuild
  [
    '<h3>25.3 Update 3D Globe Sites</h3>\n<ol>\n<li>Verify facts in scripts/_verified_lake_facts.md</li>\n<li>Edit SITES and/or FACILITIES in hero-3d.js</li>\n<li>Update SITE_NAMES for en/fr/sw</li>\n<li>bash scripts/build_hero_bundle.sh</li>\n<li>Bump ?v= on index.html</li>\n<li>node scripts/_globe_qa2.js</li>\n</ol>',
    '<h3>25.3 Update 3D Globe Sites</h3>\n<ol>\n<li>Verify facts in scripts/_verified_lake_facts.md</li>\n<li>Edit LOCATIONS in assets/hero-globe/locations.js</li>\n<li>npm run build:hero-globe</li>\n<li>Bump ?v= on hero-globe.bundle.js in index.html</li>\n<li>node scripts/_globe_qa2.js</li>\n</ol>',
  ],
  // §27 perf budget row
  [
    '<tr><td>hero-3d.bundle.js</td><td>~500KB</td><td>Lazy on IO</td></tr>',
    '<tr><td>hero-globe.bundle.js</td><td>~2MB</td><td>Lazy on IO</td></tr>',
  ],
  // §28 version rows
  [
    '<tr><td>hero-3d bundle</td><td>v9 query param</td><td>file:// safe</td></tr>',
    '<tr><td>hero-globe bundle</td><td>React/react-globe.gl</td><td>IIFE, file:// safe</td></tr>',
  ],
  [
    '<tr><td>Portuguese (PT)</td><td>Removed</td><td>Replaced with Swahili (SW)</td></tr>',
    '<tr><td>Languages</td><td>6 (en, fr, sw, pt, es, ar)</td><td>PT/ES/AR built via cache scripts</td></tr>',
  ],
  [
    '<tr><td>Flagship CSS rollout</td><td>28/29 pages</td><td>index.html remains on theme.css</td></tr>',
    '<tr><td>Flagship CSS rollout</td><td>47/48 pages</td><td>index.html remains on theme.css</td></tr>',
  ],
  [
    '<tr><td>PWA / Service Worker</td><td>v10</td><td>Bump VERSION per deploy</td></tr>',
    '<tr><td>PWA / Service Worker</td><td>v68</td><td>Bump VERSION per deploy</td></tr>',
  ],
  [
    '<tr><td>lake-3d Next.js</td><td>Orphaned</td><td>Not in production</td></tr>',
    '<tr><td>archive/lake-3d Next.js</td><td>Retired</td><td>Moved to archive/, not in production</td></tr>',
  ],
  // §30 subsidiaries table rows
  [
    '<tr><td>Lake Oil</td><td>Fuel &amp; Petroleum</td><td>fuel.html</td><td>Top 5 distributor Tanzania; 85+ stations; 8 countries</td></tr>',
    '<tr><td>Lake Oil</td><td>Fuel &amp; Petroleum</td><td>lake-oil.html</td><td>Top 5 distributor Tanzania; 152+ stations; 9 countries</td></tr>',
  ],
  [
    '<tr><td>Lake Gas</td><td>LPG</td><td>lpg.html</td><td>6kg–38kg cylinders; composite cylinders; Tanga 3,000 MT terminal</td></tr>',
    '<tr><td>Lake Gas</td><td>LPG</td><td>lake-gas.html</td><td>6kg–38kg cylinders; composite cylinders; Tanga 3,000 MT terminal</td></tr>',
  ],
  [
    '<tr><td>Lake Lubes</td><td>Lubricants</td><td>lubricants.html</td><td>Automotive and industrial greases</td></tr>',
    '<tr><td>Lake Lubes</td><td>Lubricants</td><td>lake-lubes.html</td><td>Automotive and industrial greases</td></tr>',
  ],
  [
    '<tr><td>Lake Steel</td><td>Steel</td><td>steel.html</td><td>First HS-CR rebar in Tanzania; 100,000 MT/yr; Kibaha mill</td></tr>',
    '<tr><td>Lake Steel</td><td>Steel</td><td>lake-steel.html</td><td>First HS-CR rebar in Tanzania; 100,000 MT/yr; Kibaha mill</td></tr>',
  ],
  [
    '<tr><td>GCCP</td><td>Concrete</td><td>concrete.html</td><td>Ready-mix Dar es Salaam; Lugoba quarry; est. 2010</td></tr>',
    '<tr><td>GCCP</td><td>Concrete</td><td>lake-premix-cement.html</td><td>Ready-mix Dar es Salaam; Lugoba quarry; est. 2010</td></tr>',
  ],
  [
    '<tr><td>Lake Trans</td><td>Logistics</td><td>logistics.html, fleet.html</td><td>700+ trucks; bulk liquid and dry cargo</td></tr>',
    '<tr><td>Lake Trans</td><td>Logistics</td><td>lake-trans.html, fleet.html</td><td>1,200+ trucks; bulk liquid and dry cargo</td></tr>',
  ],
  [
    '<tr><td>AFICD / ACFS</td><td>Containers</td><td>container-services.html</td><td>Inland depots Tanzania, Zambia, Mozambique</td></tr>',
    '<tr><td>AFICD / ACFS</td><td>Containers</td><td>aficd.html</td><td>Inland depots Tanzania, Zambia, Mozambique</td></tr>',
  ],
  // §32 FAQ — hero answer
  [
    '<dt>Q3. Why bundle hero-3d.js?</dt><dd>ES module scripts are blocked under file://. esbuild produces a classic script with Three.js inlined.</dd>',
    '<dt>Q3. Why bundle hero-globe?</dt><dd>ES module scripts are blocked under file://. esbuild produces a classic IIFE with React + react-globe.gl inlined (npm run build:hero-globe).</dd>',
  ],
  [
    '<dt>Q7. What is lake-3d/?</dt><dd>Orphaned Next.js prototype. Not linked from production. Delete or budget separate migration project.</dd>',
    '<dt>Q7. What is archive/lake-3d/?</dt><dd>Retired Next.js 3D prototype moved out of the tree. Not linked from production.</dd>',
  ],
  // §34 countries — employee/station counts aren't there; leave
  // §35 template language switcher
  [
    '<p>Desktop navigation with three dropdown menus (Services, Network, Company), language switcher (EN/FR/SW buttons with .lang-btn and data-lang), and logo link to index.html. All labels use data-i18n keys under nav.* prefix.</p>',
    '<p>Desktop navigation with three dropdown menus (Services, Network, Company), language switcher (EN/FR/SW/PT/ES/AR buttons with .lang-btn and data-lang), and logo link to index.html. All labels use data-i18n keys under nav.* prefix.</p>',
  ],
  // §36 ADR-001 rationale
  [
    'Works on file:// for local preview. Firebase Hosting serves static files efficiently.',
    'Works on file:// for local preview. Vercel serves static files efficiently.',
  ],
  // §36 ADR-005
  [
    '<h3>36.5 ADR-005: Lazy-Load 3D Bundle</h3>\n<p><strong>Context:</strong> hero-3d.bundle.js is ~500KB.</p>',
    '<h3>36.5 ADR-005: Lazy-Load 3D Bundle</h3>\n<p><strong>Context:</strong> hero-globe.bundle.js is ~2MB.</p>',
  ],
  // §38 related docs + regen
  [
    '<p>Source of truth is always the repository files — this document is generated from live project metadata and should be regenerated before major releases.</p>',
    '<p>Source of truth is always the repository files — this document is generated from live project metadata and should be regenerated before major releases. Related: <code>docs/backend-guide.html</code> (CMS backend guide) and the README (developer guides + content-team guide).</p>',
  ],
];

// ---------------------------------------------------------------------------
// APPLY
// ---------------------------------------------------------------------------
function applyPairs(text, pairs, label) {
  let t = text;
  let applied = 0;
  let missed = 0;
  for (const [oldS, newS] of pairs) {
    if (oldS === null) continue;
    if (t.includes(oldS)) {
      t = t.split(oldS).join(newS);
      applied++;
    } else {
      missed++;
      console.log(`  [${label}] MISS: ${oldS.slice(0, 80).replace(/\n/g, '\\n')}…`);
    }
  }
  console.log(`[${label}] applied ${applied}, missed ${missed}`);
  return t;
}

let html = readFile(htmlPath);
let py = readFile(pyPath);

// Whole-section replacements must be handled specially (long blocks).
// §8 in HTML:
const SEC8_OLD = html.includes('<h2>8. 3D Hero Architecture (hero-3d.js)</h2>')
  ? html.slice(html.indexOf('<section id="sec-8"'), html.indexOf('<section id="sec-9"'))
  : null;
if (SEC8_OLD) {
  html = html.replace(SEC8_OLD, SEC8_NEW);
  console.log('[html] replaced §8 hero section');
} else {
  console.log('[html] MISS: §8 hero section (block)');
}

// §8b deep-dive in HTML:
const SEC8B_START = html.indexOf('<section id="sec-8b"');
const SEC8B_END = html.indexOf('<section id="sec-7b"');
if (SEC8B_START >= 0 && SEC8B_END > SEC8B_START) {
  html = html.slice(0, SEC8B_START) + SEC8B_NEW + html.slice(SEC8B_END);
  console.log('[html] replaced §8b hero deep dive');
} else {
  console.log('[html] MISS: §8b deep dive (block)');
}

// §8 in Python generator:
const PY_SEC8_START = py.indexOf('<section id="sec-8"');
const PY_SEC8_END = py.indexOf('<section id="sec-9"');
if (PY_SEC8_START >= 0 && PY_SEC8_END > PY_SEC8_START) {
  py = py.slice(0, PY_SEC8_START) + SEC8_NEW + py.slice(PY_SEC8_END);
  console.log('[py] replaced §8 hero section');
} else {
  console.log('[py] MISS: §8 hero section (block)');
}

// §8b in Python generator (extended content):
const PY_SEC8B_START = py.indexOf('<section id="sec-8b"');
const PY_SEC8B_END = py.indexOf('<section id="sec-7b"');
if (PY_SEC8B_START >= 0 && PY_SEC8B_END > PY_SEC8B_START) {
  py = py.slice(0, PY_SEC8B_START) + SEC8B_NEW + py.slice(PY_SEC8B_END);
  console.log('[py] replaced §8b hero deep dive');
} else {
  console.log('[py] MISS: §8b deep dive (block)');
}

// Insert new sections 41/42/43 BEFORE the closing footer in the HTML.
const footerIdx = html.lastIndexOf('</body>');
if (footerIdx >= 0) {
  html = html.slice(0, footerIdx) + SEC41_NEW + '\n' + SEC42_NEW + '\n' + SEC43_NEW + '\n' + html.slice(footerIdx);
  console.log('[html] inserted §41/§42/§43 before </body>');
}

// Insert the same new sections into the Python generator just before §38.
const PY38 = py.indexOf('<section id="sec-38"');
if (PY38 >= 0) {
  py = py.slice(0, PY38) + SEC41_NEW + '\n' + SEC42_NEW + '\n' + SEC43_NEW + '\n' + py.slice(PY38);
  console.log('[py] inserted §41/§42/§43 before §38');
} else {
  console.log('[py] MISS: §38 anchor for new sections');
}

// Apply shared pairs to both files.
html = applyPairs(html, shared, 'html/shared');
py = applyPairs(py, shared, 'py/shared');

// Apply HTML-only pairs.
html = applyPairs(html, htmlOnly, 'html-only');

// Apply Python-only pairs.
py = applyPairs(py, pyOnly, 'py-only');

writeFile(htmlPath, html);
writeFile(pyPath, py);

console.log('Done. Files written.');
