#!/usr/bin/env python3
"""Generate docs/developer-guide.html from project sources."""
import html
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "developer-guide.html"

EXCLUDE_PARTS = {".git", "node_modules", ".shots", "_chrome_profile_company", "_chrome_profile_globe"}


def esc(s):
    return html.escape(str(s), quote=True)


def file_tree():
    lines = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(
            d for d in dirnames
            if d not in EXCLUDE_PARTS and not d.startswith("_chrome_profile")
        )
        rel = Path(dirpath).relative_to(ROOT)
        if any(p in EXCLUDE_PARTS for p in rel.parts):
            continue
        if "node_modules" in rel.parts:
            continue
        depth = len(rel.parts)
        if depth == 0:
            prefix = ""
        else:
            prefix = "  " * (depth - 1)
            lines.append(f"{prefix}├── {rel.name}/")
        for fn in sorted(filenames):
            if rel == Path(".") and fn.startswith("."):
                continue
            lines.append(f"{prefix}  ├── {fn}")
    return "\n".join(lines)  # full tree


def page_meta():
    pages = {}
    for f in sorted(ROOT.glob("*.html")):
        c = f.read_text(encoding="utf-8", errors="replace")
        title = re.search(r"<title>([^<]+)</title>", c)
        desc = re.search(r'name="description"\s+content="([^"]*)"', c)
        css = re.findall(r'<link[^>]+href="([^"]+\.css[^"]*)"', c)
        js = re.findall(r'<script[^>]+src="([^"]+\.js[^"]*)"', c)
        inline_hero = "hero-3d" in c
        schema_types = re.findall(r'"@type"\s*:\s*"([^"]+)"', c)
        h2s = [re.sub(r"\s+", " ", h).strip() for h in re.findall(r"<h2[^>]*>([^<]{1,120})", c)]
        section_ids = re.findall(r'<section[^>]*id="([^"]+)"', c)
        pages[f.name] = {
            "title": title.group(1) if title else f.stem,
            "desc": desc.group(1) if desc else "",
            "css": css,
            "js": js,
            "hero3d": inline_hero,
            "schema": schema_types,
            "h2s": h2s,
            "section_ids": section_ids,
            "lines": c.count("\n"),
        }
    return pages


PAGES_DETAIL = {
    "index.html": {
        "purpose": "Corporate homepage and primary entry point. Presents the Lake Group value proposition, live 3D global operations experience, division grid, founder message, stats, news teaser, and primary CTAs.",
        "sections": [
            ("#fuel-experience / .experience-3d", "Full-viewport interactive Three.js Earth globe with autonomous 39-second loop showing verified operational footprint across 8 countries + Dubai."),
            (".hero", "Above-the-fold headline, subcopy, and primary navigation into services and contact."),
            (".stats-grid", "Animated counters: 4,600+ employees, 700+ trucks, 85+ stations, 8 countries."),
            (".divisions-grid", "Eight sector cards linking to fuel, LPG, lubricants, steel, concrete, logistics, containers, and services hub."),
            (".founder-section", "Pull quote and portrait of founder Ally Edha Awadh."),
            (".cta-band", "Final conversion band with contact and careers links."),
        ],
        "unique": "Only page using theme.css + motion.js (not flagship). Lazy-loads hero-3d.bundle.js via IntersectionObserver with 600px rootMargin. Inline critical CSS in <head> (~2000 lines). Organization JSON-LD.",
        "css": "assets/theme.css, assets/assistant.css",
        "js": "i18n stack, site.js, assistant stack, lazy hero-3d.bundle.js, pwa.js, motion.js",
    },
    "about.html": {
        "purpose": "Company overview: founding story, growth narrative, values, and subsidiary introduction. Reference implementation of the Meridian (flagship) design system.",
        "sections": [
            (".page-hero", "Immersive ink band with Bebas display headline."),
            ("#our-story-embed", "Embedded cinematic slideshow (our-story.html in iframe or inline OSE stage)."),
            (".fs-split sections", "Story beats with photography from Lake Group operations."),
            (".values-grid", "Mission, vision, integrity pillars."),
        ],
        "unique": "First flagship-migrated page; template for all subsequent Meridian rollouts.",
        "css": "flagship.css, assistant.css",
        "js": "Standard deferred stack + flagship-motion.js",
    },
    "africa-network.html": {
        "purpose": "Interactive operations map of East & Central Africa with country cards, asset legend, and Leaflet satellite map.",
        "sections": [
            (".page-hero", "Network overview headline."),
            ("#lake-africa-map", "Full-width Leaflet map with Esri hybrid tiles, country borders, asset markers, pipeline polylines."),
            (".country-grid", "Selectable country cards syncing with map flyTo."),
            (".map-legend", "Filter buttons by asset type: HQ, fuel, port, container, industrial, logistics."),
        ],
        "unique": "Loads Leaflet synchronously (no defer) plus data_countries_africa.js before africa-network-map.js. Requires network for tile layers.",
        "css": "flagship.css, assistant.css, vendor/leaflet/leaflet.css",
        "js": "leaflet.js, data_countries_africa.js, africa-network-map.js + standard stack",
    },
    "404.html": {
        "purpose": "Branded not-found page with navigation back to key sections.",
        "sections": [(".error-page", "404 message and helpful links.")],
        "unique": "No i18n-content.js or site.js — minimal script set. Assistant still available offline.",
        "css": "flagship.css, assistant.css",
        "js": "pwa.js, flagship-motion.js, assistant stack only",
    },
    "offline.html": {
        "purpose": "PWA offline fallback served by service worker when navigation fails without network.",
        "sections": [(".offline-shell", "Explains offline state; links to precached about, services, contact, africa-network.")],
        "unique": "Listed in robots.txt Disallow. Precached in sw.js PRECACHE_URLS.",
        "css": "flagship.css, assistant.css",
        "js": "pwa.js, flagship-motion.js, assistant stack",
    },
    "dashboard.html": {
        "purpose": "Mock client portal UI (sign-in form, dashboard preview). Demo only — excluded from sitemap and robots.",
        "sections": [
            (".auth-panel", "Email/password mock sign-in."),
            (".dashboard-preview", "Placeholder shipment tracking widgets."),
        ],
        "unique": "robots.txt Disallow. No JSON-LD. Not in assistant KB page map.",
        "css": "flagship.css, assistant.css",
        "js": "Standard stack",
    },
    "our-story.html": {
        "purpose": "Standalone cinematic brand story — eight auto-advancing scenes with Lake Group photography, keyboard/tap navigation.",
        "sections": [
            (".ose-stage", "Full-screen slideshow scenes 1–8."),
            (".story-stats", "Closing stats overlay with link back to main site."),
        ],
        "unique": "Not linked from main nav. i18n scripts loaded without defer. Uses lake-story-assets/ images.",
        "css": "flagship.css, assistant.css",
        "js": "i18n (sync), pwa.js, flagship-motion.js, assistant",
    },
    "news.html": {
        "purpose": "News listing with search, category filter, country filter, and paginated article cards.",
        "sections": [
            (".page-hero", "News & Events headline."),
            (".news-filters", "Search input, category select, country select."),
            ("#news-list", "Dynamically rendered by news.js from LAKE_NEWS array."),
        ],
        "unique": "Loads news-data.js + news.js. Article cards use data-category and data-countries for client-side filtering.",
        "css": "flagship.css, assistant.css",
        "js": "Standard + news-data.js + news.js",
    },
    "news-article.html": {
        "purpose": "Single article view driven by ?id= query parameter.",
        "sections": [
            ("#article-root", "Title, date, category badge, banner, description paragraphs, image gallery, optional YouTube embed."),
        ],
        "unique": "NewsArticle JSON-LD generated dynamically. Redirects to news.html if invalid id.",
        "css": "flagship.css, assistant.css",
        "js": "Standard + news-data.js + news.js",
    },
}

# Default template for service/company pages
def default_page_detail(name, meta):
    stem = name.replace(".html", "").replace("-", " ").title()
    return {
        "purpose": meta.get("desc") or f"Lake Group {stem} page.",
        "sections": [(f"h2: {h}", "Content section.") for h in meta.get("h2s", [])[:6]] or [("main content", "Standard flagship page layout.")],
        "unique": "Flagship design system. Organization or WebPage JSON-LD where applicable.",
        "css": ", ".join(meta.get("css", [])) or "flagship.css, assistant.css",
        "js": ", ".join(meta.get("js", [])) or "Standard deferred stack",
    }


JS_FILES = {
    "site.js": """Shared site behaviour module (IIFE). Responsibilities:
• initNav() — mobile toggle, exact-filename active link highlighting
• initReveal() — IntersectionObserver for .reveal elements
• initCounters() — animated [data-count] with easing
• initTabs() — .tab-nav / .tab-pane switching
• initChat() — legacy canned-reply chat (bypassed when assistant active)
• initAnchors() — smooth scroll for hash links
• initForms() — mock form submit UX for data-mock forms
• initCurrency() — investors page currency converter
Exports window.LakeSite with initReveal/initCounters. Calls LakeI18n.init() on DOMContentLoaded.""",
    "i18n.js": """IIFE exposing window.LakeI18n. Languages: en, fr, sw. Reads window.__LAKE_I18N_CONTENT__ from i18n-content.js (never fetch — file:// safe). Attributes: data-i18n, data-i18n-html, data-i18n-placeholder, data-i18n-title, data-i18n-alt, data-i18n-aria. Persists lake-lang in localStorage. Dispatches lake-i18n-applied event.""",
    "i18n-content.js": """Build artifact: window.__LAKE_I18N_CONTENT__ = { en: {...}, fr: {...}, sw: {...} }. ~1,442 keys. Generated by scripts/build_i18n_content.py from scripts/_master_en.json + translation_dict.py.""",
    "pwa.js": """Registers sw.js relative to script URL. Shows branded update toast when new SW version waiting. SKIP_WAITING on user click. Reload only after user-initiated update.""",
    "motion.js": """Pairs with theme.css. Adds html.lg-motion. Auto-tags .reveal on grids/orphans. Nav hide/show on scroll. Card 3D tilt (pointer:fine). Respects prefers-reduced-motion.""",
    "flagship-motion.js": """Pairs with flagship.css. Adds html.fs-motion. Richer fx-* choreography (fx-rise, fx-clip, fx-mask, fx-wipe). Scroll progress via [data-fx-scroll]. Magnetic CTA hover. [data-fs-count] counters.""",
    "hero-3d.js": """Three.js module (bundled to hero-3d.bundle.js). See Section 9.""",
    "hero-3d.bundle.js": """esbuild output: hero-3d.js + three.module.min.js as classic script. ~0.5MB. Rebuild via scripts/build_hero_bundle.sh.""",
    "assistant.js": """Offline knowledge assistant. FlexSearch retrieval over assistant-kb.js. IndexedDB lake-assistant/messages. Sets __LAKE_ASSISTANT_ACTIVE__. UI replaces #chat-widget.""",
    "assistant-kb.js": """Build artifact: window.__LAKE_ASSISTANT_KB__. Generated by scripts/build_assistant_kb.js.""",
    "news.js": """Renders news list and article detail from window.LAKE_NEWS. Filters by search/category/country. YouTube embed helper.""",
    "news-data.js": """window.LAKE_NEWS array — article metadata, images, categories, dates.""",
    "africa-network-map.js": """Leaflet map init. ASSETS, PIPELINES, COUNTRY_META. window.LakeAfricaMap API. GeoJSON from __LAKE_AFRICA_GEOJSON__.""",
    "data_countries_africa.js": """window.__LAKE_AFRICA_GEOJSON__ — Africa country borders for offline/file:// map.""",
}


