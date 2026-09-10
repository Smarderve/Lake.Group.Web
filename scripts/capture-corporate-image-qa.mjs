import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outputDir = path.join(root, 'docs/qa/sitewide-image-remediation/phase-02-corporate');
const pages = ['about.html', 'history.html', 'leadership.html', 'leadership-ally-edha-awadh.html', 'csr.html', 'sustainability.html', 'careers.html', 'contact.html', 'gallery.html', 'media-center.html', 'our-story.html'];
const screenshotPages = new Set(['csr.html', 'gallery.html', 'our-story.html']);
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of [{ name: '1440', width: 1440, height: 1000 }, { name: '390', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
  for (const filename of pages) {
    const page = await context.newPage();
    const failures = [];
    page.on('requestfailed', (request) => failures.push({ url: request.url(), error: request.failure()?.errorText }));
    const response = await page.goto(`http://127.0.0.1:4173/${filename}`, { waitUntil: 'networkidle', timeout: 30000 });
    if (filename === 'our-story.html') {
      await page.locator('#start').click();
      await page.waitForTimeout(950);
      await page.locator('#stage').click();
      await page.waitForTimeout(120);
      await page.locator('#stage').click();
      await page.waitForTimeout(500);
    } else await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 320) {
        scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 70));
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      scrollTo(0, 0);
    });
    await page.waitForTimeout(250);
    const images = await page.evaluate(() => [...document.images].map((image) => ({
      src: new URL(image.currentSrc || image.src, location.href).pathname.replace(/^\//, ''), complete: image.complete,
      naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
      renderedWidth: Math.round(image.getBoundingClientRect().width), renderedHeight: Math.round(image.getBoundingClientRect().height),
    })).filter((image) => image.src.startsWith('assets/images/')));
    const broken = images.filter((image) => image.complete && (!image.naturalWidth || !image.naturalHeight));
    const remediated = images.filter((image) => image.src.includes('/delivery/corporate/remediated/'));
    if (screenshotPages.has(filename)) await page.screenshot({ path: path.join(outputDir, `${filename.replace('.html', '')}-${viewport.name}.png`), fullPage: true, animations: 'disabled' });
    results.push({ viewport: viewport.name, page: filename, status: response?.status(), failures, broken, remediated });
    await page.close();
  }
  await context.close();
}

await browser.close();
await fs.writeFile(path.join(outputDir, 'runtime.json'), `${JSON.stringify(results, null, 2)}\n`);
const summary = {
  renders: results.length,
  failedRequests: results.reduce((sum, result) => sum + result.failures.length, 0),
  brokenImages: results.reduce((sum, result) => sum + result.broken.length, 0),
  remediatedObservations: results.reduce((sum, result) => sum + result.remediated.length, 0),
};
console.log(JSON.stringify(summary, null, 2));
if (results.some((result) => result.status !== 200 || result.failures.length || result.broken.length)) process.exitCode = 1;
