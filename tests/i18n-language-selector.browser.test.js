const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = new Map([
  ['.css', 'text/css'], ['.html', 'text/html'], ['.js', 'text/javascript'],
  ['.json', 'application/json'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
]);

let server;
let browser;
let baseUrl;

test.before(async () => {
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': mime.get(path.extname(file)) || 'application/octet-stream' });
      res.end(data);
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

test('desktop selector exposes eight locales and marks seven pending', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('.lang-trigger');
  await trigger.waitFor({ state: 'visible' });
  await trigger.click();
  const options = page.locator('.lang-menu .lang-btn');
  await assert.equal(await options.count(), 8);
  assert.equal(await options.filter({ hasText: 'English' }).isEnabled(), true);
  for (const label of ['Kiswahili', 'हिन्दी', 'العربية', '简体中文', 'Français', 'Español', 'Português']) {
    const option = options.filter({ hasText: label });
    assert.equal(await option.count(), 1, `${label} is present once`);
    assert.equal(await option.isDisabled(), true, `${label} stays unavailable pending translation validation`);
  }
  await page.close();
});

test('desktop selector opens from the keyboard and marks the current choice', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('.lang-trigger').first();
  await trigger.focus();
  await trigger.press('Enter');
  await page.locator('.lang-menu').first().waitFor({ state: 'visible' });
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('.lang-menu .lang-btn[aria-current="true"]').textContent(), 'English');
  await page.close();
});

test('mobile selector opens, preserves selected English on reload, and fits the viewport', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#nav-toggle').click();
  const trigger = page.locator('.mob-language-trigger');
  await trigger.waitFor({ state: 'visible' });
  await trigger.click();
  const panel = page.locator('#mob-language-panel');
  await panel.waitFor({ state: 'visible' });
  assert.equal(await panel.locator('.mob-language-option').count(), 8);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile layout has no horizontal overflow');
  await panel.locator('[data-lang="en"]').click();
  await page.waitForFunction(() => localStorage.getItem('lake-lang') === 'en');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'en');
  assert.equal(await page.evaluate(() => localStorage.getItem('lake-lang')), 'en');
  await context.close();
});