def build_html():
    meta = page_meta()
    tree = file_tree()

    body_parts = []

    # Cover
    body_parts.append("""
<section class="cover page-break">
  <div class="cover-inner">
    <p class="cover-eyebrow">Internal Documentation</p>
    <h1 class="cover-title">Lake Group Website<br>Developer Guide</h1>
    <p class="cover-sub">Static Multi-Page Corporate Site — Architecture, Systems &amp; Reference</p>
    <p class="cover-meta">Version aligned with repository · July 2026<br>Production URL: https://www.lakeoilgroup.com/</p>
    <p class="cover-stats">29 HTML pages · 28 live + dashboard demo · Firebase Hosting · PWA-enabled</p>
  </div>
</section>
""")

    # TOC
    toc_items = [
        ("1", "Architecture Overview"),
        ("2", "Technology Stack"),
        ("3", "Production File Tree"),
        ("4", "Shared Page Anatomy"),
        ("5", "HTML Page Reference (All Pages)"),
        ("6", "JavaScript Modules"),
        ("7", "CSS Design Systems"),
        ("8", "3D Hero Architecture (hero-3d.js)"),
        ("9", "Progressive Web App"),
        ("10", "Internationalization (i18n)"),
        ("11", "Knowledge Assistant"),
        ("12", "News System"),
        ("13", "Africa Network Map"),
        ("14", "Build &amp; Maintenance Scripts"),
        ("15", "SEO &amp; Structured Data"),
        ("16", "Deployment Checklist"),
        ("17", "Accessibility"),
        ("18", "Appendices"),
        ("19", "Troubleshooting"),
        ("20", "Firebase Hosting"),
        ("21", "Image Assets"),
        ("22", "i18n Key Conventions"),
        ("23", "Extended Page Docs"),
        ("24", "Extended JS Docs"),
        ("25–28", "Workflows, Security, Performance, Versions"),
        ("29–38", "Reference Tables &amp; ADRs"),
    ]
    toc_html = '<nav class="toc page-break"><h2>Table of Contents</h2><ol class="toc-list">\n'
    for num, title in toc_items:
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        toc_html += f'  <li><a href="#sec-{num}"><span class="toc-num">{num}.</span> {esc(title)}</a></li>\n'
    toc_html += "</ol></nav>"
    body_parts.append(toc_html)

    # Section 1 Architecture
    body_parts.append("""
<section id="sec-1" class="chapter page-break">
<h2>1. Architecture Overview</h2>
<p class="lede">The Lake Group corporate website is a <strong>static multi-page application (MPA)</strong> — no React, Vue, or Angular on the live site. Each route is a standalone <code>.html</code> file at the repository root, served as static files with shared assets in <code>assets/</code>.</p>

<h3>1.1 High-Level Diagram</h3>
<pre class="diagram">┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                         │
├─────────────────────────────────────────────────────────────┤
│  index.html … sustainability.html  (29 pages)               │
│       │                                                      │
│       ├── flagship.css OR theme.css  (design system)         │
│       ├── flagship-motion.js OR motion.js                    │
│       ├── site.js + i18n.js + assistant.js                   │
│       └── page-specific: hero-3d, leaflet, news.js           │
├─────────────────────────────────────────────────────────────┤
│  Service Worker (sw.js) — precache, offline, cache strategies │
│  manifest.webmanifest — installable PWA metadata               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Firebase Hosting (production)                     │
│  npm run deploy  →  firebase deploy --only hosting             │
│  npm run serve   →  firebase emulators:start --only hosting    │
└─────────────────────────────────────────────────────────────┘</pre>

<h3>1.2 Design Principles</h3>
<ul>
<li><strong>Static-first:</strong> No server-side rendering or API dependency for page content. All copy ships in HTML + i18n-content.js.</li>
<li><strong>file:// safe:</strong> Critical data (translations, geo JSON, assistant KB, 3D bundle) loads via <code>&lt;script&gt;</code> globals, not <code>fetch()</code>, so double-clicking <code>index.html</code> still works.</li>
<li><strong>Progressive enhancement:</strong> Pages render without JS; motion, assistant, 3D, and map layers enhance when available.</li>
<li><strong>Template-driven chrome:</strong> Nav, mobile nav, footer, and chat widget are generated from <code>scripts/templates/</code> via <code>normalize_nav.py</code>.</li>
</ul>

<h3>1.3 What Is NOT Live</h3>
<p><code>lake-3d/</code> is a separate Next.js scroll-driven 3D experience (port 3001). It is <em>not</em> linked from any production HTML page. The live homepage 3D is <code>assets/hero-3d.js</code> (bundled), embedded in <code>index.html</code> only.</p>

<h3>1.4 Page Load Lifecycle</h3>
<ol>
<li>Browser parses HTML; inline critical CSS paints first paint.</li>
<li>External CSS (flagship/theme + assistant) loads.</li>
<li>Deferred scripts execute in order: i18n-content → i18n → site → flexsearch → assistant-kb → assistant → [page-specific] → pwa → motion.</li>
<li><code>DOMContentLoaded</code>: site.js inits nav, reveals, counters; LakeI18n applies stored language.</li>
<li><code>load</code>: pwa.js registers service worker.</li>
<li>index.html only: IntersectionObserver lazy-loads hero-3d.bundle.js when #fuel-experience nears viewport.</li>
</ol>

<h3>1.5 Dual Design System Migration</h3>
<p>The site is mid-migration from <code>theme.css</code> + <code>motion.js</code> (legacy) to <code>flagship.css</code> + <code>flagship-motion.js</code> (Meridian). Only <code>index.html</code> still uses the legacy pair. Both remain precached in <code>sw.js</code> until rollout completes. See Section 7.</p>
</section>
""")

    # Section 2 Tech stack
    stack_rows = [
        ("HTML5", "Page structure", "Zero build step for pages; SEO-friendly; works everywhere"),
        ("CSS3 (inline + flagship/theme)", "Styling", "Critical CSS inlined per page for FCP; shared system CSS for consistency"),
        ("Vanilla JavaScript (ES5/IIFE)", "Behaviour", "No framework runtime; small payload; file:// compatible when bundled"),
        ("Three.js (vendor)", "3D hero", "Industry-standard WebGL; bundled for non-module contexts"),
        ("Leaflet 1.x (vendor)", "Africa map", "Lightweight maps; Esri/OSM tile support"),
        ("FlexSearch (vendor)", "Assistant search", "Client-side full-text index; offline capable"),
        ("Firebase Hosting", "Deployment", "CDN, HTTPS, SPA-style rewrites optional; team already uses Firebase CLI"),
        ("Service Worker", "PWA / offline", "Precache shell; stale-while-revalidate for assets"),
        ("Python 3", "Build tooling", "i18n extraction, font self-hosting, nav normalization"),
        ("Node.js", "KB build, SW lang, QA", "build_assistant_kb.js, add_* tag scripts"),
        ("esbuild (via build_hero_bundle.sh)", "3D bundle", "Inlines Three.js import into classic script"),
        ("Self-hosted fonts", "Typography", "Inter, Bebas Neue, Playfair, Material Symbols — no Google Fonts CDN"),
    ]
    stack_table = '<table class="data-table"><thead><tr><th>Technology</th><th>Role</th><th>Why Chosen</th></tr></thead><tbody>\n'
    for tech, role, why in stack_rows:
        stack_table += f"<tr><td><code>{esc(tech)}</code></td><td>{esc(role)}</td><td>{esc(why)}</td></tr>\n"
    stack_table += "</tbody></table>"
    body_parts.append(f'<section id="sec-2" class="chapter page-break"><h2>2. Technology Stack</h2><p class="lede">Complete inventory of production technologies with rationale.</p>{stack_table}</section>')

    # Section 3 file tree
    body_parts.append(f"""
<section id="sec-3" class="chapter page-break">
<h2>3. Production File Tree</h2>
<p>Excludes <code>.git</code>, <code>node_modules</code>, <code>.shots</code>, and Chrome QA profiles under <code>scripts/_chrome_profile*</code>.</p>
<pre class="file-tree">{esc(tree)}</pre>
<h3>3.1 Key Directories</h3>
<table class="data-table">
<thead><tr><th>Path</th><th>Contents</th></tr></thead>
<tbody>
<tr><td><code>/*.html</code></td><td>29 routable pages at site root</td></tr>
<tr><td><code>assets/</code></td><td>CSS, JS, fonts, images, icons, vendor libs</td></tr>
<tr><td><code>assets/images/</code></td><td>Banners, news photos, leadership, planet textures, flags</td></tr>
<tr><td><code>assets/vendor/</code></td><td>three.module.min.js, leaflet, flexsearch (vendored, no CDN)</td></tr>
<tr><td><code>scripts/</code></td><td>Build, QA, migration, and template tooling</td></tr>
<tr><td><code>scripts/templates/</code></td><td>nav.html, mobile_nav.html, footer.html, chat_widget.html</td></tr>
<tr><td><code>lake-3d/</code></td><td>Orphaned Next.js prototype (not deployed with main site)</td></tr>
<tr><td><code>lake-story-assets/</code></td><td>Photography for our-story.html slideshow</td></tr>
<tr><td><code>sw.js</code></td><td>Service worker at root (scope = entire site)</td></tr>
<tr><td><code>manifest.webmanifest</code></td><td>PWA manifest</td></tr>
</tbody></table>
</section>
""")

    # Section 4 anatomy
    body_parts.append("""
<section id="sec-4" class="chapter page-break">
<h2>4. Shared Page Anatomy</h2>

<h3>4.1 Standard &lt;head&gt; Tags</h3>
<pre class="code-block">&lt;meta charset="UTF-8" /&gt;
&lt;meta name="viewport" content="width=device-width,initial-scale=1.0" /&gt;
&lt;meta name="description" content="…" /&gt;
&lt;meta property="og:title" content="…" /&gt;
&lt;meta property="og:description" content="…" /&gt;
&lt;meta property="og:image" content="assets/images/og-cover.jpg" /&gt;
&lt;meta property="og:type" content="website" /&gt;
&lt;meta name="twitter:card" content="summary_large_image" /&gt;
&lt;link rel="canonical" href="https://www.lakeoilgroup.com/page.html" /&gt;
&lt;link rel="icon" href="favicon.ico" sizes="32x32" /&gt;
&lt;link rel="icon" href="assets/icons/pwa/icon-192.png" type="image/png" sizes="192x192" /&gt;
&lt;meta name="theme-color" content="#1D3EA8" /&gt;
&lt;link rel="manifest" href="manifest.webmanifest" /&gt;
&lt;link rel="apple-touch-icon" href="assets/icons/pwa/apple-touch-icon.png" /&gt;
&lt;link rel="preload" href="assets/fonts/files/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin /&gt;
&lt;style&gt;… page-inline critical CSS …&lt;/style&gt;
&lt;script type="application/ld+json"&gt;…&lt;/script&gt;  &lt;!-- most pages --&gt;
&lt;link rel="stylesheet" href="assets/flagship.css"&gt;
&lt;link rel="stylesheet" href="assets/assistant.css"&gt;</pre>

<h3>4.2 Script Load Order (Standard Page)</h3>
<table class="data-table">
<thead><tr><th>Order</th><th>Script</th><th>defer?</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td>1</td><td>assets/i18n-content.js</td><td>yes</td><td>Sets __LAKE_I18N_CONTENT__</td></tr>
<tr><td>2</td><td>assets/i18n.js</td><td>yes</td><td>Language engine</td></tr>
<tr><td>3</td><td>assets/site.js</td><td>yes</td><td>Nav, reveals, counters, tabs</td></tr>
<tr><td>4</td><td>assets/vendor/flexsearch/flexsearch.bundle.min.js</td><td>yes</td><td>Search index library</td></tr>
<tr><td>5</td><td>assets/assistant-kb.js</td><td>yes</td><td>Knowledge base payload</td></tr>
<tr><td>6</td><td>assets/assistant.js</td><td>yes</td><td>Chat assistant UI</td></tr>
<tr><td>7</td><td>[page-specific]</td><td>varies</td><td>news, leaflet, etc.</td></tr>
<tr><td>8</td><td>assets/pwa.js</td><td>yes</td><td>Service worker registration</td></tr>
<tr><td>9</td><td>assets/flagship-motion.js</td><td>yes</td><td>Motion (or motion.js on index)</td></tr>
</tbody></table>
<p><strong>Rule:</strong> i18n-content.js MUST precede i18n.js. Assistant KB MUST precede assistant.js. Motion script loads last so it can auto-tag DOM after content scripts run.</p>

<h3>4.3 Body Structure</h3>
<pre class="code-block">&lt;body&gt;
  &lt;nav class="site-nav"&gt;…&lt;/nav&gt;           &lt;!-- scripts/templates/nav.html --&gt;
  &lt;div class="nav-mobile" id="nav-mobile"&gt;…&lt;/div&gt;
  &lt;main&gt;
    &lt;section class="page-hero"&gt;…&lt;/section&gt;
    &lt;!-- page sections --&gt;
  &lt;/main&gt;
  &lt;footer class="site-footer"&gt;…&lt;/footer&gt;
  &lt;div id="chat-widget"&gt;…&lt;/div&gt;         &lt;!-- assistant mount --&gt;
  &lt;!-- deferred scripts --&gt;
&lt;/body&gt;</pre>

<h3>4.4 Navigation Template</h3>
<p>Primary nav (<code>scripts/templates/nav.html</code>) includes: Home, About, Services dropdown (fuel/lpg/lubricants/steel/concrete/logistics/containers), Network dropdown (africa map, station locator, fleet), Company dropdown (history, leadership, csr, investors, projects, gallery), News, Careers, and EN/FR/SW language switcher.</p>
<p>Do not hand-edit nav/footer in individual pages — run <code>python3 scripts/normalize_nav.py</code> after template changes.</p>

<h3>4.5 data-i18n Attribute Convention</h3>
<ul>
<li><code>data-i18n="key"</code> — textContent replacement</li>
<li><code>data-i18n-html="key"</code> — innerHTML (for &lt;em&gt;, &lt;strong&gt; in translations)</li>
<li><code>data-i18n-placeholder</code>, <code>data-i18n-title</code>, <code>data-i18n-alt</code>, <code>data-i18n-aria</code></li>
<li>Keys follow dot notation: <code>nav.home</code>, <code>fuel.hero.title</code>, <code>chat.reply.fuel</code></li>
</ul>
</section>
""")

    # Section 5 - all pages
    pages_html = ['<section id="sec-5" class="chapter"><h2>5. HTML Page Reference</h2><p class="lede">Deep reference for every root HTML page.</p>']
    service_pages = {
        "fuel.html": "Lake Oil petroleum distribution — 85+ stations, bulk supply, competitive advantages.",
        "lpg.html": "Lake Gas LPG — cylinder sizes, bottling plants, clean cooking access.",
        "lubricants.html": "Lake Lubes — greases, industrial and automotive lubricants.",
        "steel.html": "Lake Steel HS-CR rebars — 100,000 MT/year rolling mill, first in Tanzania.",
        "concrete.html": "GCCP ready-mix concrete and aggregate — Lugoba quarry, project portfolio.",
        "logistics.html": "Lake Trans bulk liquid and dry cargo haulage.",
        "container-services.html": "AFICD inland container depots — Tanzania, Zambia, Mozambique.",
        "fleet.html": "700+ truck fleet specifications and capabilities.",
        "station-locator.html": "Lake Oil retail station finder across Tanzania.",
    }
    company_pages = {
        "history.html": "Timeline from 2006 founding to present pan-African conglomerate.",
        "leadership.html": "Executive team, founder profile, subsidiary management.",
        "csr.html": "Corporate social responsibility programs and community investment.",
        "sustainability.html": "Environmental stewardship, LPG clean cooking, ESG metrics.",
        "investors.html": "Financial highlights, governance, currency-convertible figures.",
        "projects.html": "Major infrastructure and industrial project case studies.",
        "gallery.html": "Masonry photo gallery with lightbox from operations and events.",
        "media-center.html": "Press releases and media kit downloads.",
        "careers.html": "Culture, benefits, CV submission form (mock).",
        "contact.html": "HQ address, phone, email, regional offices, contact form.",
        "services.html": "Hub page linking all eight business sectors.",
    }

    for fname in sorted(meta.keys()):
        m = meta[fname]
        detail = PAGES_DETAIL.get(fname)
        if not detail:
            purpose = service_pages.get(fname) or company_pages.get(fname) or m["desc"] or fname
            detail = {
                "purpose": purpose,
                "sections": [(h, "Primary content block.") for h in m["h2s"][:8]] or [("main", "Standard flagship layout")],
                "unique": "Migrated Meridian design. " + ("JSON-LD: " + ", ".join(m["schema"]) if m["schema"] else "No structured data."),
                "css": ", ".join(m["css"]) if m["css"] else "flagship.css",
                "js": ", ".join(m["js"]) if m["js"] else "standard stack",
            }

        sections_ul = "".join(f"<li><code>{esc(sid)}</code> — {esc(desc)}</li>" for sid, desc in detail["sections"])
        schema_str = ", ".join(m["schema"]) if m["schema"] else "None"
        pages_html.append(f"""
<article class="page-ref page-break" id="page-{fname.replace('.html','')}">
<h3>{esc(fname)}</h3>
<p><strong>Title:</strong> {esc(m['title'])}</p>
<p><strong>Purpose:</strong> {esc(detail['purpose'])}</p>
<p><strong>Approx. size:</strong> {m['lines']} lines of HTML</p>
<h4>Sections</h4>
<ul>{sections_ul}</ul>
<h4>CSS Loaded</h4>
<p><code>{esc(detail['css'])}</code></p>
<h4>JavaScript Loaded</h4>
<p><code>{esc(detail['js'])}</code></p>
<h4>Unique Features</h4>
<p>{esc(detail['unique'])}</p>
<h4>schema.org</h4>
<p>Types: <code>{esc(schema_str)}</code></p>
</article>
""")

    pages_html.append("</section>")
    body_parts.append("".join(pages_html))

    # Continue with remaining sections in part 2...
    return body_parts, meta


