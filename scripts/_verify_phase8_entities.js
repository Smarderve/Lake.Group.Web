/**
 * Phase 8 · Tasks 8.2–8.11 verification — entity hydration + news/map retargets.
 *
 * Serves the repository release and a deliberately disposable live API, then
 * verifies that public business content comes from the immutable same-origin
 * snapshot. The outage case uses a brand-new browser context with service
 * workers blocked, proving that no previous browser cache is required.
 *
 * Usage:  node scripts/_verify_phase8_entities.js
 * Exit 0 on success, 1 on failure.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveStatic } = require('./_safe_static.js');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.join(__dirname, '..');
const PORT = 8798;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

let server;
let apiUp = true;
let apiRequests = 0;
function setApiUp(up) { apiUp = up; }

async function buildStub() {
  const { CONTENT_SEED } = await import(
    'file:///' + path.join(ROOT, 'backend', 'scripts', 'content-seed-data.js').replace(/\\/g, '/')
  );
  const co = CONTENT_SEED.companies[0];
  const ld = CONTENT_SEED.leadership[0];
  const pr = CONTENT_SEED.projects[0];
  const he = CONTENT_SEED.historyEvents[0];
  const csr = CONTENT_SEED.csrEntries[0];
  const cl = CONTENT_SEED.careerListings[0];
  const st = CONTENT_SEED.facilities[0];
  const md = { url: 'assets/images/n-slider/1.jpg', caption: 'Field Operations across East Africa', tags: ['operations'] };
  return {
    companies: [{ slug: co.slug, name: co.name, description: co.description, logo: co.logo }],
    leadership: [{ name: ld.name, position: ld.position, bio: ld.bio, photo: ld.photo }],
    projects: [{ title: pr.title, description: pr.description }],
    'history-events': [{ title: he.title, description: he.description }],
    media: [md],
    'csr-entries': [{ title: csr.title, description: csr.description }],
    'career-listings': [{ jobTitle: cl.jobTitle, description: cl.description }],
    facilities: [{ name: st.name, address: 'Dar es Salaam', meta: st.meta }],
    news: [
      {
        id: 'n-1',
        title: 'Lake Gas Captures Slice of Kenya Cooking Gas Import Market',
        publicationDate: '2026-02-15T00:00:00.000Z',
        category: 'Expansion',
        bannerImage: 'assets/images/lakegas/ops/cylinders-yard.jpg',
        body: 'Paragraph one.\n\nParagraph two.',
      },
      {
        id: 'n-2',
        title: 'Lake Group Commissions $60M LPG Terminal in Vipingo, Kenya',
        publicationDate: '2026-01-20T00:00:00.000Z',
        category: 'Expansion',
        bannerImage: 'assets/images/lakegas/ops/cylinders-yard.jpg',
        body: 'Body text.',
      },
    ],
    map: {
      categories: CONTENT_SEED.mapCategories.map((m) => ({ id: 'mc-' + m.slug, slug: m.slug, name: m.name, color: m.color })),
      countries: CONTENT_SEED.countries.slice(0, 2).map((c) => ({
        id: 'c-' + c.isoCode, name: c.name, isoCode: c.isoCode, regionGrouping: c.regionGrouping,
        regions: CONTENT_SEED.regions.filter((r) => r.countryIso === c.isoCode).map((r) => ({
          id: 'r-' + r.key, name: r.name,
          locations: CONTENT_SEED.locations.filter((l) => l.regionKey === r.key).map((l) => ({
            id: 'l-' + l.key, name: l.name, type: l.type, latitude: l.latitude, longitude: l.longitude,
            facilities: CONTENT_SEED.facilities
              .filter((f) => f.locationKey === l.key)
              .map((f) => ({
                id: 'f-' + f.key, name: f.name, category: f.category,
                mapCategoryId: 'mc-' + f.mapCategorySlug, markerLabel: f.markerLabel,
                latitude: Number(f.coordinates.split(',')[0]), longitude: Number(f.coordinates.split(',')[1]),
              })),
          })),
        })),
      })),
    },
  };
}

function startServer(stub) {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const apiRes = (status, body) => {
        res.writeHead(status, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (url.pathname.startsWith('/api/public/')) {
        if (req.method === 'GET') apiRequests += 1;
        if (!apiUp) return apiRes(503, { error: { code: 'SERVICE_UNAVAILABLE' } });
        if (url.pathname === '/api/public/map') return apiRes(200, stub.map);
        const entity = url.pathname.slice('/api/public/'.length);
        if (stub[entity] !== undefined) return apiRes(200, { [entity]: stub[entity] });
        return apiRes(404, { error: { code: 'NOT_FOUND' } });
      }
      const filePath = resolveStatic(ROOT, url.pathname === '/' ? '/index.html' : url.pathname);
      if (!filePath) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve());
  });
}

function stopServer() {
  return new Promise((resolve) => server.close(resolve));
}

/* Page → [{ url, rowKey (null = first row), field, expected(stub) }].
   Keys with special characters are avoided by asserting the container's
   first row — the stub's first record mirrors the page's first row. */
const CASES = [
  ['services.html', null, 'description', (s) => s.companies[0].description],
  ['leadership.html', null, 'name', (s) => s.leadership[0].name],
  ['projects.html', null, 'title', (s) => s.projects[0].title],
  ['history.html', null, 'title', (s) => s['history-events'][0].title],
  ['contact.html', 'lake-oil', 'name', (s) => s.companies[0].name],
  ['gallery.html', 'assets/images/n-slider/1.jpg', 'caption', (s) => s.media[0].caption],
  ['csr.html', null, 'title', (s) => s['csr-entries'][0].title],
  ['careers.html', null, 'jobTitle', (s) => s['career-listings'][0].jobTitle],
  ['station-locator.html', null, 'name', (s) => s.facilities[0].name],
];

