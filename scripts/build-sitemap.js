/**
 * Build the public XML sitemap and robots.txt from the central SEO manifest.
 * Usage: SITE_URL=https://official-domain.example node scripts/build-sitemap.js
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');

async function main() {
  const { SITE, INDEXABLE_ROUTES } = await import(
    pathToFileURL(path.join(__dirname, 'seo-config.mjs')).href
  );
  if (!SITE.isConfigured) {
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n');
    fs.writeFileSync(path.join(ROOT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    console.log('SITE_URL is not configured: emitted noindex-safe sitemap and robots policy.');
    return;
  }
  const DOMAIN = SITE.origin;
  const mainRoutes = new Set([
    'index.html', 'about.html', 'our-story.html', 'africa-network.html',
    'projects.html', 'news.html', 'leadership.html', 'contact.html', 'history.html',
    'gallery.html', 'csr.html', 'careers.html', 'station-locator.html',
  ]);
  const pages = INDEXABLE_ROUTES.filter((file) => file !== 'index.html').slice().sort();
  const entry = (location, file) => {
    const isMain = mainRoutes.has(file);
    const lastmod = fs.statSync(path.join(ROOT, file)).mtime.toISOString().slice(0, 10);
    return `  <url>\n    <loc>${DOMAIN}${location}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${isMain ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${file === 'index.html' ? '1.0' : isMain ? '0.8' : '0.6'}</priority>\n  </url>`;
  };
  const entries = [entry('/', 'index.html'), ...pages.map((file) => entry(`/${file}`, file))];
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /404.html\nDisallow: /offline.html\nDisallow: /dashboard.html\nDisallow: /cms/\nDisallow: /backend/\nDisallow: /docs/\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
  console.log(`sitemap.xml: ${entries.length} canonical indexable URLs → ${DOMAIN}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