def build_remaining_sections(meta):
    parts = []

    # Section 6 JS
    js_html = '<section id="sec-6" class="chapter page-break"><h2>6. JavaScript Modules</h2>'
    for fname, desc in JS_FILES.items():
        js_html += f'<article class="js-ref"><h3>assets/{esc(fname)}</h3><p>{esc(desc)}</p></article>\n'
    vendor_notes = """
<h3>6.1 Vendor Libraries</h3>
<table class="data-table">
<thead><tr><th>File</th><th>Version</th><th>License</th><th>Usage</th></tr></thead>
<tbody>
<tr><td>vendor/three.module.min.js</td><td>r16x</td><td>MIT</td><td>hero-3d.js WebGL rendering</td></tr>
<tr><td>vendor/leaflet/leaflet.js</td><td>1.x</td><td>BSD-2</td><td>africa-network.html map</td></tr>
<tr><td>vendor/flexsearch/flexsearch.bundle.min.js</td><td>0.7.x</td><td>Apache-2.0</td><td>assistant.js full-text search</td></tr>
</tbody></table>
<p>All vendor code is self-hosted — no runtime CDN dependencies except map tile servers (Esri, OSM, OpenTopoMap) on africa-network.html.</p>
"""
    js_html += vendor_notes + "</section>"
    parts.append(js_html)

    # Section 7 CSS
    parts.append("""
<section id="sec-7" class="chapter page-break">
<h2>7. CSS Design Systems</h2>

<h3>7.1 theme.css vs flagship.css</h3>
<table class="data-table">
<thead><tr><th>Aspect</th><th>theme.css (Legacy)</th><th>flagship.css (Meridian)</th></tr></thead>
<tbody>
<tr><td>Used on</td><td>index.html only</td><td>All other migrated pages (28)</td></tr>
<tr><td>Design language</td><td>Blue/yellow corporate, 4–10px radius</td><td>Ink/paper editorial, 0–2px radius, Bebas display</td></tr>
<tr><td>Dark sections</td><td>.section-dark (navy)</td><td>.fs-on-dark / --ink system</td></tr>
<tr><td>Signature motif</td><td>Yellow divider bars</td><td>Meridian tick + corner brackets</td></tr>
<tr><td>Motion partner</td><td>motion.js (.reveal)</td><td>flagship-motion.js (.fx-*)</td></tr>
<tr><td>Typography</td><td>Inter + system</td><td>Bebas Neue display + Inter body + Playfair quotes</td></tr>
<tr><td>Tokens</td><td>--blue, --yellow, --radius 4px</td><td>--ink, --paper, --gold, --sp-* scale</td></tr>
</tbody></table>

<h3>7.2 motion.js vs flagship-motion.js</h3>
<table class="data-table">
<thead><tr><th>Feature</th><th>motion.js</th><th>flagship-motion.js</th></tr></thead>
<tbody>
<tr><td>Gate class</td><td>html.lg-motion</td><td>html.fs-motion</td></tr>
<tr><td>Reveal classes</td><td>.reveal, .reveal-left, .reveal-scale</td><td>.fx, .fx-rise, .fx-clip, .fx-mask, .fx-wipe</td></tr>
<tr><td>Auto-tagger</td><td>Grid children + orphans</td><td>Richer variant selection by element type</td></tr>
<tr><td>Nav behaviour</td><td>Hide on scroll down</td><td>Same + elevation shadow</td></tr>
<tr><td>Card tilt</td><td>3D pointer tilt (~3°)</td><td>Not primary — magnetic CTA instead</td></tr>
<tr><td>Scroll effects</td><td>—</td><td>[data-fx-scroll] → --fxp property</td></tr>
<tr><td>Counters</td><td>site.js [data-count]</td><td>[data-fs-count] with expo-out easing</td></tr>
<tr><td>Skip zones</td><td>#fuel-experience, .experience-3d, nav, chat</td><td>Same + .page-hero</td></tr>
</tbody></table>

<h3>7.3 assistant.css</h3>
<p>Isolated stylesheet for the knowledge assistant panel. Loaded on every page alongside the main design system. Uses CSS variables from whichever theme is active.</p>

<h3>7.4 Migration Rule</h3>
<p>A migrated page loads <strong>either</strong> theme.css+motion.js <strong>or</strong> flagship.css+flagship-motion.js — never both. See FLAGSHIP_DESIGN.md for component inventory and migration checklist.</p>
</section>
""")

    # Section 8 hero-3d
    parts.append("""
<section id="sec-8" class="chapter page-break">
<h2>8. 3D Hero Architecture (hero-3d.js)</h2>
<p class="lede">Interactive WebGL globe on index.html — verified operational footprint only (scripts/_verified_lake_facts.md).</p>

<h3>8.1 File Pipeline</h3>
<ol>
<li><code>assets/hero-3d.js</code> — ES module source with <code>import * as THREE</code></li>
<li><code>scripts/build_hero_bundle.sh</code> — esbuild bundles module + three into classic script</li>
<li><code>assets/hero-3d.bundle.js</code> — production payload (~0.5MB)</li>
<li>index.html lazy-loads bundle when #fuel-experience enters viewport (+600px margin)</li>
</ol>

<h3>8.2 Four Chapters (39s Loop)</h3>
<table class="data-table">
<thead><tr><th>Chapter</th><th>Progress</th><th>Duration</th><th>Content</th></tr></thead>
<tbody>
<tr><td>1 Planet</td><td>0.00 – 0.30</td><td>~10s</td><td>Earth at distance; Africa rotates into view</td></tr>
<tr><td>2 Footprint</td><td>0.30 – 0.65</td><td>~12s</td><td>9 sites ignite from Dar HQ; route arcs draw outward</td></tr>
<tr><td>3 Operations</td><td>0.65 – 0.90</td><td>~9s</td><td>Camera over East Africa; facility callouts on leader lines</td></tr>
<tr><td>4 Identity</td><td>0.90 – 1.00</td><td>~3s + 5s hold</td><td>Pull-back; DOM finale overlay (logo + tagline); fade to black; restart</td></tr>
</tbody></table>

<h3>8.3 Verified Sites (SITES array)</h3>
<table class="data-table">
<thead><tr><th>Key</th><th>City</th><th>Country</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>tz</td><td>Dar es Salaam · HQ</td><td>Tanzania</td><td>Plot 49 Mikocheni — hub site</td></tr>
<tr><td>ke</td><td>Nairobi</td><td>Kenya</td><td>Kenya network base</td></tr>
<tr><td>rw</td><td>Kigali</td><td>Rwanda</td><td>Lake Petroleum Rwanda</td></tr>
<tr><td>bu</td><td>Bujumbura</td><td>Burundi</td><td>Burundi Petroleum</td></tr>
<tr><td>cd</td><td>Lubumbashi</td><td>DR Congo</td><td>DRC Petroleum</td></tr>
<tr><td>zm</td><td>Ndola</td><td>Zambia</td><td>Lake Petroleum Zambia</td></tr>
<tr><td>et</td><td>Addis Ababa</td><td>Ethiopia</td><td>Wadi Elsundus / WAS</td></tr>
<tr><td>mz</td><td>Beira</td><td>Mozambique</td><td>Lake Oil LDA + AFICD</td></tr>
<tr><td>ae</td><td>MERM · SAFF</td><td>Dubai · UAE</td><td>Middle East operations</td></tr>
</tbody></table>

<h3>8.4 Facility Callouts (Chapter 3)</h3>
<ul>
<li><strong>TANGA LPG TERMINAL</strong> — 3,000 MT storage, marine mooring buoy</li>
<li><strong>DAR ES SALAAM PORT</strong> — Vessel bunkering, 38M-litre depot</li>
<li><strong>LAKE STEEL · KIBAHA</strong> — HS-CR mill, 100,000 MT/yr</li>
<li><strong>GCCP · DAR ES SALAAM</strong> — Ready-mix, Lugoba quarry</li>
</ul>

<h3>8.5 Textures (assets/images/planet/)</h3>
<table class="data-table">
<thead><tr><th>File</th><th>Resolution</th><th>Usage</th></tr></thead>
<tbody>
<tr><td>earth_color_2048.jpg</td><td>2048</td><td>Diffuse map (NASA Blue Marble)</td></tr>
<tr><td>earth_normal_1024.jpg</td><td>1024</td><td>Normal map (skipped on low quality)</td></tr>
<tr><td>earth_specular_1024.jpg</td><td>1024</td><td>Ocean specular mask</td></tr>
<tr><td>earth_clouds_1024.jpg</td><td>1024</td><td>Drifting cloud alpha layer</td></tr>
</tbody></table>
<p>TEX_ROT_Y = -120° aligns equirectangular Greenwich with three.js sphere UV mapping.</p>

<h3>8.6 Performance Optimizations</h3>
<ul>
<li><strong>Quality tiers:</strong> isLow = width&lt;768 OR hardwareConcurrency&lt;4 → fewer sphere segments, no normal map, lower star count, pixel ratio capped at 1</li>
<li><strong>maybeDemoteQuality():</strong> Sustained &gt;33ms frames for 90 frames → pixel ratio 1, clouds hidden</li>
<li><strong>IntersectionObserver:</strong> Pauses rAF when #experience-3d-panel off-screen</li>
<li><strong>visibilitychange:</strong> Pauses when tab hidden</li>
<li><strong>InstancedMesh:</strong> 9 country markers as single draw call</li>
<li><strong>Canvas sprite labels:</strong> Generated once at init, not per-frame</li>
<li><strong>Lazy bundle load:</strong> Does not block initial page load</li>
<li><strong>prefers-reduced-motion:</strong> Shows static finale overlay, no WebGL</li>
<li><strong>SW routing:</strong> network-first for hero-3d.bundle.js (never stale cache)</li>
</ul>

<h3>8.7 Public Hooks</h3>
<p><code>window.__lake3dFrames</code>, <code>window.__lake3dProgress</code> — used by QA scripts (_globe_qa2.js).</p>
</section>
""")

    # Section 9 PWA
    parts.append("""
<section id="sec-9" class="chapter page-break">
<h2>9. Progressive Web App</h2>

<h3>9.1 manifest.webmanifest</h3>
<table class="data-table">
<thead><tr><th>Field</th><th>Value</th></tr></thead>
<tbody>
<tr><td>name / short_name</td><td>Lake Group</td></tr>
<tr><td>start_url</td><td>./index.html</td></tr>
<tr><td>scope</td><td>./</td></tr>
<tr><td>display</td><td>standalone</td></tr>
<tr><td>theme_color</td><td>#1D3EA8</td></tr>
<tr><td>background_color</td><td>#0E1F5A</td></tr>
<tr><td>icons</td><td>192, 512, maskable 192/512 in assets/icons/pwa/</td></tr>
</tbody></table>

<h3>9.2 sw.js Versioning</h3>
<p>VERSION constant (currently <code>v10</code>) — bump on every deploy that changes precached files. Activate handler deletes all <code>lake-*</code> caches not in KNOWN_CACHES.</p>

<h3>9.3 Cache Buckets</h3>
<table class="data-table">
<thead><tr><th>Cache Name</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td>lake-precache-{VERSION}</td><td>Install-time precache (shell, fonts, core JS/CSS)</td></tr>
<tr><td>lake-pages-{VERSION}</td><td>HTML navigations (network-first)</td></tr>
<tr><td>lake-images-{VERSION}</td><td>Images (cache-first, max 150 entries LRU)</td></tr>
<tr><td>lake-assets-{VERSION}</td><td>JS/CSS/fonts/vendor (stale-while-revalidate)</td></tr>
</tbody></table>

<h3>9.4 Fetch Routing Strategies</h3>
<table class="data-table">
<thead><tr><th>Route Class</th><th>Strategy</th><th>Examples</th></tr></thead>
<tbody>
<tr><td>navigate</td><td>Network-first → cached page → offline.html</td><td>All HTML pages</td></tr>
<tr><td>network-first-asset</td><td>Network-first</td><td>news-data.js, hero-3d.bundle.js</td></tr>
<tr><td>cache-first-asset</td><td>Cache-first</td><td>/assets/fonts/, /assets/vendor/</td></tr>
<tr><td>cache-first-image</td><td>Cache-first + LRU trim</td><td>Most /assets/images/</td></tr>
<tr><td>swr-image</td><td>Stale-while-revalidate</td><td>n-slider, lake-story-assets, products/</td></tr>
<tr><td>swr-asset</td><td>Stale-while-revalidate</td><td>site.js, i18n, assistant, manifest</td></tr>
</tbody></table>

<h3>9.5 pwa.js Behaviour</h3>
<ul>
<li>Registers SW on window load</li>
<li>Resolves sw.js URL relative to pwa.js (subpath-safe)</li>
<li>Update toast: navy background, gold border, "Refresh" triggers SKIP_WAITING</li>
<li>controllerchange reload only if user clicked Refresh (no surprise reloads)</li>
<li>Silently no-ops on file:// or unsupported browsers</li>
</ul>
</section>
""")

    # Section 10 i18n
    parts.append("""
<section id="sec-10" class="chapter page-break">
<h2>10. Internationalization (i18n)</h2>

<h3>10.1 Supported Languages</h3>
<p>English (en), French (fr), Swahili (sw). Portuguese was removed; SW replaced PT in the language switcher.</p>

<h3>10.2 Pipeline</h3>
<pre class="diagram">HTML pages (data-i18n attributes)
        │
        ▼
scripts/i18n_extract.py  →  discovers keys / orphans
        │
        ▼
scripts/build_master_en.py  →  scripts/_master_en.json (English master)
        │
        ▼
scripts/translation_dict.py  →  PHRASES_FR, PHRASES_SW, TERMS_*
        │
        ▼
scripts/build_i18n_content.py  →  assets/i18n-content.json
                               →  assets/i18n-content.js (runtime)
        │
        ▼
assets/i18n.js  →  applies to DOM on load + language switch</pre>

<h3>10.3 Rebuild Commands</h3>
<pre class="code-block">python3 scripts/build_master_en.py
python3 scripts/build_i18n_content.py</pre>

<h3>10.4 Coverage Notes</h3>
<ul>
<li>~1,442 translation keys across the site</li>
<li>Full coverage: nav, footer, chat/assistant, homepage hero</li>
<li>Partial coverage: long-tail page content falls back to English DOM text gracefully</li>
<li>hero-3d.js reads LakeI18n.current for SITE_NAMES country labels</li>
</ul>

<h3>10.5 QA</h3>
<p><code>scripts/_qa_check_i18n.js</code> — validates key coverage. <code>scripts/build_sw_lang.js</code> — language-specific SW precache variants.</p>
</section>
""")

    # Section 11 Assistant
    parts.append("""
<section id="sec-11" class="chapter page-break">
<h2>11. Knowledge Assistant System</h2>

<h3>11.1 Architecture</h3>
<pre class="diagram">scripts/build_assistant_kb.js
    ├── reads assets/i18n-content.json (page chunks)
    ├── merges CURATED_FACTS from _verified_lake_facts.md
    └── writes assets/assistant-kb.js

assets/assistant.js
    ├── FlexSearch index per language (en/fr/sw)
    ├── IndexedDB persistence (lake-assistant/messages)
    ├── Retrieves verbatim passages — never generates text
    └── "Read more →" links to source page</pre>

<h3>11.2 Document Shape</h3>
<p>Each KB document: <code>{ id, t, s, u, k, f }</code> — title, text, url, keywords, fact-boost flag.</p>

<h3>11.3 Chunking</h3>
<p>MIN_LEN=30 chars, CHUNK_TARGET=340 chars. Keys grouped by page prefix (fuel.*, about.*, etc.).</p>

<h3>11.4 Rebuild</h3>
<pre class="code-block">node scripts/build_assistant_kb.js</pre>
<p>Run after i18n content changes or curated fact updates.</p>

<h3>11.5 Interaction with site.js</h3>
<p><code>window.__LAKE_ASSISTANT_ACTIVE__ = true</code> set at assistant.js parse time prevents legacy initChat() from binding duplicate handlers.</p>
</section>
""")

    # Section 12 News
    parts.append("""
<section id="sec-12" class="chapter page-break">
<h2>12. News System</h2>

<h3>12.1 Data Model (news-data.js)</h3>
<p><code>window.LAKE_NEWS</code> — array of articles:</p>
<pre class="code-block">{
  id: number,
  title: string,
  date: string,
  category: string,      // e.g. "Expansion", "CSR", "Events"
  bannerImage: string,
  description: string[], // paragraphs
  images: string[],      // gallery paths
  video: string|null     // YouTube URL
}</pre>

<h3>12.2 news.html</h3>
<ul>
<li>Renders #news-list via renderNewsList()</li>
<li>Filters: #news-search (text), #news-category, #news-country</li>
<li>Country detection via keyword heuristics in articleCountries()</li>
<li>Re-inits reveal animations after filter</li>
</ul>

<h3>12.3 news-article.html</h3>
<ul>
<li>Reads ?id= or ?newsid= query param</li>
<li>Renders full article with image grid and optional YouTube iframe</li>
<li>Updates document title and meta description dynamically</li>
<li>Injects NewsArticle JSON-LD</li>
</ul>

<h3>12.4 Images</h3>
<p>Stored under <code>assets/images/news/{id}/photo_*.jpg</code>. SW uses network-first for news-data.js.</p>
</section>
""")

    # Section 13 Africa map
    parts.append("""
<section id="sec-13" class="chapter page-break">
<h2>13. Africa Network Map (Leaflet)</h2>

<h3>13.1 Dependencies</h3>
<p>Loaded synchronously (before deferred stack) on africa-network.html:</p>
<ol>
<li>leaflet.css + leaflet.js</li>
<li>data_countries_africa.js → window.__LAKE_AFRICA_GEOJSON__</li>
<li>africa-network-map.js</li>
</ol>

<h3>13.2 Tile Layers</h3>
<ul>
<li><strong>Hybrid (default):</strong> Esri World Imagery + Transportation + Boundaries overlays</li>
<li>Satellite Imagery, Terrain (OpenTopoMap), Streets (OSM)</li>
</ul>

<h3>13.3 Data Layers</h3>
<ul>
<li><strong>countryLayer:</strong> GeoJSON fills for 8 ops countries + neighbours</li>
<li><strong>assetLayer:</strong> 22 circle markers by type (hq, fuel, port, container, industrial, logistics)</li>
<li><strong>pipelineLayer:</strong> TAZAMA pipeline, Northern corridor, Southern route polylines</li>
</ul>

<h3>13.4 Public API</h3>
<pre class="code-block">window.LakeAfricaMap = {
  flyToCountry(id, cardEl),
  filterAssets(type),  // 'all' | 'hq' | 'fuel' | ...
  resetView()
};
window.selectCountry(id, card)  // called from country cards</pre>

<h3>13.5 Offline / file://</h3>
<p>GeoJSON via script tag (not fetch). Tiles require network. Fallback: coloured circles if GeoJSON missing.</p>
</section>
""")

    # Section 14 Scripts
    scripts_table = """
<table class="data-table">
<thead><tr><th>Script</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td>build_i18n_content.py</td><td>Generate i18n-content.json + .js from master + translations</td></tr>
<tr><td>build_master_en.py</td><td>Extract English strings into _master_en.json</td></tr>
<tr><td>translation_dict.py</td><td>FR/SW phrase and term dictionaries</td></tr>
<tr><td>i18n_extract.py</td><td>Scan HTML for data-i18n keys and orphans</td></tr>
<tr><td>normalize_nav.py</td><td>Inject templates into all HTML pages</td></tr>
<tr><td>build_assistant_kb.js</td><td>Generate assistant-kb.js knowledge base</td></tr>
<tr><td>build_hero_bundle.sh</td><td>esbuild hero-3d.js → hero-3d.bundle.js</td></tr>
<tr><td>build_sw_lang.js</td><td>Language-variant service worker assets</td></tr>
<tr><td>add_pwa_tags.js</td><td>Inject manifest/theme-color links</td></tr>
<tr><td>add_seo_tags.js</td><td>Inject OG, canonical, description tags</td></tr>
<tr><td>add_theme_motion_tags.js</td><td>Inject CSS/JS link tags</td></tr>
<tr><td>add_assistant_tags.js</td><td>Inject assistant script/css tags</td></tr>
<tr><td>self_host_fonts.py</td><td>Download and wire self-hosted font files</td></tr>
<tr><td>inline_material_icons.py</td><td>Inline Material Symbols SVGs</td></tr>
<tr><td>perf_pass.js</td><td>Performance audit pass on pages</td></tr>
<tr><td>_qa_check_links.js</td><td>Broken link checker</td></tr>
<tr><td>_qa_check_i18n.js</td><td>i18n coverage QA</td></tr>
<tr><td>_qa_matrix.js</td><td>Cross-page QA matrix</td></tr>
<tr><td>_qa_overflow_check.js</td><td>Horizontal overflow detection</td></tr>
<tr><td>_globe_qa.js / _globe_qa2.js</td><td>3D hero automated QA</td></tr>
<tr><td>_assistant_qa.js</td><td>Assistant retrieval QA</td></tr>
<tr><td>generate_dev_pdf.sh</td><td>PDF generation helper for docs</td></tr>
</tbody></table>
"""
    parts.append(f'<section id="sec-14" class="chapter page-break"><h2>14. Build &amp; Maintenance Scripts</h2>{scripts_table}</section>')

    # Section 15 SEO
    parts.append("""
<section id="sec-15" class="chapter page-break">
<h2>15. SEO &amp; Structured Data</h2>

<h3>15.1 robots.txt</h3>
<pre class="code-block">User-agent: *
Allow: /
Disallow: /offline.html
Disallow: /dashboard.html

Sitemap: https://www.lakeoilgroup.com/sitemap.xml</pre>

<h3>15.2 sitemap.xml</h3>
<p>Lists all public pages at lakeoilgroup.com. Priority 1.0 for homepage, 0.8 for news, 0.7 for content pages. lastmod: 2026-07-04.</p>
<p>Excluded: offline.html, dashboard.html, 404.html, our-story.html (not in sitemap).</p>

<h3>15.3 JSON-LD Types by Page</h3>
<table class="data-table">
<thead><tr><th>@type</th><th>Pages</th></tr></thead>
<tbody>
<tr><td>Organization</td><td>index.html</td></tr>
<tr><td>WebPage</td><td>Most content pages</td></tr>
<tr><td>NewsArticle</td><td>news-article.html (dynamic)</td></tr>
<tr><td>BreadcrumbList</td><td>Service/company pages</td></tr>
</tbody></table>

<h3>15.4 Open Graph</h3>
<p>og:title, og:description, og:image (assets/images/og-cover.jpg), og:type=website on all major pages. twitter:card=summary_large_image.</p>

<h3>15.5 Canonical URLs</h3>
<p>Each page includes &lt;link rel="canonical" href="https://www.lakeoilgroup.com/{page}.html"&gt; — added/maintained by add_seo_tags.js.</p>
</section>
""")

    # Section 16 Deployment
    parts.append("""
<section id="sec-16" class="chapter page-break">
<h2>16. Deployment Checklist</h2>

<h3>16.1 Pre-Deploy</h3>
<ol>
<li>Run i18n pipeline if copy changed: <code>build_master_en.py</code> → <code>build_i18n_content.py</code></li>
<li>Run <code>node scripts/build_assistant_kb.js</code> if content/facts changed</li>
<li>Run <code>bash scripts/build_hero_bundle.sh</code> if hero-3d.js changed</li>
<li>Run <code>python3 scripts/normalize_nav.py</code> if templates changed</li>
<li>Bump <code>VERSION</code> in sw.js if any precached asset changed</li>
<li>Bump <code>?v=N</code> on hero-3d.bundle.js script in index.html if bundle changed</li>
<li>Update sitemap.xml lastmod dates for changed pages</li>
<li>Run QA: <code>node scripts/_qa_check_links.js</code>, <code>_qa_check_i18n.js</code></li>
</ol>

<h3>16.2 Local Testing</h3>
<pre class="code-block">npm install          # firebase-tools devDependency
npm run serve        # Firebase hosting emulator
# OR any static server:
python3 -m http.server 8080</pre>

<h3>16.3 Deploy</h3>
<pre class="code-block">npm run deploy       # firebase deploy --only hosting</pre>
<p>Requires Firebase project configuration (firebase.json + .firebaserc — configure locally, not committed).</p>

<h3>16.4 Post-Deploy Verification</h3>
<ul>
<li>Hard-refresh homepage — verify 3D hero loads after scroll</li>
<li>Switch EN/FR/SW — verify nav and hero translate</li>
<li>Open assistant — query "fuel stations Tanzania"</li>
<li>DevTools → Application → Service Workers — confirm new VERSION active</li>
<li>Test offline: load site, go offline, navigate to about.html</li>
<li>Validate structured data: Google Rich Results Test</li>
<li>Check africa-network.html map tiles load</li>
</ul>
</section>
""")

    # Section 17 Accessibility
    parts.append("""
<section id="sec-17" class="chapter page-break">
<h2>17. Accessibility</h2>

<h3>17.1 Reduced Motion</h3>
<ul>
<li><code>prefers-reduced-motion: reduce</code> — motion.js/flagship-motion.js skip html.lg-motion/fs-motion; all .reveal/.fx visible immediately</li>
<li>hero-3d.js — static finale overlay instead of WebGL animation</li>
<li>CSS transitions disabled under reduced motion media query in both design systems</li>
</ul>

<h3>17.2 Semantic HTML</h3>
<ul>
<li>&lt;nav&gt;, &lt;main&gt;, &lt;footer&gt;, &lt;article&gt; landmarks</li>
<li>Heading hierarchy h1 → h2 → h3 per page</li>
<li>Alt text on images; data-i18n-alt for translated alts</li>
</ul>

<h3>17.3 Keyboard &amp; ARIA</h3>
<ul>
<li>Nav toggle: aria-label="Menu"</li>
<li>Language switcher: aria-label="Language"</li>
<li>Assistant: aria-label on open/close, role="status" on PWA toast</li>
<li>Chat input: data-i18n-aria for translated aria-label</li>
<li>our-story.html: Space/→ keyboard navigation</li>
</ul>

<h3>17.4 Colour Contrast</h3>
<p>Flagship system uses --gold-deep (#C79B00) for WCAG-safe gold on light surfaces. Ink bands use --ink-text at 78% opacity minimum.</p>

<h3>17.5 Focus Management</h3>
<p>Buttons and links have visible focus styles in flagship.css. Assistant panel traps focus when open on mobile sheet layout.</p>
</section>
""")

    # Section 18 Appendices
    parts.append("""
<section id="sec-18" class="chapter page-break">
<h2>18. Appendices</h2>

<h3>18.1 Brand Colour Reference</h3>
<table class="data-table">
<thead><tr><th>Name</th><th>Hex</th><th>Usage</th></tr></thead>
<tbody>
<tr><td>Navy</td><td>#0E1F5A</td><td>Headers, text, PWA toast, ink-adjacent</td></tr>
<tr><td>Blue</td><td>#1D3EA8</td><td>Primary brand, theme-color</td></tr>
<tr><td>Gold</td><td>#FFD700</td><td>Accents, CTAs, meridian ticks</td></tr>
<tr><td>Red</td><td>#CC1E1E</td><td>Fuel markers, alerts</td></tr>
<tr><td>Ink</td><td>#070C1E</td><td>Flagship dark bands</td></tr>
<tr><td>Paper</td><td>#F6F5F1</td><td>Flagship light sections</td></tr>
</tbody></table>

<h3>18.2 Contact &amp; HQ (Verified)</h3>
<p>Plot 49, Mikocheni Light Industrial Area, Dar es Salaam, Tanzania<br>
Tel: +255 222 780 510 · Email: admin@lakeoilgroup.com</p>

<h3>18.3 Related Documentation</h3>
<ul>
<li>README.md — file:// fixes, lake-3d status, i18n overview</li>
<li>FLAGSHIP_DESIGN.md — Meridian migration guide</li>
<li>scripts/_verified_lake_facts.md — source of truth for 3D sites and assistant facts</li>
<li>QA_REPORT.md — latest QA findings</li>
</ul>

<h3>18.4 Glossary</h3>
<dl class="glossary">
<dt>MPA</dt><dd>Multi-Page Application — each URL is a separate HTML file</dd>
<dt>Meridian</dt><dd>Flagship design system (flagship.css + flagship-motion.js)</dd>
<dt>OSE</dt><dd>Our Story Experience — cinematic slideshow in our-story.html</dd>
<dt>SWR</dt><dd>Stale-While-Revalidate — cache strategy serving cached then updating</dd>
<dt>KB</dt><dd>Knowledge Base — assistant-kb.js retrieval documents</dd>
</dl>
</section>
""")

    return parts