async function main() {
  const stub = await buildStub();
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public-content', 'current.json'), 'utf8'));
  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'public-content', manifest.snapshotUrl), 'utf8'));
  await startServer(stub);
  const launchOptions = { headless: true, args: ['--no-sandbox'] };
  if (fs.existsSync(CHROME)) launchOptions.executablePath = CHROME;
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(() => {
    window.LAKE_API_BASE = 'http://127.0.0.1:8798';
  });
  await context.addInitScript(() => {
    const mq = window.matchMedia.bind(window);
    window.matchMedia = (q) => {
      const m = mq(q);
      if (String(q).toLowerCase().includes('prefers-reduced-motion')) {
        return { matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {} };
      }
      return m;
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('response', (res) => { if (res.status() >= 400 && !res.url().includes('/api/public/')) errors.push('HTTP ' + res.status() + ' ' + res.url()); });

  let fail = 0;
  try {
    for (const [pageFile, rowKey, field, expectFn] of CASES) {
      await page.goto(`http://127.0.0.1:${PORT}/${pageFile}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      const actual = await page.evaluate(({ rowKey, field }) => {
        const row = rowKey
          ? document.querySelector('[data-entity-key="' + rowKey + '"]')
          : document.querySelector('[data-hydrate] [data-entity-key]');
        if (!row) return null;
        const el = field === 'caption' ? row.querySelector('.gallery-tile__text') : row.querySelector('[data-entity-field="' + field + '"]');
        return el ? el.textContent.trim() : null;
      }, { rowKey, field });
      const expected = expectFn(stub);
      const ok = actual === expected;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${pageFile} [${field}] served="${actual}" expected="${expected}"`);
      if (!ok) fail = 1;
    }

    /* News retarget: LAKE_NEWS must come from the immutable release. */
    await page.goto(`http://127.0.0.1:${PORT}/news.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    const newsState = await page.evaluate(() => ({
      count: (window.LAKE_NEWS || []).length,
      first: window.LAKE_NEWS && window.LAKE_NEWS[0] ? window.LAKE_NEWS[0].title : null,
      date: window.LAKE_NEWS && window.LAKE_NEWS[0] ? window.LAKE_NEWS[0].date : null,
    }));
    const expectedNews = snapshot.entities.news.slice().sort((a, b) =>
      new Date(b.publicationDate || b.date || 0) - new Date(a.publicationDate || a.date || 0));
    const newsOk = newsState.count === expectedNews.length && newsState.first === expectedNews[0].title;
    console.log(`${newsOk ? 'PASS' : 'FAIL'} news.html LAKE_NEWS from release (count=${newsState.count}, first="${newsState.first}", date="${newsState.date}")`);
    if (!newsOk) fail = 1;

    /* Map retarget: markers built from the release map. */
    await page.goto(`http://127.0.0.1:${PORT}/africa-network.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    const mapState = await page.evaluate(() => ({
      assets: (window.__LAKE_MAP_ASSETS__ || []).length,
      routes: window.LakeAfricaMap ? window.LakeAfricaMap.routeCount() : 0,
      first: window.__LAKE_MAP_ASSETS__ && window.__LAKE_MAP_ASSETS__[0]
        ? { name: window.__LAKE_MAP_ASSETS__[0].name, country: window.__LAKE_MAP_ASSETS__[0].country } : null,
    }));
    const mapOk = mapState.assets >= 5 && mapState.routes === 3 && mapState.first && mapState.first.country === 'tz';
    console.log(`${mapOk ? 'PASS' : 'FAIL'} africa-network map assets/routes from release (assets=${mapState.assets}, routes=${mapState.routes}, first=${JSON.stringify(mapState.first)})`);
    if (!mapOk) fail = 1;

    /* Backend down + brand-new browser → current release still loads. */
    setApiUp(false);
    const outageContext = await browser.newContext({ serviceWorkers: 'block' });
    const outagePage = await outageContext.newPage();
    await outagePage.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'domcontentloaded' });
    await outagePage.waitForTimeout(900);
    const outageState = await outagePage.evaluate(() => {
      const row = document.querySelector('[data-entity-key="lake-oil"]');
      const el = row && row.querySelector('[data-entity-field="description"]');
      return {
        text: el ? el.textContent.trim() : null,
        releaseId: window.LakePublicContent ? window.LakePublicContent.releaseId() : null,
      };
    });
    await outageContext.close();
    const fallbackOk = outageState.text === snapshot.entities.companies.find((row) => row.slug === 'lake-oil').description &&
      outageState.releaseId === manifest.releaseId;
    console.log(`${fallbackOk ? 'PASS' : 'FAIL'} clean-browser outage: release ${outageState.releaseId || 'missing'} served`);
    if (!fallbackOk) fail = 1;
    const deliveryIndependent = apiRequests === 0;
    console.log(`${deliveryIndependent ? 'PASS' : 'FAIL'} public content made ${apiRequests} live API requests`);
    if (!deliveryIndependent) fail = 1;
  } catch (e) {
    console.log('FATAL:', e.message);
    fail = 1;
  } finally {
    if (errors.length) {
      console.log('Console errors observed:');
      errors.slice(0, 8).forEach((e) => console.log('  ' + e));
    }
    await browser.close();
    await stopServer();
  }
  console.log(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(fail);
}

main();
