'use strict';
/**
 * Step 3 rendered verification: logo heights + hero photo layers.
 * Usage: node scripts/_verify_render.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.join(__dirname, '..');
const PORT = 3456;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (urlPath === '/') urlPath = '/index.html';
        const filePath = path.normalize(path.join(ROOT, urlPath));
        if (!filePath.startsWith(ROOT)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function listPages() {
  return fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => {
      const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
      return /class="site-nav"/.test(s);
    })
    .sort();
}

async function main() {
  const pages = listPages();
  console.log('Pages with site-nav:', pages.length);

  const playwright = require(path.join(ROOT, 'node_modules', 'playwright'));
  const server = await startStaticServer();
  console.log('Server on http://127.0.0.1:' + PORT);

  const browser = await playwright.chromium.launch({ headless: true });
  const results = [];
  const heroFails = [];

  try {
    for (const page of pages) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p = await ctx.newPage();
      await p.goto(`http://127.0.0.1:${PORT}/${page}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      await p.waitForTimeout(350);

      const data = await p.evaluate(() => {
        const img = document.querySelector('.site-nav .nav-logo img');
        const rect = img ? img.getBoundingClientRect() : null;
        const hero = document.querySelector('.page-hero') || document.querySelector('section.hero, .hero');
        let heroInfo = null;
        if (hero) {
          const media = hero.querySelector('.hero-media, .page-hero-photo, .hero-photo');
          const overlay = hero.querySelector('.hero-overlay, .page-hero-overlay');
          const cs = getComputedStyle(hero);
          const mediaCs = media ? getComputedStyle(media) : null;
          const overlayCs = overlay ? getComputedStyle(overlay) : null;
          heroInfo = {
            tag: hero.className,
            heroBg: cs.backgroundColor,
            heroBgImage: cs.backgroundImage,
            hasMedia: !!media,
            mediaOpacity: mediaCs ? mediaCs.opacity : null,
            mediaBg: mediaCs ? mediaCs.backgroundImage : null,
            hasOverlay: !!overlay,
            overlayBg: overlayCs ? overlayCs.backgroundImage : null,
          };
        }
        return {
          height: rect ? rect.height : null,
          width: rect ? rect.width : null,
          src: img ? img.getAttribute('src') : null,
          inlineHeight: img ? img.style.height || '' : null,
          computedHeight: img ? getComputedStyle(img).height : null,
          heroInfo,
        };
      });

      results.push({ page, ...data });

      if (data.heroInfo) {
        const h = data.heroInfo;
        const photoOk =
          h.hasMedia &&
          h.mediaBg &&
          h.mediaBg !== 'none' &&
          parseFloat(h.mediaOpacity || '0') >= 0.9;
        const overlayOk = h.hasOverlay && h.overlayBg && h.overlayBg !== 'none';
        if (!photoOk || !overlayOk) {
          heroFails.push({
            page,
            photoOk,
            overlayOk,
            mediaOpacity: h.mediaOpacity,
            mediaBg: (h.mediaBg || '').slice(0, 80),
            overlayBg: (h.overlayBg || '').slice(0, 80),
          });
        }
      } else {
        // pages with site-nav but no hero are ok (none expected in our set)
      }

      await ctx.close();
      process.stdout.write('.');
    }
  } finally {
    await browser.close();
    server.close();
  }

  const heights = results.map((r) => r.height).filter((h) => h != null);
  const min = Math.min(...heights);
  const max = Math.max(...heights);
  const logoOk = max - min <= 1.01;

  console.log('\n\n=== LOGO HEIGHT TABLE ===');
  console.log('page | renderedHeight | computedHeight | width | src | inline');
  for (const r of results) {
    console.log(
      [
        r.page,
        r.height != null ? r.height.toFixed(2) : 'NULL',
        r.computedHeight || '-',
        r.width != null ? r.width.toFixed(2) : 'NULL',
        (r.src || '').split('/').pop(),
        r.inlineHeight || '-',
      ].join(' | ')
    );
  }
  console.log(
    `\nHeight range: ${min.toFixed(2)} – ${max.toFixed(2)} (delta ${(max - min).toFixed(2)})`
  );
  console.log(logoOk ? 'LOGO PASS: all within 1px' : 'LOGO FAIL: heights differ');

  console.log('\n=== HERO CHECK ===');
  for (const r of results) {
    if (!r.heroInfo) {
      console.log(r.page + ': no hero section');
      continue;
    }
    const h = r.heroInfo;
    const pass =
      h.hasMedia &&
      h.mediaBg &&
      h.mediaBg !== 'none' &&
      parseFloat(h.mediaOpacity || '0') >= 0.9 &&
      h.hasOverlay &&
      h.overlayBg &&
      h.overlayBg !== 'none';
    console.log(
      [
        r.page,
        pass ? 'PASS' : 'FAIL',
        'op=' + h.mediaOpacity,
        'overlay=' + h.hasOverlay,
        (h.mediaBg || 'none').slice(0, 70),
      ].join(' | ')
    );
  }

  if (heroFails.length) {
    console.log('\nHero failures:', heroFails.length);
    heroFails.forEach((f) => console.log(' -', JSON.stringify(f)));
  } else {
    console.log('\nHERO PASS: all pages have visible photo + gradient overlay');
  }

  const out = path.join(ROOT, 'scripts', '_verify_render_out.json');
  fs.writeFileSync(
    out,
    JSON.stringify({ logoOk, min, max, results, heroFails }, null, 2)
  );
  console.log('\nWrote', out);

  if (!logoOk || heroFails.length) process.exit(1);
  console.log('\nSTEP 3 COMPLETE — all checks passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