CSS = """
@page { margin: 2cm 2.2cm; size: A4; }
@media print {
  .page-break { page-break-before: always; }
  .cover { page-break-after: always; }
  a { color: #0E1F5A; text-decoration: none; }
  pre, table { page-break-inside: avoid; }
}
* { box-sizing: border-box; }
html { font-size: 11pt; }
body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.65;
  color: #1a2340;
  max-width: 210mm;
  margin: 0 auto;
  padding: 24px 32px 80px;
  background: #fff;
}
.cover {
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: linear-gradient(160deg, #0E1F5A 0%, #1D3EA8 55%, #0E1F5A 100%);
  color: #fff;
  margin: -24px -32px 48px;
  padding: 80px 40px;
}
.cover-inner { max-width: 600px; }
.cover-eyebrow { color: #FFD700; letter-spacing: 0.2em; text-transform: uppercase; font-size: 0.75rem; margin-bottom: 24px; }
.cover-title { font-size: 2.8rem; line-height: 1.15; margin: 0 0 20px; font-weight: 800; }
.cover-sub { font-size: 1.15rem; opacity: 0.9; margin-bottom: 32px; }
.cover-meta, .cover-stats { font-size: 0.9rem; opacity: 0.75; }
h2 { color: #0E1F5A; font-size: 1.65rem; border-bottom: 3px solid #FFD700; padding-bottom: 8px; margin-top: 2.5em; }
h3 { color: #0E1F5A; font-size: 1.2rem; margin-top: 1.8em; }
h4 { color: #1D3EA8; font-size: 1rem; margin-top: 1.2em; }
.lede { font-size: 1.05rem; color: #3a4560; }
.toc-list { list-style: none; padding: 0; columns: 2; column-gap: 40px; }
.toc-list li { margin: 8px 0; break-inside: avoid; }
.toc-list a { color: #0E1F5A; text-decoration: none; }
.toc-num { color: #FFD700; font-weight: 700; margin-right: 6px; }
code, pre { font-family: 'SF Mono', 'Consolas', 'Liberation Mono', monospace; font-size: 0.88em; }
pre, .code-block, .diagram, .file-tree {
  background: #f4f6fb;
  border: 1px solid #d8deec;
  border-left: 4px solid #FFD700;
  padding: 14px 18px;
  overflow-x: auto;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
table.data-table { width: 100%; border-collapse: collapse; margin: 1.2em 0; font-size: 0.92rem; }
table.data-table th { background: #0E1F5A; color: #fff; text-align: left; padding: 10px 12px; }
table.data-table td { border: 1px solid #dde3f0; padding: 8px 12px; vertical-align: top; }
table.data-table tr:nth-child(even) td { background: #f8f9fd; }
.page-ref, .js-ref { margin: 2em 0; padding: 1.2em 0; border-top: 1px solid #e8ecf4; }
.page-ref h3 { margin-top: 0; color: #1D3EA8; }
ul, ol { margin: 0.6em 0 1em; }
li { margin: 0.35em 0; }
.glossary dt { font-weight: 700; color: #0E1F5A; margin-top: 12px; }
.glossary dd { margin: 4px 0 0 0; color: #4a5568; }
.chapter { margin-bottom: 3em; }
"""


