#!/usr/bin/env node
import http from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { CMS_V2_PAGE_DEFINITIONS } from '../backend/src/lib/cms-v2-content.js';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
const routes = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
  const pathname = new URL(match[1]).pathname;
  return pathname === '/' ? 'index.html' : pathname.slice(1);
}));
const pages = CMS_V2_PAGE_DEFINITIONS.filter((page) => routes.has(page.route));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    const candidate = resolve(root, pathname === '/' ? 'index.html' : pathname.slice(1));
    if (!candidate.startsWith(root + sep) && candidate !== root) throw new Error('outside root');
    const info = await stat(candidate);
    const file = info.isDirectory() ? resolve(candidate, 'index.html') : candidate;
    response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  const page = await browser.newPage();
  await page.route('**/*', (route) => route.request().url().startsWith(`http://127.0.0.1:${port}/`) ? route.continue() : route.abort());
  await page.route(/\.(?:png|jpe?g|webp|gif|avif|mp4|webm|woff2?|ttf)(?:\?.*)?$/i, (route) => route.abort());
  for (const definition of pages) {
    const checks = {};
    const errors = [];
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      try {
        const response = await page.goto(`http://127.0.0.1:${port}/${definition.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        checks[viewport.name] = await page.evaluate(() => ({
          title: document.title.trim(),
          text: document.body.innerText.trim().length,
          cmsScripts: document.querySelectorAll('script[src*="cms-content-v2"]').length,
          nav: Boolean(document.querySelector('nav,.navbar,.site-nav,header')),
          footer: Boolean(document.querySelector('footer,.site-footer')),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        checks[viewport.name].http = response?.status() ?? 0;
      } catch (cause) { errors.push(`${viewport.name}: ${cause.message}`); }
    }
    const ok = Object.values(checks).length === 2 && Object.values(checks).every((check) => check.http === 200 && check.title && check.text > 100 && check.cmsScripts === 0 && check.nav) && errors.length === 0;
    results.push({ key: definition.key, route: definition.route, ok, checks, errors });
  }
  await page.close();
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}

await mkdir(resolve(root, 'docs/reports'), { recursive: true });
await writeFile(resolve(root, 'docs/reports/cms-v2-launch-smoke.json'), JSON.stringify({ generatedAt: new Date().toISOString(), viewports: [390, 1440], passed: results.filter((result) => result.ok).length, total: results.length, pages: results }, null, 2) + '\n');
console.log(`CMS V2 static public smoke: ${results.filter((result) => result.ok).length}/${results.length} active pages passed at 390 and 1440.`);
for (const result of results.filter((result) => !result.ok)) console.log(`FAIL ${result.route}: ${result.errors.join('; ') || JSON.stringify(result.checks)}`);
if (results.some((result) => !result.ok)) process.exitCode = 1;
