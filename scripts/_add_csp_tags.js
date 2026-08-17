/**
 * SECURITY_ROADMAP Phase 7 — add the Content-Security-Policy meta tag to
 * every static page, before </head> (all page scripts live at the end of
 * <body>, so the meta always precedes them).
 *
 * Policy rationale (audited against what the site actually loads):
 *   default-src 'self'          — deny everything not listed below
 *   script-src 'self' 'unsafe-inline'
 *      More than 40 pages carry inline script elements (structured data and
 *      interactive behavior) that require a future nonce/hash build step.
 *      Injected EXTERNAL scripts (<script src="https://evil">) stay blocked.
 *   script-src-attr 'none'      — inline event handlers have been removed.
 *   style-src 'self' 'unsafe-inline'
 *      ~1400 inline style="" attributes across the site.
 *   img-src 'self' data: https: — local assets, data: icons, external media
 *      (instagram/youtube/arcgis/CDN).
 *   font-src 'self' data:       — local fonts (fonts/fonts.css) + icon fonts.
 *   connect-src 'self' https:   — same-origin releases and explicitly
 *      configured HTTPS production APIs; development loopback is excluded.
 *   frame-src youtube + youtube-nocookie — the only embeds on the site.
 *   object-src 'none', base-uri 'self', form-action 'self'
 * The Vercel response header separately enforces frame-ancestors 'none';
 * it is intentionally omitted here because browsers ignore it in meta CSP.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const META = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;

let inserted = 0;
let updated = 0;
let skipped = 0;
for (const file of fs.readdirSync(ROOT)) {
  if (!file.endsWith('.html')) continue;
  const p = path.join(ROOT, file);
  const html = fs.readFileSync(p, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) {
    const next = html.replace(
      /<meta http-equiv="Content-Security-Policy" content="[^"]*">/,
      META,
    );
    if (next === html) { skipped += 1; continue; }
    fs.writeFileSync(p, next);
    updated += 1;
    console.log(`CSP updated: ${file}`);
    continue;
  }
  const idx = html.indexOf('</head>');
  if (idx === -1) { console.log(`SKIP (no </head>) ${file}`); skipped += 1; continue; }
  fs.writeFileSync(p, html.slice(0, idx) + '  ' + META + '\n' + html.slice(idx));
  inserted += 1;
  console.log(`CSP added: ${file}`);
}
console.log(`\ninserted=${inserted} updated=${updated} skipped=${skipped}`);
