import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outputDir = path.join(root, 'docs/qa/sitewide-image-remediation/phase-01-home');
await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of [{ name: 'home-1440', width: 1440, height: 1000 }, { name: 'home-390', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const failures = [];
  const consoleErrors = [];
  page.on('requestfailed', (request) => failures.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  const response = await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 240) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
    scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
  const actionSlides = [];
  for (let index = 0; index < 17; index += 1) {
    const active = page.locator('.action-tile.is-active img');
    if (await active.count()) {
      await active.first().waitFor({ state: 'attached' });
      await active.first().evaluate((image) => image.decode().catch(() => {}));
      actionSlides.push(await active.first().evaluate((image) => ({ src: new URL(image.currentSrc || image.src, location.href).pathname.replace(/^\//, ''), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })));
    }
    await page.locator('[data-action-next]').click();
    await page.waitForTimeout(90);
  }
  const imageState = await page.evaluate(() => [...document.images].map((image) => ({
    src: new URL(image.currentSrc || image.src, location.href).pathname.replace(/^\//, ''),
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    renderedWidth: Math.round(image.getBoundingClientRect().width),
    renderedHeight: Math.round(image.getBoundingClientRect().height), complete: image.complete,
  })).filter((item) => item.src.startsWith('assets/images/')));
  const broken = imageState.filter((item) => item.complete && (item.naturalWidth === 0 || item.naturalHeight === 0));
  const remediated = imageState.filter((item) => item.src.includes('/delivery/home/remediated/'));
  await page.screenshot({ path: path.join(outputDir, `${viewport.name}.png`), fullPage: true, animations: 'disabled' });
  results.push({ viewport: viewport.name, status: response?.status(), failures, consoleErrors, broken, remediated, actionSlides });
  await context.close();
}

await browser.close();
await fs.writeFile(path.join(outputDir, 'runtime.json'), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results.map((result) => ({
  viewport: result.viewport,
  status: result.status,
  failedRequests: result.failures.length,
  consoleErrors: result.consoleErrors.length,
  brokenImages: result.broken.length,
  remediatedImagesObserved: result.remediated.length,
  actionSlidesVerified: result.actionSlides.filter((slide) => slide.naturalWidth > 0).length,
})), null, 2));
if (results.some((result) => result.status !== 200 || result.failures.length || result.broken.length)) process.exitCode = 1;
