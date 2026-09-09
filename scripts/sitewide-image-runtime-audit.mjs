import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const inventoryFile = path.join(root, 'docs', 'reports', 'sitewide-image-inventory-20260909.json');
const inventory = JSON.parse(await fs.readFile(inventoryFile, 'utf8'));
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, requested);
  if (!file.startsWith(root) || !fsSync.existsSync(file) || fsSync.statSync(file).isDirectory()) {
    response.writeHead(404); response.end(); return;
  }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fsSync.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(4174, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];
for (const viewport of [{ name: 'desktop-1440', width: 1440, height: 1000 }, { name: 'mobile-390', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  for (const pageRecord of inventory.pages) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      const response = await page.goto(`http://127.0.0.1:4174/${pageRecord.page}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(350);
      const rendered = await page.evaluate(() => {
        const clean = (url) => {
          try { const parsed = new URL(url, location.href); return decodeURI(parsed.pathname).replace(/^\//, ''); } catch { return url; }
        };
        const images = [...document.images].map((img) => {
          const rect = img.getBoundingClientRect();
          return {
            kind: 'img', asset: clean(img.currentSrc || img.src), alt: img.alt || '', loading: img.loading || '',
            naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
            renderedWidth: Math.round(rect.width), renderedHeight: Math.round(rect.height),
            visible: rect.width > 0 && rect.height > 0 && getComputedStyle(img).visibility !== 'hidden' && getComputedStyle(img).display !== 'none',
          };
        }).filter((item) => item.asset.startsWith('assets/images/'));
        const backgrounds = [];
        for (const element of document.querySelectorAll('body *')) {
          const value = getComputedStyle(element).backgroundImage;
          if (!value || value === 'none') continue;
          for (const match of value.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
            const rect = element.getBoundingClientRect();
            const asset = clean(match[1]);
            if (!asset.startsWith('assets/images/')) continue;
            backgrounds.push({ kind: 'background', asset, renderedWidth: Math.round(rect.width), renderedHeight: Math.round(rect.height), visible: rect.width > 0 && rect.height > 0 });
          }
        }
        return [...images, ...backgrounds];
      });
      const broken = rendered.filter((item) => item.kind === 'img' && (!item.naturalWidth || !item.naturalHeight));
      results.push({ viewport: viewport.name, page: pageRecord.page, protected: pageRecord.protected, status: response?.status() || null, rendered, broken, pageErrors: errors });
      if (!response?.ok() || broken.length || errors.length) failures.push({ viewport: viewport.name, page: pageRecord.page, status: response?.status(), broken, pageErrors: errors });
    } catch (error) {
      failures.push({ viewport: viewport.name, page: pageRecord.page, reason: error.message });
    }
    await page.close();
  }
  await context.close();
}
await browser.close();
await new Promise((resolve) => server.close(resolve));

const byAsset = {};
for (const result of results) for (const item of result.rendered) {
  if (!byAsset[item.asset]) byAsset[item.asset] = [];
  byAsset[item.asset].push({ page: result.page, viewport: result.viewport, kind: item.kind, renderedWidth: item.renderedWidth, renderedHeight: item.renderedHeight, visible: item.visible, naturalWidth: item.naturalWidth, naturalHeight: item.naturalHeight });
}
const output = { generatedAt: new Date().toISOString(), pages: inventory.pages.length, renders: results.length, failures, byAsset, results };
await fs.writeFile(path.join(root, 'docs', 'reports', 'sitewide-image-runtime-20260909.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ pages: output.pages, renders: output.renders, assetsObserved: Object.keys(byAsset).length, failures: failures.length, brokenImages: failures.reduce((n, item) => n + (item.broken?.length || 0), 0) }, null, 2));
if (failures.length) process.exitCode = 1;
