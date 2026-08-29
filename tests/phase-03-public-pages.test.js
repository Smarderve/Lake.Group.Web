const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const evidence = path.join(root, 'docs', 'qa', 'phase-03-public-pages');
const pages = ['about.html', 'contact.html', 'gallery.html', 'history.html'];
let server;
let browser;

test.before(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  server = http.createServer((req, res) => {
    const requested = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, requested);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  for (const filename of pages) {
    test(`${viewport.name} ${filename} recovered layout`, async () => {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/${filename}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => !document.documentElement.classList.contains('lg-loading'), null, { timeout: 10000 });
      await page.waitForFunction(() => !document.querySelector('[data-lg-skeleton-overlay]'), null, { timeout: 10000 });
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        nav: !!document.querySelector('[data-phase01-navbar]'),
        footer: !!document.querySelector('.site-footer'),
        images: [...document.images].filter((img) => img.getAttribute('src') && img.complete && img.naturalWidth === 0).map((img) => img.src),
      }));
      assert.ok(state.overflow <= 1, `horizontal overflow: ${state.overflow}px`);
      assert.equal(state.nav, true);
      assert.equal(state.footer, true);
      assert.deepEqual(state.images, []);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: path.join(evidence, `${viewport.name}-${filename.replace('.html', '')}.png`), fullPage: false });
      await context.close();
    });
  }
}

test('Phase 03 content contract', () => {
  const about = fs.readFileSync(path.join(root, 'about.html'), 'utf8');
  const contact = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
  const gallery = fs.readFileSync(path.join(root, 'gallery.html'), 'utf8');
  const history = fs.readFileSync(path.join(root, 'history.html'), 'utf8');
  assert.match(about, /phase03-page/);
  assert.doesNotMatch(contact, /lake-group-placeholder\.png/);
  assert.match(contact, /Plots 72 &amp; 73, Vijibweni Area, Kigamboni/);
  assert.match(gallery, /gallery-archive[\s\S]*gal-slider/);
  assert.ok((history.match(/class="history-event/g) || []).length >= 14, 'all legitimate history events remain');
});
