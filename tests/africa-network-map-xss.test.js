const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const RELEASE_PATH = path.join(
  ROOT,
  'public-content',
  'releases',
  'ef80b28117e92a9d2d70',
  'content.json',
);

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const relative = pathname === '/' ? 'africa-network.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(ROOT, relative);
    if (!filePath.startsWith(ROOT + path.sep) || !fs.existsSync(filePath)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('published map popup fields render as text and cannot execute stored HTML', async (t) => {
  const snapshot = JSON.parse(fs.readFileSync(RELEASE_PATH, 'utf8'));
  snapshot.releaseId = 'xss-regression';
  const attack = '<img src=x onerror="window.__popupXss=(window.__popupXss||0)+1">Legitimate & text';
  const routes = snapshot.entities['content-blocks'].find(
    (block) => block.key === 'operations-map-routes',
  ).content.routes;
  routes.splice(0, routes.length, {
    name: attack,
    desc: attack,
    coords: [[-6.8, 39.2], [-6.7, 39.3]],
    color: '#123456',
    weight: 8,
  });
  const facility = snapshot.map.countries
    .flatMap((country) => country.regions || [])
    .flatMap((region) => region.locations || [])
    .flatMap((location) => location.facilities || [])[0];
  const location = snapshot.map.countries
    .flatMap((country) => country.regions || [])
    .flatMap((region) => region.locations || [])
    .find((row) => (row.facilities || []).some((rowFacility) => rowFacility.id === facility.id));
  facility.name = attack;
  facility.markerLabel = attack;
  location.name = attack;

  const server = await startStaticServer();
  const address = server.address();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });
  const page = await browser.newPage();
  await page.route('**/public-content/current.json', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      releaseId: snapshot.releaseId,
      snapshotUrl: 'releases/xss-regression/content.json',
    }),
  }));
  await page.route('**/public-content/releases/xss-regression/content.json', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(snapshot),
  }));
  await page.route(/(?:arcgisonline|openstreetmap|opentopomap)\.org/, (route) => route.abort());
  await page.goto(`http://127.0.0.1:${address.port}/africa-network.html`);
  await page.waitForFunction(() => window.LakeAfricaMap?.routeCount() === 1);
  await page.waitForSelector('path.leaflet-interactive[fill-opacity="1"]');

  await page.locator('path.leaflet-interactive[fill-opacity="1"]').first().click({ force: true });
  const assetPopup = page.locator('.leaflet-popup-content');
  await assert.doesNotReject(() => assetPopup.waitFor());
  assert.match(await assetPopup.textContent(), /Legitimate & text/);
  assert.equal(await assetPopup.locator('img, script, iframe, svg').count(), 0);
  assert.equal(await page.evaluate(() => window.__popupXss || 0), 0);

  await page.locator('path.leaflet-interactive[stroke="#123456"]').click({ force: true });
  const pipelinePopup = page.locator('.leaflet-popup-content');
  assert.match(await pipelinePopup.textContent(), /Legitimate & text/);
  assert.equal(await pipelinePopup.locator('img, script, iframe, svg').count(), 0);
  assert.equal(await page.evaluate(() => window.__popupXss || 0), 0);
});
