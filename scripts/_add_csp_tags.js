/**
 * SECURITY_ROADMAP Phase 7 — add the Content-Security-Policy meta tag to
 * every static page, before </head> (all page scripts live at the end of
 * <body>, so the meta always precedes them).
 *
 * Policy rationale (audited against what the site actually loads):
 *   default-src 'self'          — deny everything not listed below
 *   script-src 'self' 'unsafe-inline'
 *      14 pages carry inline interactive scripts (motion, country selectors,
 *      gallery filters) that would be a large refactor to externalize.
 *      Injected EXTERNAL scripts (<script src="https://evil">) stay blocked.
 *   style-src 'self' 'unsafe-inline'
 *      ~1400 inline style="" attributes across the site.
 *   img-src 'self' data: https: — local assets, data: icons, external media
 *      (instagram/youtube/arcgis/CDN).
 *   font-src 'self' data:       — local fonts (fonts/fonts.css) + icon fonts.
 *   connect-src 'self' https: http://127.0.0.1:*
 *      'self' + https covers the deployment-configurable LAKE_API_BASE;
 *      the loopback wildcard keeps the local dev/test API working.
 *   frame-src youtube + youtube-nocookie — the only embeds on the site.
 *   object-src 'none', base-uri 'self', form-action 'self' https:
 * frame-ancestors is NOT honored in <meta> (headers only) — the reverse
 * proxy / API responses already send frame-ancestors 'none' (Phase 11).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: http://127.0.0.1:*",
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https:",
].join('; ');

const META = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;

let inserted = 0;
let skipped = 0;
for (const file of fs.readdirSync(ROOT)) {
  if (!file.endsWith('.html')) continue;
  const p = path.join(ROOT, file);
  const html = fs.readFileSync(p, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) { skipped += 1; continue; }
  const idx = html.indexOf('</head>');
  if (idx === -1) { console.log(`SKIP (no </head>) ${file}`); skipped += 1; continue; }
  fs.writeFileSync(p, html.slice(0, idx) + '  ' + META + '\n' + html.slice(idx));
  inserted += 1;
  console.log(`CSP added: ${file}`);
}
console.log(`\ninserted=${inserted} skipped=${skipped}`);