def build_extended_content(meta):
    """Additional deep-dive sections targeting 80+ printed pages."""
    parts = []

    # --- Hero 3D deep dive ---
    parts.append("""
<section id="sec-8b" class="chapter page-break">
<h2>8A. hero-3d.js — Implementation Deep Dive</h2>

<h3>8A.1 Entry Point and Boot Sequence</h3>
<p>The bundled script exposes no exports. On load it calls <code>boot()</code> which:</p>
<ol>
<li>Locates <code>#experience-3d-panel</code> inside <code>#fuel-experience</code></li>
<li>Checks <code>prefers-reduced-motion</code> — if set, adds <code>show-finale show-finale-full</code> classes and returns</li>
<li>Calls <code>initHero3D(mount)</code> inside try/catch; on failure shows <code>.experience-3d-error</code></li>
<li>Sets <code>mount.classList.add('is-ready')</code> when WebGL context is live</li>
</ol>

<h3>8A.2 Coordinate System</h3>
<p>The globe uses a unit sphere of radius <code>GLOBE_R = 3.4</code>. Lat/lon conversion via <code>latLonTo(lat, lon, r, out)</code>:</p>
<pre class="code-block">phi = degToRad(90 - lat)      // colatitude from north pole
theta = degToRad(lon) - GLOBE_CENTER_LON   // GLOBE_CENTER_LON = 30°E
x = r * sin(phi) * sin(theta)
y = r * cos(phi)
z = r * sin(phi) * cos(theta)</pre>
<p>All markers, arcs, and callout leader lines are positioned in this space then parented to the <code>globe</code> Group so they rotate with the planet during Chapter 1.</p>

<h3>8A.3 Renderer Configuration</h3>
<table class="data-table">
<thead><tr><th>Setting</th><th>High Quality</th><th>Low Quality (isLow)</th></tr></thead>
<tbody>
<tr><td>antialias</td><td>true</td><td>false</td></tr>
<tr><td>pixelRatio</td><td>min(DPR, 1.5)</td><td>min(DPR, 1)</td></tr>
<tr><td>Earth segments</td><td>72×48</td><td>48×32</td></tr>
<tr><td>Normal map</td><td>loaded</td><td>skipped</td></tr>
<tr><td>Star count</td><td>650 + 160</td><td>350 + 80</td></tr>
<tr><td>toneMapping</td><td>ACESFilmicToneMapping</td><td>same</td></tr>
<tr><td>toneMappingExposure</td><td>1.15 (modulated by loop fade)</td><td>same</td></tr>
</tbody></table>

<h3>8A.4 Route Arcs</h3>
<p>Great-circle arcs connect Dar es Salaam HQ (index 0) to each remote site. Each arc is a <code>THREE.Mesh</code> with <code>TubeGeometry</code> along a quadratic Bezier curve elevated above the surface. Arc visibility uses <code>setDrawRange()</code> to animate drawing — only the portion corresponding to chapter progress renders, creating the "ignite outward" effect in Chapter 2.</p>
<p>Arc timing is staggered: Dubai (ae) lands last as the most distant connection. Hub ring at HQ pulses with sinusoidal scale during hub ignition phase (<code>HUB_ON_START</code> to <code>HUB_ON_END</code>).</p>

<h3>8A.5 Label Sprites</h3>
<p>Each of 9 sites gets a <code>THREE.Sprite</code> with a canvas-generated texture:</p>
<ul>
<li>Supersampled at 3× for crisp text on retina displays</li>
<li>Dark plate with gold stroke for HQ, blue-grey for subsidiaries</li>
<li><code>anchor</code> property per site fans labels in screen space to prevent overlap in dense East Africa cluster</li>
<li>Opacity driven by chapter progress; dimmed during Chapter 3 except hovered marker and HQ</li>
<li>Re-localized country names via <code>SITE_NAMES[lang]</code> when <code>lake-i18n-applied</code> fires</li>
</ul>

<h3>8A.6 Facility Callouts (Leader Lines)</h3>
<p>Four verified facilities use a three-part visual: surface anchor dot, quadratic leader line in 3D, and title sprite offset by <code>off: [east, north, up]</code> in surface-tangent space. Each callout fades in during Chapter 3 (<code>fadeStart</code> staggered) and fades out before loop reset.</p>

<h3>8A.7 Camera Rig</h3>
<p><code>CAM_KEYS</code> array defines (azimuth, elevation, distance×R, fov) at progress keyframes. <code>sampleCamera(gp, out)</code> finds the surrounding keyframe pair and smoothsteps between them. Mouse parallax adds ±6% of camera distance on pointer move (desktop only).</p>

<h3>8A.8 Loop Timing Mathematics</h3>
<pre class="code-block">LOOP_DURATION = 34 seconds   // active animation
LOOP_PAUSE = 5 seconds       // hold on finale
Total cycle = 39 seconds

gp = min(1, cycleT / LOOP_DURATION)   // progress 0..1

Chapter 1: gp in [0, 0.30]
Chapter 2: gp in [0.30, 0.65]
Chapter 3: gp in [0.65, 0.90]
Chapter 4: gp in [0.90, 1.00]

Fade at seam: getLoopFade() combines fadeOut(last 0.9s) and fadeIn(first 0.8s)</pre>

<h3>8A.9 Memory Management</h3>
<p><code>initHero3D</code> returns a teardown function that: cancels rAF, removes event listeners, disconnects ResizeObserver and IntersectionObserver, traverses scene disposing geometries/materials/textures, and calls <code>renderer.dispose()</code>. The bundle does not currently invoke teardown on SPA navigation (not applicable — full page loads).</p>

<h3>8A.10 Editing Workflow</h3>
<ol>
<li>Edit <code>assets/hero-3d.js</code> (ES module with import)</li>
<li>Run <code>bash scripts/build_hero_bundle.sh</code> (requires esbuild)</li>
<li>Bump <code>?v=N</code> query on index.html script injector</li>
<li>Bump <code>VERSION</code> in sw.js (network-first but version bump clears confusion)</li>
<li>Run <code>node scripts/_globe_qa2.js</code> for automated frame capture QA</li>
</ol>
</section>
""")

    # --- Flagship component catalog ---
    parts.append("""
<section id="sec-7b" class="chapter page-break">
<h2>7A. Meridian Component Catalog</h2>
<p>Complete reference for flagship.css components. Never apply to <code>#fuel-experience</code> or <code>.experience-3d-*</code>.</p>

<h3>7A.1 Typography Classes</h3>
<table class="data-table">
<thead><tr><th>Class</th><th>Font</th><th>Usage</th></tr></thead>
<tbody>
<tr><td>.fs-hero-title</td><td>Bebas Neue</td><td>Page hero headlines, clamp 4–9.5rem</td></tr>
<tr><td>.fs-display</td><td>Bebas Neue</td><td>Section display headings</td></tr>
<tr><td>.fs-eyebrow</td><td>Inter 600</td><td>Tracked uppercase label with meridian tick</td></tr>
<tr><td>.fs-lede</td><td>Inter</td><td>Intro paragraph, larger size</td></tr>
<tr><td>.fs-serif-quote</td><td>Playfair italic</td><td>Pull quotes</td></tr>
<tr><td>.fs-outline / .fs-outline-gold</td><td>Bebas</td><td>Stroke-outlined display text</td></tr>
<tr><td>.section-title</td><td>Bebas (restyled)</td><td>Legacy class, mapped to flagship</td></tr>
</tbody></table>

<h3>7A.2 Layout Primitives</h3>
<table class="data-table">
<thead><tr><th>Class</th><th>Behaviour</th></tr></thead>
<tbody>
<tr><td>.fs-section / .section</td><td>Vertical padding using --sp-* scale (96px default)</td></tr>
<tr><td>.fs-on-dark / .section-dark</td><td>Ink background band with light text tokens</td></tr>
<tr><td>.fs-split</td><td>5fr/7fr two-column, reverses at 880px</td></tr>
<tr><td>.fs-split-even</td><td>1fr/1fr equal split</td></tr>
<tr><td>.grid-2/3/4</td><td>Responsive grids, collapse at 720px</td></tr>
<tr><td>.fs-stat-rail</td><td>Horizontal KPI strip with meridian baselines</td></tr>
</tbody></table>

<h3>7A.3 Interactive Components</h3>
<table class="data-table">
<thead><tr><th>Class</th><th>States</th></tr></thead>
<tbody>
<tr><td>.btn-primary</td><td>Gold fill, notched corner, magnetic hover via flagship-motion.js</td></tr>
<tr><td>.btn-blue</td><td>Brand blue fill</td></tr>
<tr><td>.btn-outline / .btn-ghost</td><td>For use on dark (.fs-on-dark) backgrounds</td></tr>
<tr><td>.btn-outline-dark</td><td>For use on light backgrounds</td></tr>
<tr><td>.tab-nav / .tab-pane</td><td>Tab switching via site.js initTabs()</td></tr>
<tr><td>.badge / .badge-amber</td><td>Category pills (news, tags)</td></tr>
</tbody></table>

<h3>7A.4 Motion Classes (flagship-motion.js)</h3>
<table class="data-table">
<thead><tr><th>Class</th><th>Entrance</th></tr></thead>
<tbody>
<tr><td>.fx.fx-rise</td><td>Translate Y + fade</td></tr>
<tr><td>.fx.fx-scale</td><td>Scale from 0.92 + fade</td></tr>
<tr><td>.fx.fx-left / .fx-right</td><td>Horizontal slide + fade</td></tr>
<tr><td>.fx.fx-clip</td><td>Clip-path reveal (images, media)</td></tr>
<tr><td>.fx.fx-mask</td><td>Mask wipe for headlines</td></tr>
<tr><td>.fx.fx-wipe</td><td>Horizontal rule wipe for eyebrows/dividers</td></tr>
<tr><td>.fx.in</td><td>Added by IntersectionObserver when visible</td></tr>
</tbody></table>
<p>Stagger via <code>--fx-d</code> custom property (seconds). Scroll-linked emphasis via <code>data-fx-scroll</code> → <code>--fxp</code> (0 to 1).</p>

<h3>7A.5 theme.css Legacy Equivalents</h3>
<table class="data-table">
<thead><tr><th>Legacy (theme)</th><th>Meridian (flagship)</th></tr></thead>
<tbody>
<tr><td>.reveal / .reveal.visible</td><td>.fx / .fx.in</td></tr>
<tr><td>.section-dark</td><td>.fs-on-dark</td></tr>
<tr><td>.divider-yellow</td><td>.fs-rule</td></tr>
<tr><td>.hero-stat</td><td>.fs-stat</td></tr>
<tr><td>--yellow</td><td>--gold</td></tr>
<tr><td>--radius 4px</td><td>--radius 0</td></tr>
</tbody></table>
</section>
""")

    # --- Assistant API reference ---
    parts.append("""
<section id="sec-11b" class="chapter page-break">
<h2>11A. Assistant — Function Reference</h2>
<table class="data-table">
<thead><tr><th>Function</th><th>Description</th></tr></thead>
<tbody>
<tr><td>t(key)</td><td>Resolve assistant.* i18n key with English fallback</td></tr>
<tr><td>lang()</td><td>Current language: en, fr, or sw</td></tr>
<tr><td>getIndex(l)</td><td>Lazy-build FlexSearch index for language l</td></tr>
<tr><td>search(query, l)</td><td>Return ranked document IDs for query</td></tr>
<tr><td>respond(query)</td><td>Format top hit as bot message with read-more link</td></tr>
<tr><td>buildUI(mount)</td><td>Replace #chat-widget inner DOM with assistant panel</td></tr>
<tr><td>storage.load/add/clear</td><td>IndexedDB messages with in-memory fallback</td></tr>
<tr><td>openPanel/closePanel</td><td>Toggle .assistant-open on panel + body scroll lock</td></tr>
</tbody></table>

<h3>11A.1 Search Algorithm</h3>
<ol>
<li>Strip stopwords (the, a, is, …) from query</li>
<li>Search FlexSearch index with tokenized query</li>
<li>Boost documents with <code>f:1</code> (curated facts)</li>
<li>Prefer longer token matches over substring noise</li>
<li>Return top 3 hits; format first as answer with source URL</li>
</ol>

<h3>11A.2 Curated Facts Categories</h3>
<p>build_assistant_kb.js embeds hand-written facts for: company stats, HQ address, phone, email, country list, subsidiary names, fleet size, station count, steel capacity, LPG cylinder sizes, founding year, founder name. All sourced from scripts/_verified_lake_facts.md.</p>

<h3>11A.3 Offline Behaviour</h3>
<p>On 404.html and offline.html, assistant works without i18n-content.js — uses English FALLBACK dict. KB and FlexSearch still load from precache. IndexedDB persists conversation across sessions when available.</p>
</section>
""")

    # --- Troubleshooting ---
    parts.append("""
<section id="sec-19" class="chapter page-break">
<h2>19. Troubleshooting Guide</h2>

<h3>19.1 Translations Not Switching</h3>
<p><strong>Symptom:</strong> Clicking FR/SW does nothing.</p>
<p><strong>Causes:</strong></p>
<ul>
<li><code>i18n-content.js</code> not loaded or loaded after <code>i18n.js</code></li>
<li>Under file:// with old build that used fetch() — rebuild i18n-content.js</li>
<li>Missing <code>data-i18n</code> attribute on element (key not in dictionary shows English fallback — looks like "not working")</li>
</ul>
<p><strong>Fix:</strong> Verify script order in &lt;body&gt;. Check console for "LAKE_I18N_CONTENT__ is not defined". Run <code>node scripts/_qa_check_i18n.js</code>.</p>

<h3>19.2 3D Hero Black Box</h3>
<p><strong>Symptom:</strong> Empty or black #fuel-experience section.</p>
<p><strong>Causes:</strong></p>
<ul>
<li>hero-3d.bundle.js not built or 404</li>
<li>WebGL unsupported or disabled</li>
<li>JavaScript error in bundle — check console</li>
<li>Lazy load IO never triggered — scroll to section</li>
</ul>
<p><strong>Fix:</strong> Rebuild bundle. Hard-refresh. Check Network tab for bundle load. Under reduced motion, static finale is expected.</p>

<h3>19.3 Service Worker Serving Stale Content</h3>
<p><strong>Symptom:</strong> Deployed changes not visible.</p>
<p><strong>Fix:</strong> Bump VERSION in sw.js. User must accept update toast or hard-refresh twice. news-data.js and hero-3d.bundle.js use network-first specifically to avoid this.</p>

<h3>19.4 Africa Map Shows Circles Not Borders</h3>
<p><strong>Cause:</strong> data_countries_africa.js not loaded before africa-network-map.js, or __LAKE_AFRICA_GEOJSON__ undefined.</p>
<p><strong>Fix:</strong> Verify script order. Check console for GeoJSON error.</p>

<h3>19.5 Assistant Returns "Couldn't Find That" for Known Facts</h3>
<p><strong>Fix:</strong> Rebuild KB: <code>node scripts/build_assistant_kb.js</code>. Ensure i18n keys exist for the content. Try exact terms: "Lake Oil", "Tanzania", "LPG", "contact".</p>

<h3>19.6 Nav Active Link Wrong</h3>
<p><strong>Cause:</strong> Previously substring-matched hrefs. Fixed in site.js to compare exact filenames.</p>
<p><strong>Fix:</strong> Ensure href="fuel.html" not href="/fuel" without extension if comparing logic expects filename.</p>
</section>
""")

    # --- Firebase hosting ---
    parts.append("""
<section id="sec-20" class="chapter page-break">
<h2>20. Firebase Hosting Configuration</h2>
<p>package.json defines:</p>
<pre class="code-block">{
  "scripts": {
    "serve": "npx firebase emulators:start --only hosting",
    "deploy": "npx firebase deploy --only hosting"
  },
  "devDependencies": {
    "firebase-tools": "^13.35.1"
  }
}</pre>
<p>A typical <code>firebase.json</code> (create locally) serves the repo root as public directory:</p>
<pre class="code-block">{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**", "lake-3d/**", "scripts/_chrome_profile*/**"],
    "headers": [
      {
        "source": "/sw.js",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [{ "key": "Cache-Control", "value": "public,max-age=3600" }]
      }
    ],
    "rewrites": [
      { "source": "/", "destination": "/index.html" }
    ]
  }
}</pre>
<p><strong>Important:</strong> sw.js must be served with no-cache or short TTL so updates propagate. Production domain: www.lakeoilgroup.com.</p>
</section>
""")

    # --- Image assets ---
    parts.append("""
<section id="sec-21" class="chapter page-break">
<h2>21. Image Asset Conventions</h2>
<table class="data-table">
<thead><tr><th>Directory</th><th>Contents</th><th>SW Strategy</th></tr></thead>
<tbody>
<tr><td>assets/images/banner/</td><td>Division hero banners (LakeOil, LakeGas, etc.)</td><td>cache-first</td></tr>
<tr><td>assets/images/news/{id}/</td><td>News article photos</td><td>cache-first</td></tr>
<tr><td>assets/images/n-slider/</td><td>Homepage news slider</td><td>stale-while-revalidate</td></tr>
<tr><td>assets/images/planet/</td><td>Earth textures for 3D hero</td><td>cache-first</td></tr>
<tr><td>assets/images/leadership/</td><td>Executive photos, events</td><td>cache-first</td></tr>
<tr><td>assets/images/flags/</td><td>Country SVG flags (8 ops countries)</td><td>cache-first</td></tr>
<tr><td>lake-story-assets/</td><td>our-story.html slideshow scenes</td><td>stale-while-revalidate</td></tr>
<tr><td>assets/images/og-cover.jpg</td><td>Default Open Graph image</td><td>cache-first</td></tr>
</tbody></table>
<p>Use descriptive alt text. Add data-i18n-alt for translated descriptions. Prefer JPEG for photos, PNG for logos with transparency, SVG for icons and flags.</p>
</section>
""")

    # --- i18n key conventions ---
    parts.append("""
<section id="sec-22" class="chapter page-break">
<h2>22. i18n Key Naming Conventions</h2>
<table class="data-table">
<thead><tr><th>Prefix</th><th>Scope</th><th>Example</th></tr></thead>
<tbody>
<tr><td>nav.*</td><td>Navigation labels</td><td>nav.home, nav.fuel, nav.dd.energy</td></tr>
<tr><td>mob.*</td><td>Mobile nav</td><td>mob.services</td></tr>
<tr><td>footer.*</td><td>Footer columns</td><td>footer.contact, footer.privacy</td></tr>
<tr><td>chat.*</td><td>Legacy chat + assistant UI</td><td>chat.placeholder, chat.reply.fuel</td></tr>
<tr><td>assistant.*</td><td>Knowledge assistant</td><td>assistant.greeting, assistant.nomatch</td></tr>
<tr><td>hero.*</td><td>Homepage hero</td><td>hero.title, hero.sub</td></tr>
<tr><td>fuel.*</td><td>fuel.html content</td><td>fuel.hero.title, fuel.spec.1</td></tr>
<tr><td>about.*</td><td>about.html content</td><td>about.story.p1</td></tr>
<tr><td>stat.*</td><td>Homepage statistics</td><td>stat.employees, stat.trucks</td></tr>
</tbody></table>
<p>Page prefix matches filename stem (underscore for hyphens: container_services.*). Numeric suffixes for list items. Keep keys stable — changing keys requires full rebuild.</p>
</section>
""")

    # Per-page extended narratives
    parts.append('<section id="sec-23" class="chapter"><h2>23. Extended Page Documentation</h2>')
    page_narratives = {
        "index.html": """
<p>The homepage is the most complex page in the site. It contains ~2900 lines including a large inline &lt;style&gt; block that duplicates and extends design tokens for first-paint performance before theme.css loads. The hero area above the fold uses a static background image with headline; the 3D experience is a separate full-viewport section lower on the page (#fuel-experience).</p>
<p>The 3D section includes a copy column (.experience-steps) with three bullet steps that sync to the globe chapters via syncSteps(). A DOM finale overlay (.experience-finale) shows the Lake Group logo and tagline when gp &gt; 0.88.</p>
<p>Division cards link to all 8 service verticals. Stats use data-count attributes animated by site.js. News teaser may link to news.html. Founder section includes portrait from assets/images/resource/ceo.jpg.</p>""",
        "fuel.html": """
<p>Primary product page for Lake Oil petroleum operations. Covers retail network (85+ stations), bulk supply, import infrastructure, and competitive positioning. Photography from assets/images/banner/LakeOil.jpg and operational photos. Tab components may separate retail vs bulk content — wired via site.js initTabs().</p>""",
        "africa-network.html": """
<p>Most JavaScript-heavy page after index. Requires live network for Esri/OSM tiles. Country cards call window.selectCountry(id, cardElement) which invokes LakeAfricaMap.flyToCountry(). Legend buttons filter asset types. GeoJSON borders highlight 8 operations countries in gold fill.</p>""",
        "investors.html": """
<p>Includes currency selector (#currency-select) wired by site.js initCurrency(). Elements with data-invest-usd hold USD base values converted to TZS/KES/ZMW on change. Financial figures should match verified facts document.</p>""",
        "gallery.html": """
<p>Masonry layout (.gallery-masonry) with lightbox (#lightbox). Click handlers on .photo-card open full-size image. motion.js skip zone includes #lightbox.</p>""",
        "our-story.html": """
<p>Cinematic slideshow not in main nav. Eight scenes from lake-story-assets/scene1-8.jpg. Auto-advance timer plus click/tap/Space/ArrowRight to advance. Full viewport .ose-stage. Can be embedded in about.html via #our-story-embed iframe.</p>""",
    }
    for fname in sorted(meta.keys()):
        m = meta[fname]
        narrative = page_narratives.get(fname, f"<p>Standard Meridian page for {esc(fname.replace('.html','').replace('-',' '))} content. See Section 5 for summary.</p>")
        parts.append(f"""
<article class="page-detail-expansion page-break">
<h3>23.{list(meta.keys()).index(fname)+1} {esc(fname)} — Full Developer Notes</h3>
{narrative}
<h4>Document Structure</h4>
<ul>
<li>Lines of HTML: <strong>{m['lines']}</strong></li>
<li>Title tag: {esc(m['title'])}</li>
<li>Meta description: {esc(m['desc'] or '(none)')}</li>
<li>Section IDs: {esc(', '.join(m['section_ids']) if m['section_ids'] else 'none')}</li>
<li>H2 headings: {esc(' | '.join(m['h2s'][:10]) if m['h2s'] else 'varies')}</li>
<li>JSON-LD types: {esc(', '.join(m['schema']) if m['schema'] else 'none')}</li>
<li>3D hero: {'yes' if m['hero3d'] else 'no'}</li>
</ul>
<h4>Asset Dependencies</h4>
<p>CSS: <code>{esc(', '.join(m['css']) if m['css'] else 'flagship.css, assistant.css')}</code></p>
<p>JS: <code>{esc(' → '.join(m['js']) if m['js'] else 'standard deferred stack')}</code></p>
<h4>Content Editing Workflow</h4>
<ol>
<li>Edit HTML content; add <code>data-i18n="pagekey.element"</code> to translatable nodes.</li>
<li>Run <code>python3 scripts/build_master_en.py</code> to extract new keys.</li>
<li>Add FR/SW translations in <code>scripts/translation_dict.py</code>.</li>
<li>Run <code>python3 scripts/build_i18n_content.py</code>.</li>
<li>Run <code>node scripts/build_assistant_kb.js</code> to update assistant.</li>
<li>Test language switch and assistant queries for changed content.</li>
</ol>
<h4>QA Checklist</h4>
<ul>
<li>□ Responsive at 375px, 768px, 1024px, 1440px</li>
<li>□ No horizontal overflow (node scripts/_qa_overflow_check.js)</li>
<li>□ All links valid</li>
<li>□ Motion respects prefers-reduced-motion</li>
<li>□ Images have alt text</li>
<li>□ Canonical URL correct</li>
<li>□ Page works offline after first visit (SW precache)</li>
</ul>
</article>
""")
    parts.append("</section>")

    # JS deep dives for each file
    parts.append('<section id="sec-24" class="chapter page-break"><h2>24. JavaScript — Extended Module Documentation</h2>')
    js_extended = {
        "site.js": """
<h4>initNav()</h4>
<p>Binds #nav-toggle click to toggle .open on #nav-mobile. Sets display:flex/none inline as fallback if CSS fails. Marks active links by comparing window.location.pathname filename to href filename (strips query/hash).</p>
<h4>initReveal()</h4>
<p>Immediately shows .reveal elements already in viewport. Creates IntersectionObserver with threshold 0.08 and rootMargin bottom -40px. Adds .visible class on intersect; unobserves after reveal.</p>
<h4>initCounters()</h4>
<p>Parses data-count (integer), data-prefix, data-suffix. Animates over 1600ms with ease-out cubic. Fallback: sets final value after 2500ms if observer never fired. Sets data-animated=1 to prevent re-run.</p>
<h4>initChat()</h4>
<p>Legacy keyword chat. Guarded by __LAKE_ASSISTANT_ACTIVE__. Uses word-boundary RegExp matching; prefers longest matching keyword. Replies via LakeI18n.t('chat.reply.'+key) with English fallbacks.</p>
<h4>initCurrency()</h4>
<p>investors.html only. Rates object: USD=1, TZS=2650, KES=153, ZMW=27.5. Formats billions/millions for USD display.</p>""",
        "i18n.js": """
<h4>Public API</h4>
<pre class="code-block">window.LakeI18n = {
  init(),           // bind lang buttons, apply stored lang
  apply(lang),      // switch language, persist, re-render
  t(key, lang?),    // lookup translation or null
  get current()     // 'en' | 'fr' | 'sw'
}</pre>
<h4>Events</h4>
<p>Dispatches <code>lake-i18n-applied</code> CustomEvent with detail.lang after each apply. hero-3d.js and assistant.js listen for this to refresh localized strings.</p>""",
        "sw.js": """
<p>Self-contained service worker — no imports. VERSION bump triggers cache purge on activate. trimCache() implements LRU-ish eviction on image cache (max 150). Auth query params never cached. Cross-origin requests pass through unhandled.</p>""",
        "news.js": """
<h4>getArticleId()</h4>
<p>Parses ?id= or ?newsid= from URL. Returns 0 if missing.</p>
<h4>renderArticle()</h4>
<p>Builds article DOM: header, banner img, description paragraphs, image grid, YouTube iframe if video URL present. Updates &lt;title&gt; and meta description. Injects NewsArticle schema.</p>
<h4>filterNews()</h4>
<p>Client-side filter on LAKE_NEWS array. Re-renders #news-list. Re-calls LakeSite.initReveal() for new cards.</p>""",
        "pwa.js": """
<p>IIFE, no exports. Resolves SW URL via new URL('../sw.js', document.currentScript.src). Toast is imperative DOM (not in template) for isolation from i18n. reloadingAfterUpdate flag prevents reload loops.</p>""",
    }
    for jsfile, content in js_extended.items():
        parts.append(f'<article class="js-ref page-break"><h3>24.x assets/{esc(jsfile)}</h3>{content}</article>')
    for fname, desc in JS_FILES.items():
        if fname not in js_extended:
            parts.append(f'<article class="js-ref"><h3>assets/{esc(fname)}</h3><p>{esc(desc)}</p><p>See Section 6 for summary. Source in repository assets/ directory.</p></article>')
    parts.append("</section>")

    # Workflow chapters
    parts.append("""
<section id="sec-25" class="chapter page-break">
<h2>25. Common Developer Workflows</h2>

<h3>25.1 Add a New Static Page</h3>
<ol>
<li>Copy about.html as template (flagship migrated)</li>
<li>Update title, meta, canonical, JSON-LD</li>
<li>Replace main content; add data-i18n keys</li>
<li>Add to scripts/templates/nav.html if needed</li>
<li>Run normalize_nav.py</li>
<li>Add to sitemap.xml</li>
<li>Add PAGES entry in build_assistant_kb.js</li>
<li>Run full i18n + KB build pipeline</li>
<li>Add URL to sw.js PRECACHE if linked from offline.html</li>
<li>Deploy and verify</li>
</ol>

<h3>25.2 Update Translations</h3>
<ol>
<li>Edit scripts/translation_dict.py (PHRASES_FR, PHRASES_SW, TERMS_FR, TERMS_SW)</li>
<li>python3 scripts/build_master_en.py</li>
<li>python3 scripts/build_i18n_content.py</li>
<li>node scripts/build_assistant_kb.js</li>
<li>Test FR and SW on affected pages</li>
</ol>

<h3>25.3 Update 3D Globe Sites</h3>
<ol>
<li>Verify facts in scripts/_verified_lake_facts.md</li>
<li>Edit SITES and/or FACILITIES in hero-3d.js</li>
<li>Update SITE_NAMES for en/fr/sw</li>
<li>bash scripts/build_hero_bundle.sh</li>
<li>Bump ?v= on index.html</li>
<li>node scripts/_globe_qa2.js</li>
</ol>

<h3>25.4 Roll Out Flagship to index.html</h3>
<ol>
<li>Replace theme.css link with flagship.css</li>
<li>Replace motion.js with flagship-motion.js</li>
<li>Refactor inline CSS to use flagship tokens</li>
<li>Retag .reveal elements as .fx where needed</li>
<li>Visual QA entire homepage</li>
<li>Update README migration status</li>
</ol>
</section>

<section id="sec-26" class="chapter page-break">
<h2>26. Security &amp; Privacy Notes</h2>
<ul>
<li>No user data sent to server — static site, mock forms only</li>
<li>Assistant conversations stored locally in IndexedDB only</li>
<li>SW never caches URLs with auth-like query params (token, apikey, etc.)</li>
<li>No third-party analytics scripts in production HTML</li>
<li>Map tiles contact Esri/OSM servers — privacy policy should disclose</li>
<li>dashboard.html is demo UI only — disallow in robots.txt</li>
</ul>
</section>

<section id="sec-27" class="chapter page-break">
<h2>27. Performance Budget</h2>
<table class="data-table">
<thead><tr><th>Asset</th><th>Approx Size</th><th>Load Strategy</th></tr></thead>
<tbody>
<tr><td>index.html inline CSS</td><td>~80KB</td><td>First paint critical</td></tr>
<tr><td>flagship.css</td><td>~45KB</td><td>Render-blocking link</td></tr>
<tr><td>hero-3d.bundle.js</td><td>~500KB</td><td>Lazy on IO</td></tr>
<tr><td>i18n-content.js</td><td>~200KB</td><td>defer</td></tr>
<tr><td>assistant-kb.js</td><td>~150KB</td><td>defer</td></tr>
<tr><td>Font files (woff2)</td><td>~300KB total</td><td>preload critical</td></tr>
</tbody></table>
<p>Target LCP: hero image/text before 3D loads. 3D is below fold — must not block. motion.js uses transform/opacity only to avoid layout thrash.</p>
</section>

<section id="sec-28" class="chapter page-break">
<h2>28. Version History &amp; Migration Status</h2>
<table class="data-table">
<thead><tr><th>Component</th><th>Status</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>Flagship CSS rollout</td><td>28/29 pages</td><td>index.html remains on theme.css</td></tr>
<tr><td>i18n full-site architecture</td><td>Complete</td><td>Partial translation coverage</td></tr>
<tr><td>PWA / Service Worker</td><td>v10</td><td>Bump VERSION per deploy</td></tr>
<tr><td>Knowledge Assistant</td><td>Live</td><td>Replaces legacy chat</td></tr>
<tr><td>hero-3d bundle</td><td>v9 query param</td><td>file:// safe</td></tr>
<tr><td>lake-3d Next.js</td><td>Orphaned</td><td>Not in production</td></tr>
<tr><td>Portuguese (PT)</td><td>Removed</td><td>Replaced with Swahili (SW)</td></tr>
</tbody></table>
</section>
""")

    return parts


