/**
 * Phase 11 — SEO artifacts: sitemap.xml + robots.txt.
 *
 * Regenerates sitemap.xml in the site's established style (the repo ships a
 * hand-curated sitemap: root URL, <changefreq> and <priority> per page) and
 * refreshes robots.txt. Never indexed: the offline page, 404, the dormant
 * Payload-shaped dashboard and the experimental financial/org-chart pages.
 *
 * Usage:  node scripts/build-sitemap.js [--domain https://www.lakeoilgroup.com]
 * Diff before committing:  git diff sitemap.xml robots.txt
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOMAIN = (process.argv.find((a) => a.startsWith('--domain=')) || '--domain=https://www.lakeoilgroup.com').split('=')[1].replace(/\/+$/, '');

// Pages that must never be indexed.
const EXCLUDE = new Set([
  '404.html', 'offline.html', 'dashboard.html',
  'lake-group-financial-dashboard.html', 'lake-group-org-chart.html',
]);

// Main navigational pages: weekly changefreq + priority 0.8.
const MAIN = new Set([
  'index.html', 'about.html', 'our-story.html', 'services.html',
  'africa-network.html', 'projects.html', 'news.html', 'leadership.html',
  'contact.html', 'history.html', 'gallery.html', 'csr.html', 'careers.html',
  'station-locator.html',
]);

// index.html is represented by the root URL (canonical) — listing it again
// as /index.html would create a duplicate-page signal.
const pages = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && f !== 'index.html' && !EXCLUDE.has(f))
  .sort();

const url = (loc, lastmod, changefreq, priority) =>
  `  <url>\n    <loc>${DOMAIN}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

const entries = [
  // Root first, like the curated sitemap.
  url('/', new Date().toISOString().slice(0, 10), 'weekly', '1.0'),
  ...pages.map((f) => {
    const mtime = fs.statSync(path.join(ROOT, f)).mtime.toISOString().slice(0, 10);
    const main = MAIN.has(f);
    return url(`/${f}`, mtime, main ? 'weekly' : 'monthly', main ? '0.8' : '0.6');
  }),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /offline.html
Disallow: /dashboard.html

Sitemap: ${DOMAIN}/sitemap.xml
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots);
console.log(`sitemap.xml: ${pages.length + 1} URLs (root + ${pages.length} pages) → ${DOMAIN}`);
console.log('robots.txt written — diff both files before committing.');
