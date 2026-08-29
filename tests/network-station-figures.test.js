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

test('canonical metrics distinguish the Africa-wide network from fuel stations', () => {
  const seeds = read('backend/scripts/seed-metrics.js');

  assert.match(seeds, /key: 'stations',[\s\S]*?label: 'Fuel Stations',[\s\S]*?value: '154'/);
  assert.match(seeds, /key: 'network_locations',[\s\S]*?label: 'Across Africa',[\s\S]*?value: '250\+'/);
});

test('home uses the approved current figures without conflating their meanings', () => {
  const home = read('index.html');
  const translations = JSON.parse(read('assets/i18n-content.json'));

  assert.match(home, /data-metric-key="stations">154<\/span>/);
  assert.match(home, /data-metric-key="network_locations">250\+<\/span>/);
  assert.match(home, /data-i18n="stat\.acrossAfrica">Across Africa<\/span>/);
  assert.equal(translations.en['stat.acrossAfrica'], 'Across Africa');
  assert.match(translations.en['station_locator.6'], /^154 Fuel Stations$/);
});

test('current station-count surfaces use 154 and leave historic news milestones intact', () => {
  const currentSources = [
    'index.html',
    'our-story.html',
    'station-locator.html',
    'africa-network.html',
    'lake-oil.html',
    'lake-group-financial-dashboard.html',
    'lake-group-org-chart.html',
    'leadership-ally-edha-awadh.html',
    'assets/site.js',
    'scripts/_master_en.json',
    'assets/i18n-content.json',
    'scripts/build_assistant_kb.js',
    'assets/assistant-kb.js',
    'scripts/_verified_lake_facts.md',
    'backend/scripts/content-seed-data.js',
  ];

  for (const relative of currentSources) {
    const source = read(relative);
    assert.doesNotMatch(source, /152\+?\s+(?:retail\s+)?(?:fuel\s+)?stations?/i, relative);
    if (relative === 'our-story.html') {
      assert.match(source, /data-number="154"\s+data-metric-key="stations">154<\/div><div class="lbl"[^>]*>Fuel Stations/i, relative);
    } else if (relative === 'backend/scripts/content-seed-data.js') {
      assert.match(source, /of 154/i, relative);
    } else {
      assert.match(source, /154/, relative);
    }
  }

  const historicalNews = read('assets/news-data.js');
  assert.match(historicalNews, /2021[\s\S]*152 fuel stations|152 Retail Fuel Stations Milestone/i);
});

test('Home renders the separated Africa network and fuel-station figures without overflow', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const port = server.address().port;
    for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('[data-metric-key="stations"]')?.textContent.trim() === '154', null, { timeout: 5000 });
      await page.waitForFunction(() => document.querySelector('[data-metric-key="network_locations"]')?.textContent.trim() === '250+', null, { timeout: 5000 });
      const metrics = await page.locator('.hero-kf').allTextContents();
      assert.ok(metrics.some((value) => /154\s*Fuel Stations/i.test(value)), `missing 154 fuel stations at ${viewport.width}px`);
      assert.ok(metrics.some((value) => /250\+\s*Across Africa/i.test(value)), `missing Africa-wide 250+ figure at ${viewport.width}px`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `horizontal overflow at ${viewport.width}px: ${overflow}px`);
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