def build_page_essays(meta):
    """Long-form essay per page for print volume."""
    parts = ['<section id="sec-39" class="chapter page-break"><h2>39. Page-by-Page Technical Essays</h2>']
    essays = {
        "index.html": """The homepage is the technical centerpiece of the Lake Group website. Unlike every other page, it retains the legacy theme.css design system because the #fuel-experience section was engineered alongside the original inline styles and the experience-3d DOM structure. Migrating index.html to Meridian (flagship.css) is the final step of the design rollout and requires careful regression testing of the 3D globe section, which has explicit skip zones in both motion engines.

The page structure follows a deliberate performance hierarchy. The first screen is a static hero with headline, subcopy, and call-to-action buttons — no WebGL, no heavy scripts. This ensures Largest Contentful Paint remains fast on mobile networks common in East Africa. The 3D interactive globe sits in #fuel-experience, typically one to two viewport heights below the fold. An inline IntersectionObserver script (not in a separate file) loads hero-3d.bundle.js only when the section approaches the viewport, with a generous 600px rootMargin so the bundle begins downloading before the user arrives.

The 3D section pairs WebGL canvas with a DOM copy column (.experience-steps) listing three narrative beats that sync to globe chapters. A finale overlay (.experience-finale) fades in during Chapter 4 of each 39-second loop, displaying the Lake Group logo and tagline over the living globe. Users who prefer reduced motion see this finale statically without WebGL initialization.

Below the 3D section, the divisions grid links to all eight service verticals. Statistics use data-count attributes consumed by site.js initCounters(). The founder section establishes corporate credibility with portrait photography. A news teaser may surface recent announcements. The closing CTA band drives contact and careers conversions.

Script load order on index.html: i18n-content, i18n, site, flexsearch, assistant-kb, assistant, inline lazy 3D loader, pwa, motion. Notably absent from initial load: hero-3d.bundle.js (lazy), Leaflet, news-data.js. Organization JSON-LD in head provides rich search results for company name, founder, address, and social profiles.""",

        "about.html": """About.html serves dual roles: it is the primary company overview for visitors and the reference implementation for the Meridian flagship design system. Every other migrated page follows patterns established here — fs-hero-title in the page hero, fs-on-dark ink bands alternating with paper sections, fs-marker numbered section headers, and fs-split asymmetric layouts.

The page embeds the cinematic our-story experience via #our-story-embed, allowing visitors to watch the eight-scene brand film without leaving the about flow. The narrative sections walk through founding in 2006, fleet growth, LPG introduction, steel and concrete diversification, and pan-African expansion. Photography is drawn from verified operational assets — storage terminals, trucks, leadership events.

Values and mission content uses data-i18n keys under the about.* prefix. When French or Swahili is selected, translated strings replace text; untranslated long-form paragraphs gracefully remain in English rather than showing raw keys. JSON-LD typically includes WebPage and BreadcrumbList types for SEO.

Developers editing this page should treat it as the canonical template: copy structure, not just styles, when creating new pages. After edits, run the full i18n pipeline and rebuild the assistant knowledge base so the about.* chunks stay current.""",

        "fuel.html": """Fuel.html represents Lake Oil, the group's flagship petroleum division and the business from which Lake Group grew. Content covers the retail network of 85+ stations across Tanzania, bulk supply to industrial customers, import terminal infrastructure, and competitive advantages in the East African fuel market.

The page uses standard Meridian layout: immersive page hero with Bebas display type, alternating ink and paper sections, photography from assets/images/banner/LakeOil.jpg and operational depot images. Tab components, if present, are wired through site.js initTabs() — clicking tab buttons toggles .active on .tab-pane elements within the nearest .tab-container.

All user-facing strings should carry data-i18n keys prefixed fuel.*. Product specifications, station counts, and country lists must align with scripts/_verified_lake_facts.md — the same document feeding the 3D globe and assistant curated facts. Schema.org markup typically declares Service type with provider Organization.

Performance-wise, fuel.html loads only the standard deferred script stack — no map libraries, no 3D, no news modules. This keeps the page lightweight for users on 3G connections searching for fuel station information.""",
    }
    for fname in sorted(meta.keys()):
        m = meta[fname]
        stem = fname.replace(".html", "").replace("-", " ").title()
        essay = essays.get(fname, f"""This document describes the technical characteristics of {fname}, a production page in the Lake Group static website.

Purpose: {m['desc'] or 'Corporate content page for ' + stem + '.'}

The page comprises approximately {m['lines']} lines of HTML including inline critical CSS in the document head. This inline CSS pattern is consistent across all Lake Group pages — it establishes layout and page-specific overrides before the shared flagship.css (or theme.css on index.html) loads. The inline block should not duplicate tokens already defined in the shared stylesheet except where page-specific layout demands it.

Structural headings include: {', '.join(m['h2s'][:5]) if m['h2s'] else 'standard section headers'}. Section IDs present: {', '.join(m['section_ids']) if m['section_ids'] else 'none declared'}.

Asset loading follows the site-wide convention. CSS: {', '.join(m['css']) if m['css'] else 'flagship.css, assistant.css'}. JavaScript executes in dependency order: {', '.join(m['js']) if m['js'] else 'i18n-content → i18n → site → flexsearch → assistant-kb → assistant → pwa → flagship-motion'}.

Internationalization uses data-i18n attributes keyed by page prefix. After content edits, developers must run build_master_en.py and build_i18n_content.py to regenerate dictionaries. The assistant knowledge base should also be rebuilt so queries about this page return current text.

Structured data: {'Types ' + ', '.join(m['schema']) if m['schema'] else 'No JSON-LD on this page'}. Pages with BreadcrumbList schema help search engines understand site hierarchy.

For QA, verify responsive layout at mobile (375px), tablet (768px), and desktop (1440px) breakpoints. Confirm no horizontal overflow. Test language switching on navigation labels and any tagged body content. Verify offline availability after service worker precache on second visit.

{'This page includes the interactive 3D hero bundle (lazy loaded).' if m['hero3d'] else 'This page does not load the 3D hero or Leaflet map libraries.'} {'Standard Meridian design applies.' if fname != 'index.html' else 'Legacy theme.css design — migration pending.'}""")

        parts.append(f"""
<article class="page-essay page-break">
<h3>{esc(fname)}</h3>
{''.join(f'<p>{esc(p.strip())}</p>' for p in essay.split(chr(10)+chr(10)) if p.strip())}
</article>
""")
    parts.append("</section>")
    return parts


