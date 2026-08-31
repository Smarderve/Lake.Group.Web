'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const test = require('node:test');
const { chromium } = require('playwright');
const { resolveStatic } = require('../scripts/_safe_static.js');

const ROOT = path.join(__dirname, '..');
const PORT = 4181;
const URL = `http://127.0.0.1:${PORT}/index.html`;

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const requestPath = (req.url || '/').split('?')[0];
      const filePath = resolveStatic(ROOT, requestPath === '/' ? '/index.html' : requestPath);
      if (!filePath) return res.writeHead(403).end('Forbidden');
      fs.readFile(filePath, (error, data) => {
        if (error) return res.writeHead(404).end('Not found');
        res.writeHead(200).end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

test('a minor pointer drift on a marquee logo remains a company-page click', async (t) => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#hero-logo-loop .logoloop').waitFor();
  await page.locator('#hero-logo-loop .logoloop').scrollIntoViewIfNeeded();

  const target = await page.evaluate(() => {
    const link = document.querySelector('#hero-logo-loop .logoloop__list a[href="lake-oil.html"]');
    const rect = link.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });

  const navigation = page.waitForURL('**/lake-oil.html', { timeout: 3000 });
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.mouse.move(target.x + 2, target.y);
  await page.mouse.up();
  await navigation;
  assert.match(page.url(), /\/lake-oil\.html$/);
  assert.deepStrictEqual(pageErrors, [], 'the click navigation must not raise page errors');
});

test('both marquee sequences expose the same complete set of reachable company links', async (t) => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#hero-logo-loop .logoloop').waitFor();

  const sequences = await page.evaluate(() => [...document.querySelectorAll('#hero-logo-loop .logoloop__list')]
    .map((list) => [...list.querySelectorAll('.logoloop__link')].map((link) => ({
      href: link.getAttribute('href'),
      label: link.getAttribute('aria-label'),
      pointerEvents: getComputedStyle(link).pointerEvents,
    }))));

  assert.strictEqual(sequences.length, 2, 'the seamless duplicate track must contain two sequences');
  assert.strictEqual(sequences[0].length, 17, 'the primary sequence must contain every approved company');
  assert.deepStrictEqual(sequences[1], sequences[0], 'the duplicate sequence must retain the same interactive links');
  for (const link of sequences[0]) {
    assert.match(link.href, /^[a-z0-9-]+\.html$/, `${link.label}: uses a real internal route`);
    assert.match(link.label, /^Visit .+/, `${link.href}: provides an accessible company label`);
    assert.strictEqual(link.pointerEvents, 'auto', `${link.href}: remains pointer-interactive`);
    assert.ok(fs.existsSync(path.join(ROOT, link.href)), `${link.href}: target company page exists`);
  }
});
