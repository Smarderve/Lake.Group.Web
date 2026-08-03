/* Verify news.html API wiring:
 *  A) With window.LAKE_NEWS_API_URL set — page renders articles from the API
 *     (normalized into the site's LAKE_NEWS shape, formatted dates).
 *  B) With no API configured — page renders the bundled window.LAKE_NEWS data.
 * Run: node scripts/_verify_news_api.js
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8977;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const MOCK_API = {
  docs: [
    {
      id: 1,
      legacyId: 501,
      title: 'API Story One — Mock',
      date: '2026-02-15T00:00:00.000Z',
      category: 'Expansion',
      excerpt: 'Excerpt of the first mock story.',
      description: [{ paragraph: 'Paragraph one of mock story.' }],
      bannerImage: { url: '/media/mock-banner.jpg' },
      images: [{ image: { url: '/media/mock-1.jpg' } }],
      videoUrl: null,
      status: 'published',
    },
    {
      id: 2,
      legacyId: 502,
      title: 'API Story Two — Mock',
      date: '2025-07-04T00:00:00.000Z',
      category: 'LPG',
      excerpt: 'Second mock story without description.',
      description: [],
      bannerImage: null,
      images: [],
      videoUrl: 'https://www.youtube.com/watch?v=abc123456',
      status: 'published',
    },
  ],
  totalDocs: 2,
  page: 1,
  totalPages: 1,
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/api/news' || urlPath.startsWith('/api/news')) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(MOCK_API));
    return;
  }
  let file = path.join(ROOT, urlPath === '/' ? 'news.html' : urlPath);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

let failures = 0;

function check(name, ok, detail) {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name} — ${detail || ''}`);
  }
}

(async () => {
  await new Promise((resolve) => server.listen(PORT, resolve));
  const browser = await chromium.launch();

  try {
    /* --- Test A: CMS API path --- */
    console.log('A) CMS API path');
    const pageA = await browser.newPage();
    const apiRequests = [];
    pageA.on('request', (r) => {
      if (r.url().includes('/api/news')) apiRequests.push(r.url());
    });
    await pageA.addInitScript((port) => {
      window.LAKE_NEWS_API_URL = `http://localhost:${port}`;
    }, PORT);
    const pageErrorsA = [];
    pageA.on('pageerror', (e) => pageErrorsA.push(String(e)));
    await pageA.goto(`http://localhost:${PORT}/news.html`, { waitUntil: 'networkidle' });
    await pageA.waitForSelector('.news-card', { timeout: 10000 });

    const apiState = await pageA.evaluate(() => ({
      featuredTitle: document.querySelector('.news-featured__title')?.textContent?.trim() || '',
      featuredDate: document.querySelector('.news-featured__date')?.textContent?.trim() || '',
      count: document.querySelectorAll('.news-card').length,
      cardDates: Array.from(document.querySelectorAll('.news-card__date')).map((e) => e.textContent.trim()),
      cardTitles: Array.from(document.querySelectorAll('.news-card__title')).map((e) => e.textContent.trim()),
    }));

    check('API request was made', apiRequests.length > 0, 'no /api/news request seen');
    /* Newest doc (2026) lands in the featured slot; the older one becomes a card. */
    check(
      'API featured title rendered',
      apiState.featuredTitle === 'API Story One — Mock',
      `got "${apiState.featuredTitle}"`
    );
    check(
      'API featured date formatted',
      apiState.featuredDate === '15 Feb, 2026',
      `got "${apiState.featuredDate}"`
    );
    check('API cards rendered', apiState.count >= 1, `got ${apiState.count}`);
    check(
      'API card date formatted (older story)',
      apiState.cardDates[0] === '4 Jul, 2025',
      JSON.stringify(apiState.cardDates)
    );
    check(
      'API titles present in feed',
      apiState.cardTitles[0] === 'API Story Two — Mock',
      JSON.stringify(apiState.cardTitles)
    );
    check('no page errors (API path)', pageErrorsA.length === 0, pageErrorsA.join(' | '));
    await pageA.close();

    /* --- Test A2: article page deep link resolves API story by legacyId --- */
    console.log('A2) Article page deep link (API data)');
    const pageA2 = await browser.newPage();
    const pageErrorsA2 = [];
    pageA2.on('pageerror', (e) => pageErrorsA2.push(String(e)));
    await pageA2.addInitScript((port) => {
      window.LAKE_NEWS_API_URL = `http://localhost:${port}`;
    }, PORT);
    await pageA2.goto(`http://localhost:${PORT}/news-article.html?id=501`, { waitUntil: 'networkidle' });
    await pageA2.waitForSelector('.news-article-title', { timeout: 10000 });

    const articleState = await pageA2.evaluate(() => ({
      title: document.querySelector('.news-article-title')?.textContent?.trim() || '',
      notFound: document.querySelector('.news-article-empty') ? true : false,
    }));
    check(
      'article rendered from API (not "not found")',
      articleState.title === 'API Story One — Mock' && !articleState.notFound,
      JSON.stringify(articleState)
    );
    check('no page errors (article page)', pageErrorsA2.length === 0, pageErrorsA2.join(' | '));
    await pageA2.close();

    /* --- Test B: bundled fallback path --- */
    console.log('B) Bundled fallback path');
    const pageB = await browser.newPage();
    const pageErrorsB = [];
    pageB.on('pageerror', (e) => pageErrorsB.push(String(e)));
    await pageB.goto(`http://localhost:${PORT}/news.html`, { waitUntil: 'networkidle' });
    await pageB.waitForSelector('.news-card', { timeout: 10000 });

    const bundleState = await pageB.evaluate(() => ({
      count: document.querySelectorAll('.news-card').length,
      featured: document.querySelector('.news-featured__title')?.textContent?.trim() || '',
      source: window.LAKE_NEWS ? window.LAKE_NEWS.length : 0,
    }));

    check('bundled cards rendered', bundleState.count > 0, `got ${bundleState.count}`);
    check(
      'bundled featured article rendered',
      bundleState.featured.length > 0 && bundleState.featured.includes('Lake Gas'),
      `got "${bundleState.featured}"`
    );
    check('bundled dataset intact', bundleState.source > 20, `got ${bundleState.source}`);
    check('no page errors (fallback path)', pageErrorsB.length === 0, pageErrorsB.join(' | '));
    await pageB.close();
  } finally {
    await browser.close();
    server.close();
  }

  if (failures) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log('\nAll news API wiring checks PASSED');
  process.exit(0);
})().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