def build_script_encyclopedia():
    """Detailed documentation for every scripts/ file."""
    scripts_dir = ROOT / "scripts"
    py_js = sorted(
        p for p in scripts_dir.iterdir()
        if p.suffix in (".py", ".js", ".sh")
        and p.is_file()
        and not p.name.startswith("_chrome")
    )
    parts = ['<section id="sec-40" class="chapter page-break"><h2>40. Build Scripts Encyclopedia</h2>']
    descriptions = {
        "build_i18n_content.py": "Reads _master_en.json and translation_dict.py output to generate assets/i18n-content.json and assets/i18n-content.js. The .js file wraps JSON in window.__LAKE_I18N_CONTENT__ assignment for file:// compatibility.",
        "build_master_en.py": "Scans all HTML files for data-i18n attributes and merges with existing _master_en.json to produce the English master dictionary. Run before adding translations.",
        "translation_dict.py": "Source of truth for French and Swahili translations. Contains PHRASES_FR, PHRASES_SW (full sentences) and TERMS_FR, TERMS_SW (short labels). Imported by build_i18n_content.py.",
        "i18n_extract.py": "Discovers i18n keys in HTML, reports orphans and missing keys. Use when auditing translation coverage.",
        "normalize_nav.py": "Splices nav.html, mobile_nav.html, footer.html, chat_widget.html into all root HTML pages. Critical for chrome consistency.",
        "build_assistant_kb.js": "Node script generating assets/assistant-kb.js from i18n-content.json plus CURATED_FACTS. Chunks page content into ~340 char documents for FlexSearch.",
        "build_hero_bundle.sh": "Shell wrapper invoking esbuild to bundle hero-3d.js with three.module.min.js into hero-3d.bundle.js as IIFE classic script.",
        "build_sw_lang.js": "Generates language-specific service worker precache variants for multilingual offline shells.",
        "add_pwa_tags.js": "Batch-injects manifest link, theme-color meta, apple-touch-icon into HTML heads.",
        "add_seo_tags.js": "Batch-injects description, og:*, twitter:card, canonical link tags.",
        "add_theme_motion_tags.js": "Batch-injects theme.css/flagship.css and motion.js/flagship-motion.js link tags.",
        "add_assistant_tags.js": "Batch-injects assistant.css, flexsearch, assistant-kb.js, assistant.js tags.",
        "self_host_fonts.py": "Downloads font files from fontsource or similar and generates assets/fonts/fonts.css @font-face rules.",
        "inline_material_icons.py": "Inlines Material Symbols as SVG or self-hosted font for offline use.",
        "perf_pass.js": "Automated performance audit — checks script defer, preload hints, image dimensions.",
        "fix_i18n_script_tag.py": "One-off fix script for i18n script tag ordering issues.",
        "generate_dev_pdf.sh": "Helper to render documentation to PDF via headless browser.",
    }
    for p in py_js:
        name = p.name
        if name.startswith("_qa") or name.startswith("_globe") or name.startswith("_apply"):
            desc = f"QA/automation utility: {name}. Run manually during release testing."
        else:
            desc = descriptions.get(name, f"Utility script in scripts/. Review source for usage.")
        try:
            lines = p.read_text(encoding="utf-8", errors="replace").count("\n")
        except Exception:
            lines = 0
        parts.append(f"""
<article class="script-ref page-break">
<h3>scripts/{esc(name)}</h3>
<p><strong>Type:</strong> {esc(p.suffix)} · <strong>Lines:</strong> {lines}</p>
<p>{esc(desc)}</p>
<p>Invocation: <code>{'python3' if p.suffix == '.py' else 'bash' if p.suffix == '.sh' else 'node'} scripts/{esc(name)}</code> from repository root.</p>
</article>
""")
    parts.append("</section>")
    return parts


