import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'], ['.txt', 'text/plain; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'], ['.webp', 'image/webp'], ['.avif', 'image/avif'],
  ['.woff2', 'font/woff2'], ['.ico', 'image/x-icon'], ['.webmanifest', 'application/manifest+json'],
]);
const forbidden = /\/(?:api|admin|control)(?:\/|\?|$)|cms[^/]*release|content\/public/i;

const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
const pages = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+\/?([^<]*)<\/loc>/g)]
  .map((match) => match[1] || 'index.html')
  .map((value) => value.replace(/^\/+/, '') || 'index.html');

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://local').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`) || !fsSync.existsSync(file) || fsSync.statSync(file).isDirectory()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream' });
  fsSync.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const errors = [];
const forbiddenRequests = new Set();
const failedAssets = new Set();

try {
  for (const pageName of pages) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(`${pageName}: ${error.message}`));
    page.on('request', (request) => {
      if (forbidden.test(new URL(request.url()).pathname)) forbiddenRequests.add(request.url());
    });
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.hostname === '127.0.0.1' && response.status() >= 400) failedAssets.add(`${response.status()} ${url.pathname}`);
    });
    const response = await page.goto(`http://127.0.0.1:${server.address().port}/${pageName}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response || response.status() >= 400) failedAssets.add(`${response?.status() || 'ERR'} /${pageName}`);
    if (pageName === 'index.html') {
      await page.evaluate(() => document.querySelector('#hero-globe-root')?.scrollIntoView({ block: 'center' }));
      await page.waitForSelector('#hero-globe-root canvas', { timeout: 15000 });
      if (await page.locator('#hero-globe-root canvas').count() !== 1) errors.push('index.html: globe must use exactly one canvas');
    }
    await context.close();
  }

  for (const viewport of [{ width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if (overflow) errors.push(`index.html: horizontal overflow at ${viewport.width}px`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (errors.length || forbiddenRequests.size || failedAssets.size) {
  console.error(JSON.stringify({ errors, forbiddenRequests: [...forbiddenRequests], failedAssets: [...failedAssets] }, null, 2));
  process.exit(1);
}
console.log(`Static runtime passed: ${pages.length} sitemap pages, zero required asset 404s, zero backend/CMS requests, one Home globe canvas.`);
