import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const report = JSON.parse(await fs.readFile(path.join(root, 'docs/reports/media-processing-20260907.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'docs/reports/media-inventory-20260907.json'), 'utf8'));
const pages = new Set();
for (const item of [...report.changed, ...report.noEdit]) {
  const source = manifest.assets.find(asset => asset.path === item.original);
  for (const file of source?.pagesOrComponents || []) if (/\.html$/i.test(file) && !/^(agrinova-tech|atl|assembly-tech|nextdrive-motors)\.html$/i.test(path.basename(file))) pages.add(file);
}
const affected = [...pages].filter(file => !['projects.html'].includes(file) && !file.includes('/')).sort();
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];
for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  for (const file of affected) {
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('pageerror', error => consoleErrors.push(error.message));
    try {
      const response = await page.goto(`http://127.0.0.1:4173/${file}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(250);
      const broken = await page.locator('img').evaluateAll(images => images.filter(img => img.currentSrc && img.naturalWidth === 0).map(img => img.currentSrc));
      if (!response || !response.ok() || broken.length || consoleErrors.length) failures.push({ viewport: viewport.name, file, status: response?.status(), broken, consoleErrors });
      results.push({ viewport: viewport.name, file, status: response?.status(), images: await page.locator('img').count() });
    } catch (error) { failures.push({ viewport: viewport.name, file, reason: error.message }); }
    await page.close();
  }
  await context.close();
}
const excludedResults = [];
for (const file of ['atl.html', 'agrinova-tech.html', 'nextdrive-motors.html']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.goto(`http://127.0.0.1:4173/${file}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const sources = await page.locator('img').evaluateAll(images => images.map(img => img.currentSrc || img.src));
    excludedResults.push({ file, broken: sources.filter(src => !src).length, imageCount: sources.length, hasProcessedWebp: sources.some(src => /(?:ccp|gccp|lake-agro|lakegas|lake-pipes|lakelubes|lakesteel|leadership|merm|rm|news)/i.test(src)) });
  } catch (error) { failures.push({ file, excluded: true, reason: error.message }); }
  await page.close();
}
await browser.close();
const output = { affectedPages: affected.length, results: results.length, failures, excludedResults };
await fs.writeFile(path.join(root, 'docs/reports/media-render-verification-20260907.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ affectedPages: affected.length, renders: results.length, failures: failures.length, excludedResults }, null, 2));
if (failures.length) process.exitCode = 1;