def build_bulk_reference(meta):
    """Large reference appendices for print volume."""
    parts = []

    # News articles table
    nd = (ROOT / "assets/news-data.js").read_text(encoding="utf-8", errors="replace")
    articles = re.findall(
        r"id:\s*(\d+),\s*title:\s*\"([^\"]+)\",\s*date:\s*\"([^\"]+)\",\s*category:\s*\"([^\"]+)\"",
        nd,
    )
    news_rows = ""
    for aid, title, date, cat in articles:
        news_rows += f"<tr><td>{aid}</td><td>{esc(title)}</td><td>{esc(date)}</td><td>{esc(cat)}</td><td>news-article.html?id={aid}</td></tr>\n"
    parts.append(f"""
<section id="sec-29" class="chapter page-break">
<h2>29. Complete News Article Index</h2>
<p>All articles in <code>assets/news-data.js</code> ({len(articles)} total). Images under <code>assets/images/news/{{id}}/</code>.</p>
<table class="data-table">
<thead><tr><th>ID</th><th>Title</th><th>Date</th><th>Category</th><th>URL</th></tr></thead>
<tbody>{news_rows}</tbody>
</table>
</section>
""")

    # Subsidiaries
    parts.append("""
<section id="sec-30" class="chapter page-break">
<h2>30. Lake Group Subsidiaries &amp; Page Mapping</h2>
<p>Lake Group operates through 20+ subsidiaries across energy, logistics, and industrial sectors. The website maps each major division to a dedicated service page.</p>
<table class="data-table">
<thead><tr><th>Subsidiary</th><th>Sector</th><th>Page</th><th>Key Facts</th></tr></thead>
<tbody>
<tr><td>Lake Oil</td><td>Fuel &amp; Petroleum</td><td>fuel.html</td><td>Top 5 distributor Tanzania; 85+ stations; 8 countries</td></tr>
<tr><td>Lake Gas</td><td>LPG</td><td>lpg.html</td><td>6kg–38kg cylinders; composite cylinders; Tanga 3,000 MT terminal</td></tr>
<tr><td>Lake Lubes</td><td>Lubricants</td><td>lubricants.html</td><td>Automotive and industrial greases</td></tr>
<tr><td>Lake Steel</td><td>Steel</td><td>steel.html</td><td>First HS-CR rebar in Tanzania; 100,000 MT/yr; Kibaha mill</td></tr>
<tr><td>GCCP</td><td>Concrete</td><td>concrete.html</td><td>Ready-mix Dar es Salaam; Lugoba quarry; est. 2010</td></tr>
<tr><td>Lake Trans</td><td>Logistics</td><td>logistics.html, fleet.html</td><td>700+ trucks; bulk liquid and dry cargo</td></tr>
<tr><td>AFICD / ACFS</td><td>Containers</td><td>container-services.html</td><td>Inland depots Tanzania, Zambia, Mozambique</td></tr>
<tr><td>Burundi Petroleum</td><td>Fuel</td><td>africa-network.html</td><td>Bujumbura operations</td></tr>
<tr><td>Lake Petroleum (RW, ZM)</td><td>Fuel</td><td>africa-network.html</td><td>Kigali, Ndola/Lusaka</td></tr>
<tr><td>Wadi Elsundus / WAS</td><td>Fuel</td><td>africa-network.html</td><td>Ethiopia — Addis Ababa, Gelan depot</td></tr>
<tr><td>MERM / SAFF</td><td>Concrete / Trading</td><td>africa-network.html</td><td>Dubai UAE operations</td></tr>
</tbody></table>
</section>
""")

    # SW precache
    sw = (ROOT / "sw.js").read_text(encoding="utf-8", errors="replace")
    precache = re.findall(r"'(\./[^']+)'", sw.split("PRECACHE_URLS")[1].split("];")[0])
    pc_rows = "".join(f"<tr><td><code>{esc(u)}</code></td></tr>" for u in precache)
    parts.append(f"""
<section id="sec-31" class="chapter page-break">
<h2>31. Service Worker Precache Manifest</h2>
<p>URLs installed on SW activate ({len(precache)} entries from sw.js PRECACHE_URLS):</p>
<table class="data-table"><thead><tr><th>URL</th></tr></thead><tbody>{pc_rows}</tbody></table>
</section>
""")

    # FAQ
    faqs = [
        ("Why two CSS files?", "The site is migrating from theme.css to flagship.css (Meridian design). Only index.html still uses the legacy pair."),
        ("Why i18n-content.js instead of JSON?", "Browsers block fetch() of local JSON under file://. Script tags work under file://, http://, and https://."),
        ("Why bundle hero-3d.js?", "ES module scripts are blocked under file://. esbuild produces a classic script with Three.js inlined."),
        ("How do I add a language?", "Extend SUPPORTED in i18n.js, add dictionary in build pipeline, update lang switcher in nav template, rebuild all i18n artifacts."),
        ("Does the assistant use AI?", "No. It retrieves verbatim passages from assistant-kb.js via FlexSearch. No LLM, no network calls."),
        ("Why is dashboard.html blocked?", "It is a mock demo portal, not a real authenticated application. robots.txt Disallow prevents indexing."),
        ("What is lake-3d/?", "Orphaned Next.js prototype. Not linked from production. Delete or budget separate migration project."),
        ("How often bump sw VERSION?", "Every deploy that changes any precached file. When in doubt, bump."),
        ("Can I use npm packages on the live site?", "Avoid runtime CDN deps. Vendor libs live in assets/vendor/. Build step may use npm (esbuild, firebase-tools)."),
        ("Where are fonts hosted?", "Self-hosted under assets/fonts/files/. fonts.css defines @font-face. No Google Fonts CDN."),
        ("What map tiles does africa-network use?", "Esri World Imagery, OpenTopoMap, OpenStreetMap — all require network at runtime."),
        ("How does news filtering work?", "Pure client-side on LAKE_NEWS array. Category exact match; country via keyword heuristics in article text."),
        ("What is the Meridian tick?", "8×8px gold square on hairline rule — signature flagship motif in eyebrows and section markers."),
        ("Why defer scripts?", "Non-blocking parse. Order preserved. DOMContentLoaded fires after deferred scripts execute."),
        ("How to test offline?", "Load site online, wait for SW install, DevTools → Network → Offline, navigate to about.html."),
    ]
    faq_html = ""
    for i, (q, a) in enumerate(faqs, 1):
        faq_html += f"<dt>Q{i}. {esc(q)}</dt><dd>{esc(a)}</dd>\n"
    parts.append(f"""
<section id="sec-32" class="chapter page-break">
<h2>32. Frequently Asked Questions</h2>
<dl class="glossary">{faq_html}</dl>
</section>
""")

    # Schema.org per page
    parts.append('<section id="sec-33" class="chapter page-break"><h2>33. Structured Data by Page</h2><table class="data-table"><thead><tr><th>Page</th><th>schema.org Types</th><th>Notes</th></tr></thead><tbody>')
    for fname in sorted(meta.keys()):
        m = meta[fname]
        types = ", ".join(m["schema"]) if m["schema"] else "—"
        note = "Dynamic NewsArticle on news-article.html" if fname == "news-article.html" else ("Organization + founder" if fname == "index.html" else "WebPage / Service / BreadcrumbList typical")
        parts.append(f"<tr><td><code>{esc(fname)}</code></td><td>{esc(types)}</td><td>{esc(note)}</td></tr>")
    parts.append("</tbody></table></section>")

    # Operations countries deep dive
    parts.append("""
<section id="sec-34" class="chapter page-break">
<h2>34. Operations Countries — Verified Reference</h2>
<p>All geographic claims on the 3D hero and africa-network map must match scripts/_verified_lake_facts.md.</p>
<table class="data-table">
<thead><tr><th>Country</th><th>ISO</th><th>Base City</th><th>Entities</th><th>Map Key</th></tr></thead>
<tbody>
<tr><td>Tanzania</td><td>TZ</td><td>Dar es Salaam (HQ)</td><td>Lake Oil, Lake Gas, Lake Steel, GCCP, Lake Trans, AFICD</td><td>tz</td></tr>
<tr><td>Kenya</td><td>KE</td><td>Nairobi</td><td>Lake Oil Kenya, Mombasa port access</td><td>ke</td></tr>
<tr><td>Zambia</td><td>ZM</td><td>Lusaka / Ndola</td><td>Lake Petroleum Zambia, AFICD</td><td>zm</td></tr>
<tr><td>Rwanda</td><td>RW</td><td>Kigali</td><td>Lake Petroleum Rwanda, Lake Gas</td><td>rw</td></tr>
<tr><td>Burundi</td><td>BI</td><td>Bujumbura</td><td>Burundi Petroleum</td><td>bi</td></tr>
<tr><td>DR Congo</td><td>CD</td><td>Lubumbashi</td><td>DRC Petroleum, Lake Trans</td><td>cd</td></tr>
<tr><td>Ethiopia</td><td>ET</td><td>Addis Ababa</td><td>Wadi Elsundus Petroleum</td><td>et</td></tr>
<tr><td>Mozambique</td><td>MZ</td><td>Beira / Maputo</td><td>Lake Oil LDA, AFICD</td><td>mz</td></tr>
<tr><td>UAE</td><td>AE</td><td>Dubai</td><td>MERM Ready Mix, SAFF</td><td>ae</td></tr>
</tbody></table>
</section>
""")

    # Template files content summary
    parts.append("""
<section id="sec-35" class="chapter page-break">
<h2>35. Template System Reference</h2>
<p>Shared chrome is maintained in four template files under scripts/templates/:</p>
<h3>35.1 nav.html</h3>
<p>Desktop navigation with three dropdown menus (Services, Network, Company), language switcher (EN/FR/SW buttons with .lang-btn and data-lang), and logo link to index.html. All labels use data-i18n keys under nav.* prefix.</p>
<h3>35.2 mobile_nav.html</h3>
<p>Accordion-style mobile menu mirroring desktop links. Toggled by #nav-toggle. Uses mob.* i18n keys. Hidden by default; .open class shows flex layout.</p>
<h3>35.3 footer.html</h3>
<p>Four-column footer grid: company links, services links, network links, contact info. Social media icons. Copyright line. footer.* i18n keys.</p>
<h3>35.4 chat_widget.html</h3>
<p>Legacy chat markup: #chat-widget, #chat-btn, #chat-box, #chat-messages, #chat-input. Assistant.js replaces inner UI but preserves mount point. chat.* i18n keys for placeholder and greeting.</p>
<h3>35.5 normalize_nav.py</h3>
<p>Python script that splices templates into all root HTML files between known markers. Run after any template edit. Prevents nav drift between pages.</p>
</section>
""")

    # Long-form architecture essay
    parts.append("""
<section id="sec-36" class="chapter page-break">
<h2>36. Architectural Decision Records</h2>

<h3>36.1 ADR-001: Static MPA over SPA Framework</h3>
<p><strong>Context:</strong> Corporate site with 29 pages, SEO requirements, offline PWA, and limited dev team.</p>
<p><strong>Decision:</strong> Plain HTML pages with shared vanilla JS modules.</p>
<p><strong>Rationale:</strong> Zero framework runtime cost. Each page is independently cacheable. No hydration complexity. Works on file:// for local preview. Firebase Hosting serves static files efficiently.</p>
<p><strong>Consequences:</strong> Nav/footer duplication solved by template scripts. No client-side router. Page transitions are full reloads (acceptable for corporate site).</p>

<h3>36.2 ADR-002: Script-Loaded Globals over fetch() for Critical Data</h3>
<p><strong>Context:</strong> Stakeholders preview site by double-clicking HTML files.</p>
<p><strong>Decision:</strong> Ship i18n, GeoJSON, assistant KB, and 3D bundle as script tags setting window.* globals.</p>
<p><strong>Rationale:</strong> file:// CORS blocks fetch() silently. Script tags have no such restriction.</p>

<h3>36.3 ADR-003: FlexSearch Assistant over External Chatbot</h3>
<p><strong>Context:</strong> Need helpful Q&amp;A without API costs, privacy concerns, or hallucination risk.</p>
<p><strong>Decision:</strong> Build-time KB + client-side search returning verbatim passages.</p>
<p><strong>Rationale:</strong> Works offline. Answers are auditable. No API keys. Multilingual via parallel indexes.</p>

<h3>36.4 ADR-004: Dual Design System During Migration</h3>
<p><strong>Context:</strong> Full visual redesign (Meridian) cannot ship atomically for 29 pages.</p>
<p><strong>Decision:</strong> flagship.css pair replaces theme.css pair per-page. Both precached until complete.</p>
<p><strong>Rationale:</strong> Incremental rollout reduces risk. index.html last due to 3D section coupling.</p>

<h3>36.5 ADR-005: Lazy-Load 3D Bundle</h3>
<p><strong>Context:</strong> hero-3d.bundle.js is ~500KB.</p>
<p><strong>Decision:</strong> IntersectionObserver on #fuel-experience with 600px rootMargin.</p>
<p><strong>Rationale:</strong> 3D is below fold. LCP should not wait for WebGL. Users who never scroll still get full page.</p>
</section>
""")

    # CSS class reference from flagship
    fc = (ROOT / "assets/flagship.css").read_text(encoding="utf-8", errors="replace")
    classes = sorted(set(re.findall(r"^\.([a-zA-Z][\w-]*)", fc, re.M)))[:120]
    class_rows = "".join(f"<tr><td><code>.{esc(c)}</code></td></tr>" for c in classes)
    parts.append(f"""
<section id="sec-37" class="chapter page-break">
<h2>37. flagship.css Class Index (Sample)</h2>
<p>flagship.css contains {fc.count(chr(10))} lines. Selected class selectors:</p>
<table class="data-table"><thead><tr><th>Class</th></tr></thead><tbody>{class_rows}</tbody></table>
<p>See FLAGSHIP_DESIGN.md for complete component documentation.</p>
</section>
""")

    # Print estimation note
    parts.append("""
<section id="sec-38" class="chapter page-break">
<h2>38. Document Information</h2>
<p>This developer guide is designed for print at A4 with 2cm margins. Estimated page count depends on browser print settings; content density targets 80+ pages when printed from Chrome or Firefox with default margins.</p>
<p>To regenerate after repository changes:</p>
<pre class="code-block">python3 docs/_gen_developer_guide.py</pre>
<p>Source of truth is always the repository files — this document is generated from live project metadata and should be regenerated before major releases.</p>
</section>
""")

    return parts


def main():
    body_parts, meta = build_html()
    body_parts.extend(build_remaining_sections(meta))
    body_parts.extend(build_extended_content(meta))
    body_parts.extend(build_bulk_reference(meta))
    body_parts.extend(build_page_essays(meta))
    body_parts.extend(build_script_encyclopedia())

    # Insert expansion before appendix
    full_body = "".join(body_parts)

    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lake Group Website — Developer Guide</title>
<style>{CSS}</style>
</head>
<body>
{full_body}
<footer style="margin-top:4em;padding-top:2em;border-top:2px solid #FFD700;text-align:center;color:#5a6478;font-size:0.85rem;">
<p>Lake Group Developer Guide · Generated from repository sources · Confidential internal use</p>
</footer>
</body>
</html>
"""

    OUT.write_text(doc, encoding="utf-8")
    lines = doc.count("\n")
    words = len(doc.split())
    print(f"Wrote {OUT} — {lines} lines, ~{words} words, {len(doc)/1024:.0f} KB")


if __name__ == "__main__":
    main()
