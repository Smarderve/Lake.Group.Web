const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
let server;
let browser;
let baseUrl;

test.before(async () => {
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': path.extname(file) === '.js' ? 'text/javascript' : path.extname(file) === '.css' ? 'text/css' : path.extname(file) === '.json' ? 'application/json' : 'text/html' }).end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('stale keyed translations do not replace changed About copy while current matching keys translate', async () => {
  const page = await browser.newPage({ serviceWorkers: 'block' });
  await page.route('**/about.html*', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({ response, body: html.replace('What Powers Our Journey', 'Updated Journey Heading') });
  });
  await page.goto(`${baseUrl}/about.html?lake-i18n-preview=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'en');
  const currentCopy = await page.locator('[data-i18n="about.22"]').textContent();
  assert.equal(currentCopy, 'Updated Journey Heading');

  await page.locator('.lang-trigger').first().click();
  await page.locator('.lang-menu [data-lang="fr"]').first().click();
  await page.waitForFunction(() => window.LakeI18n?.current === 'fr');
  assert.equal(await page.locator('[data-i18n="about.22"]').textContent(), 'Updated Journey Heading', 'changed English source remains intact when its stale dictionary entry is skipped');
  assert.match(await page.locator('[data-i18n="about.6"]').textContent(), /D'une simple/, 'a matching source key still receives its language translation');
  const category = await page.evaluate(() => ({ html: document.querySelector('#mm-tab-energies')?.innerHTML, nodes: [...document.querySelector('#mm-tab-energies')?.childNodes || []].map((node) => ({ type: node.nodeType, text: node.nodeValue })) }));
  assert.equal((await page.locator('#mm-tab-energies').textContent()).trim(), 'Secteur énergétique', `generated page draft translates this About page navigation item (${JSON.stringify(category)})`);

  await page.locator('.lang-trigger').first().click();
  await page.locator('.lang-menu [data-lang="en"]').first().click();
  await page.waitForFunction(() => window.LakeI18n?.current === 'en');
  assert.equal(await page.locator('[data-i18n="about.22"]').textContent(), 'Updated Journey Heading', 'switching back preserves the current source copy');
  await page.close();
});
