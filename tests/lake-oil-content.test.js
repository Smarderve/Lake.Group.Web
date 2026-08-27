const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const pageHtml = () => fs.readFileSync(path.join(ROOT, 'lake-oil.html'), 'utf8');

test('Lake Oil page contains the approved company write-up and DRC entities', () => {
  const html = pageHtml();
  const required = [
    'flagship company of Lake Group',
    'established in 2006',
    '154 retail stations in Tanzania',
    '8 retail stations',
    '25 retail stations',
    '66 petrol stations',
    '4 Autogas stations',
    'Lake Oil LDA',
    'FRONTIER ENERGY SARL',
    'SUN FUEL SARL',
    'high-volume fuel sourcing',
    'bulk inventory management',
    'cross-border customs coordination',
    'Mission',
    'Vision',
    'QUALITY',
    'SERVICE',
    'SAFETY',
    'PROFESSIONALISM',
  ];
  for (const text of required) assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i'));

  for (const stale of [
    'The Flagship of Lake Group',
    '152 across Tanzania and the region',
    "Tanzania's top 5",
    'Burundi Petroleum Ltd.',
    'DRC Petroleum Ltd.',
    'Wadi Elsundus Petroleum',
    'Marine Bunkering',
    'leading regional convenience retailer',
  ]) assert.doesNotMatch(html, new RegExp(stale.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i'));
});

test('Lake Oil approved content is rendered on desktop and mobile', async (t) => {
  const server = http.createServer((req, res) => {
    const requested = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = path.join(ROOT, requested === '/' ? 'lake-oil.html' : requested.replace(/^\//, ''));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
      res.writeHead(404); res.end(); return;
    }
    const contentType = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'image/*';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${port}/lake-oil.html`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    assert.match(body, /FRONTIER ENERGY SARL/);
    assert.match(body, /SUN FUEL SARL/);
    assert.match(body, /154 retail stations in Tanzania/i);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    await page.close();
  }
});
