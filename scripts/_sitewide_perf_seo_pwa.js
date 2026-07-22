#!/usr/bin/env node
/**
 * Safe sitewide cache-bust + SEO + lazy + pwa wiring (v58).
 * Only rewrites href/src/@import attribute values — never bare path substrings
 * inside comments (that previously corrupted index.html inline CSS).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://www.lakeoilgroup.com/';
const V = {
  tokens: '58',
  theme: '73',
  flagship: '73',
  pwa: '58',
  site: '58',
  motion: '58',
  flagshipMotion: '58',
  skeleton: '3',
};

const REDIRECT_STUBS = new Set([
  'fuel.html',
  'lpg.html',
  'lubricants.html',
  'steel.html',
  'concrete.html',
  'logistics.html',
  'container-services.html',
]);

function pageUrl(file) {
  return file === 'index.html' ? BASE : BASE + file;
}

function stripTags(s) {
  return String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]) : 'Lake Group';
}

function extractDescription(html, title) {
  const meta = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  if (meta && meta[1].trim().length > 40) return meta[1].trim();
  const p = html.match(/<p[^>]*class=["'][^"']*(?:hero-sub|lead|fs-lede)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  if (p) {
    const t = stripTags(p[1]);
    if (t.length > 60) return t.slice(0, 160);
  }
  const any = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (any) {
    const t = stripTags(any[1]);
    if (t.length > 60) return t.slice(0, 160);
  }
  return `${title} — Lake Group energy, logistics and industry across East and Central Africa.`;
}

function ensureMeta(html, file) {
  if (file === '404.html' || file === 'offline.html' || REDIRECT_STUBS.has(file)) return html;
  const title = extractTitle(html);
  const desc = extractDescription(html, title).replace(/"/g, '&quot;');
  const url = pageUrl(file);
  const image = BASE + 'assets/images/logos/LAKE_GROUP_LOGO.png';
  const needed = [
    { re: /<meta\s+name=["']description["']/i, tag: `<meta name="description" content="${desc}">` },
    { re: /<meta\s+property=["']og:title["']/i, tag: `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}">` },
    { re: /<meta\s+property=["']og:description["']/i, tag: `<meta property="og:description" content="${desc}">` },
    { re: /<meta\s+property=["']og:image["']/i, tag: `<meta property="og:image" content="${image}">` },
    { re: /<meta\s+property=["']og:url["']/i, tag: `<meta property="og:url" content="${url}">` },
    { re: /<meta\s+property=["']og:type["']/i, tag: `<meta property="og:type" content="website">` },
    { re: /<meta\s+property=["']og:site_name["']/i, tag: `<meta property="og:site_name" content="Lake Group">` },
    { re: /<meta\s+name=["']twitter:card["']/i, tag: `<meta name="twitter:card" content="summary_large_image">` },
    { re: /<meta\s+name=["']twitter:title["']/i, tag: `<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">` },
    { re: /<meta\s+name=["']twitter:description["']/i, tag: `<meta name="twitter:description" content="${desc}">` },
    { re: /<meta\s+name=["']twitter:image["']/i, tag: `<meta name="twitter:image" content="${image}">` },
    { re: /rel=["']canonical["']/i, tag: `<link rel="canonical" href="${url}">` },
  ];
  const missing = needed.filter((n) => !n.re.test(html));
  if (!missing.length) return html;
  const titleEnd = html.indexOf('</title>');
  if (titleEnd === -1) return html;
  return html.slice(0, titleEnd + 8) + '\n  ' + missing.map((m) => m.tag).join('\n  ') + html.slice(titleEnd + 8);
}

function bumpAttrVersions(html) {
  const map = {
    'tokens.css': V.tokens,
    'theme.css': V.theme,
    'flagship.css': V.flagship,
    'pwa.js': V.pwa,
    'site.js': V.site,
    'motion.js': V.motion,
    'flagship-motion.js': V.flagshipMotion,
    'skeleton.css': V.skeleton,
    'skeleton.js': V.skeleton,
  };
  let out = html;
  for (const [file, ver] of Object.entries(map)) {
    const re = new RegExp(
      `((?:href|src)=["'])assets/${file.replace('.', '\\.')}(?:\\?[^"']*)?(["'])`,
      'g'
    );
    out = out.replace(re, `$1assets/${file}?v=${ver}$2`);
  }
  // Safe @import only (quoted url)
  out = out.replace(
    /@import\s+url\(["']assets\/tokens\.css(?:\?[^"']*)?["']\)/g,
    `@import url("assets/tokens.css?v=${V.tokens}")`
  );
  return out;
}

function ensurePwa(html, file) {
  if (html.includes('assets/pwa.js') || REDIRECT_STUBS.has(file)) return html;
  const bodyEnd = html.lastIndexOf('</body>');
  if (bodyEnd === -1) return html;
  return html.slice(0, bodyEnd) + `<script src="assets/pwa.js?v=${V.pwa}" defer></script>\n` + html.slice(bodyEnd);
}

function ensureViewportCharset(html) {
  let out = html;
  if (!/<meta\s+charset=/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, '<head$1>\n  <meta charset="UTF-8">');
  }
  if (!/<meta\s+name=["']viewport["']/i.test(out)) {
    out = out.replace(
      /<meta charset=["'][^"']*["']\s*\/?>/i,
      (m) => m + '\n  <meta name="viewport" content="width=device-width,initial-scale=1.0">'
    );
  }
  return out;
}

function lazyImages(html, file) {
  let heroZone = [-1, -1];
  if (file === 'index.html') {
    const start = html.indexOf('<div class="hero-photo-grid">');
    if (start !== -1) {
      const end = html.indexOf('</div>', start);
      heroZone = [start, end === -1 ? start : end];
    }
  }
  const SKIP_IMG = /(?:ose-photo|photo-slot|start-logo|experience-3d)/;
  return html.replace(/<img\b[^>]*>/g, (tag, offset) => {
    if (offset >= heroZone[0] && offset <= heroZone[1]) {
      let out = tag;
      if (!/\bfetchpriority=/.test(out) && /hero-photo|photo-slot/.test(out)) {
        out = out.replace(/>$/, ' fetchpriority="high">');
      }
      if (!/\bloading=/.test(out)) out = out.replace(/>$/, ' loading="eager">');
      return out;
    }
    if (tag.includes('LAKE_GROUP_LOGO')) {
      let out = tag;
      // Prefer inserting before the closing `>` / `/>` so self-closing tags stay valid.
      const close = /\s*\/?\s*>$/.exec(out);
      if (close) {
        const end = close[0];
        const base = out.slice(0, -end.length);
        let inject = '';
        if (!/\bheight=/.test(out) && !/\bwidth=/.test(out)) {
          inject += ' width="180" height="48"';
        }
        if (!/\bdecoding=/.test(out)) inject += ' decoding="async"';
        out = base + inject + (end.includes('/') ? ' />' : '>');
      }
      return out;
    }
    if (SKIP_IMG.test(tag)) return tag;
    if (/src=["']\s*["']/.test(tag)) return tag;
    let out = tag;
    const close = /\s*\/?\s*>$/.exec(out);
    if (!close) return out;
    const end = close[0];
    const base = out.slice(0, -end.length);
    let inject = '';
    if (!/\bloading=/.test(out)) inject += ' loading="lazy"';
    if (!/\bdecoding=/.test(out) && (inject.includes('loading="lazy"') || /loading="lazy"/.test(out))) {
      inject += ' decoding="async"';
    }
    if (!inject) return out;
    return base + inject + (end.includes('/') ? ' />' : '>');
  });
}

function updateCriticalSkel(html) {
  const next =
    '<style id="lg-skel-critical">html.lg-loading{overflow:hidden}html.lg-loading::before{content:"";position:fixed;inset:0;z-index:99989;background:#013f5c;pointer-events:none}html.lg-skel-done::before{display:none}' +
    '.nav-logo img,.site-nav .nav-logo img{height:var(--nav-logo-height,48px)!important;width:auto!important;max-width:min(220px,55vw)!important;max-height:var(--nav-logo-height,48px)!important;object-fit:contain}' +
    '</style>';
  if (html.includes('id="lg-skel-critical"')) {
    return html.replace(/<style id="lg-skel-critical">[\s\S]*?<\/style>/, next);
  }
  // Inject early critical chrome if missing (after charset if present)
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>\n  ${next}`);
  }
  return html;
}

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
let changed = 0;
for (const file of files) {
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;
  html = ensureViewportCharset(html);
  html = bumpAttrVersions(html);
  html = updateCriticalSkel(html);
  html = ensureMeta(html, file);
  html = ensurePwa(html, file);
  if (file !== 'offline.html' && file !== '404.html') html = lazyImages(html, file);
  if (html !== before) {
    fs.writeFileSync(full, html, 'utf8');
    changed++;
    console.log('updated', file);
  } else console.log('ok     ', file);
}
console.log(`\nDone. ${changed}/${files.length} files. versions=`, V);
