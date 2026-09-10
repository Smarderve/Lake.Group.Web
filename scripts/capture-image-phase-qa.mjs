import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const [phase, ...pages] = process.argv.slice(2);
if (!phase || !pages.length || !/^phase-[a-z0-9-]+$/.test(phase) || pages.some((page) => !/^[a-z0-9-]+\.html$/.test(page))) {
  throw new Error('Usage: node scripts/capture-image-phase-qa.mjs phase-name page.html [page.html ...]');
}
const outputDir = path.join(root, 'docs/qa/sitewide-image-remediation', phase);
await fs.mkdir(outputDir, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  const requested = decodeURIComponent((request.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, requested);
  if (!file.startsWith(root) || !fsSync.existsSync(file) || fsSync.statSync(file).isDirectory()) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fsSync.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(4175, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const results = [];
for (const viewport of [{ name: '1440', width: 1440, height: 1000 }, { name: '390', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
  for (const filename of pages) {
    const page = await context.newPage();
    const failures = [];
    page.on('requestfailed', (request) => failures.push({ url: request.url(), error: request.failure()?.errorText }));
    const response = await page.goto(`http://127.0.0.1:4175/${filename}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 320) {
        scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 65));
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      scrollTo(0, 0);
    });
    await page.waitForTimeout(250);
    const images = await page.evaluate(() => [...document.images].map((image) => ({
      src: new URL(image.currentSrc || image.src, location.href).pathname.replace(/^\//, ''), complete: image.complete,
      naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
    })).filter((image) => image.src.startsWith('assets/images/')));
    const broken = images.filter((image) => image.complete && (!image.naturalWidth || !image.naturalHeight));
    await page.screenshot({ path: path.join(outputDir, `${filename.replace('.html', '')}-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
    results.push({ viewport: viewport.name, page: filename, status: response?.status(), failures, broken, images });
    await page.close();
  }
  await context.close();
}
await browser.close();
await new Promise((resolve) => server.close(resolve));
await fs.writeFile(path.join(outputDir, 'runtime.json'), `${JSON.stringify(results, null, 2)}\n`);
const summary = { phase, pages: pages.length, renders: results.length, failedRequests: results.reduce((sum, result) => sum + result.failures.length, 0), brokenImages: results.reduce((sum, result) => sum + result.broken.length, 0) };
console.log(JSON.stringify(summary, null, 2));
if (results.some((result) => result.status !== 200 || result.failures.length || result.broken.length)) process.exitCode = 1;
