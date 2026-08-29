const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function startServer() {
  const server = http.createServer((request, response) => {
    const requested = decodeURIComponent((request.url || '/').split('?')[0]);
    const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
    const file = path.join(root, relative);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404); response.end('not found'); return;
    }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('canonical metrics use 250+ fuel stations and no longer show Across Africa stat', () => {
  const seeds = read('backend/scripts/seed-metrics.js');

  assert.match(seeds, /key: 'stations',[\s\S]*?label: 'Fuel Stations',[\s\S]*?value: '250\+'/);
  // The network_locations / Across Africa stat card has been removed
  assert.doesNotMatch(seeds, /key: 'network_locations'/);
});

test('home uses 250+ fuel stations and no longer shows Across Africa stat card', () => {
  const home = read('index.html');

  assert.match(home, /data-metric-key="stations">250\+<\/span>/);
  // The Across Africa stat card has been removed
  assert.doesNotMatch(home, /data-metric-key="network_locations"/);
  assert.doesNotMatch(home, /data-i18n="stat\.acrossAfrica"/);
});

test('no legacy 154 fuel station references remain in current public surfaces', () => {
  const currentSources = [
    'index.html',
    'lake-oil.html',
    'station-locator.html',
    'africa-network.html',
    'leadership-ally-edha-awadh.html',
    'assets/site.js',
    'assets/news-data.js',
  ];

  for (const relative of currentSources) {
    const source = read(relative);
    assert.doesNotMatch(source, /154\s*Fuel Stations/i, `${relative} still contains stale 154 fuel stations`);
    assert.doesNotMatch(source, /154 fuel stations/i, `${relative} still contains stale 154 fuel stations`);
    assert.doesNotMatch(source, /A retail network of 154/i, `${relative} still contains stale 154 retail network`);
    assert.doesNotMatch(source, /Showing 5 of 154/i, `${relative} still contains stale 154 stations count`);
  }
});

test('Home presents 250+ fuel stations without overflow', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const port = server.address().port;
    for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('[data-metric-key="stations"]')?.textContent.trim() === '250+', null, { timeout: 5000 });
      const metrics = await page.locator('.hero-kf').allTextContents();
      assert.ok(metrics.some((value) => /250\+\s*Fuel Stations/i.test(value)), `missing 250+ fuel stations at ${viewport.width}px`);
      // Across Africa stat card should not be present
      assert.ok(!metrics.some((value) => /Across Africa/i.test(value)), `Across Africa stat should not appear at ${viewport.width}px`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `horizontal overflow at ${viewport.width}px: ${overflow}px`);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
