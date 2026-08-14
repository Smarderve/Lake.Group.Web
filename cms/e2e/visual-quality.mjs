import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axe from 'axe-core';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { makeApp, makeUser } from '../../backend/tests/helpers.js';

const backendPort = 4011;
const cmsPort = 5181;
const cmsOrigin = `http://127.0.0.1:${cmsPort}`;
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const screenshotDir = process.env.CMS_VISUAL_SCREENSHOT_DIR
  ? path.resolve(process.env.CMS_VISUAL_SCREENSHOT_DIR)
  : null;

process.env.CMS_PROXY_TARGET = backendOrigin;

const routes = [
  ['Dashboard', '/app'],
  ['Companies', '/app/companies'],
  ['New company', '/app/companies/new'],
  ['Products', '/app/products'],
  ['New product', '/app/products/new'],
  ['Leadership', '/app/leadership'],
  ['New leader', '/app/leadership/new'],
  ['Countries', '/app/countries'],
  ['New country', '/app/countries/new'],
  ['Regions', '/app/regions'],
  ['New region', '/app/regions/new'],
  ['Locations', '/app/locations'],
  ['New location', '/app/locations/new'],
  ['Facilities', '/app/facilities'],
  ['New facility', '/app/facilities/new'],
  ['Projects', '/app/projects'],
  ['New project', '/app/projects/new'],
  ['Careers', '/app/careers'],
  ['New career', '/app/careers/new'],
  ['CSR', '/app/csr'],
  ['New CSR entry', '/app/csr/new'],
  ['Contacts', '/app/contacts'],
  ['New contact', '/app/contacts/new'],
  ['Content blocks', '/app/content-blocks'],
  ['New content block', '/app/content-blocks/new'],
  ['Metrics', '/app/metrics'],
  ['New metric', '/app/metrics/new'],
  ['News', '/app/news'],
  ['New news article', '/app/news/new'],
  ['Media', '/app/media'],
  ['New media record', '/app/media/new'],
  ['Media folders', '/app/media-folders'],
  ['Review queue', '/app/review'],
  ['Scheduled publishing', '/app/scheduled'],
  ['Published content', '/app/published'],
  ['Drafts', '/app/drafts'],
  ['Users', '/app/users'],
  ['Notifications', '/app/notifications'],
  ['Audit trail', '/app/audit'],
  ['System settings', '/app/settings'],
];

const screenshotRoutes = new Set(['/app', '/app/metrics', '/app/users', '/app/audit', '/app/settings']);
const user = await makeUser({
  email: 'visual-admin@lakegroup.test',
  password: 'visual-admin-password',
  role: 'SUPER_ADMIN',
});
const { app } = makeApp({
  users: [user],
  options: { csrfAllowedOrigins: [cmsOrigin], cmsAllowedOrigins: [cmsOrigin] },
});
const backend = await new Promise((resolve, reject) => {
  const server = app.listen(backendPort, '127.0.0.1', () => resolve(server));
  server.once('error', reject);
});
const cmsRoot = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({
  configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
  root: cmsRoot,
  server: { host: '127.0.0.1', port: cmsPort, strictPort: true },
});

let browser;
const browserErrors = [];

try {
  await vite.listen();
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      browserErrors.push(message.text());
    }
  });

  await page.goto(`${cmsOrigin}/login`);
  await page.getByLabel(/^Email/).fill('visual-admin@lakegroup.test');
  await page.getByLabel(/^Password/).fill('visual-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(`${cmsOrigin}/app`);

  for (const [label, route] of routes) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${cmsOrigin}${route}`);
    await page.locator('main h1').waitFor();
    assert.equal(await page.locator('main h1').count(), 1, `${label}: expected one primary heading`);
    assert.equal(
      await page.getByText(/coming soon/i).count(),
      0,
      `${label}: production route still renders placeholder content`,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `${label}: desktop horizontal overflow`,
    );
    await page.addScriptTag({ content: axe.source });
    const serious = await page.evaluate(async () => {
      const result = await window.axe.run(document);
      return result.violations
        .filter((violation) => ['serious', 'critical'].includes(violation.impact))
        .map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) }));
    });
    assert.deepEqual(serious, [], `${label}: serious or critical axe violations`);

    if (screenshotDir && screenshotRoutes.has(route)) {
      const filename = route === '/app' ? 'dashboard' : route.split('/').at(-1);
      await page.screenshot({ path: path.join(screenshotDir, `${filename}-desktop.png`), fullPage: true });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `${label}: mobile horizontal overflow`,
    );
    const interactive = page.locator('button, a, input, select, textarea');
    const count = await interactive.count();
    for (let index = 0; index < count; index += 1) {
      const box = await interactive.nth(index).boundingBox();
      if (!box || box.width === 0 || box.height === 0) continue;
      const insideHorizontalScroller = await interactive.nth(index).evaluate((element) => {
        let parent = element.parentElement;
        while (parent) {
          const overflow = getComputedStyle(parent).overflowX;
          if (overflow === 'auto' || overflow === 'scroll') return true;
          parent = parent.parentElement;
        }
        return false;
      });
      assert.ok(
        insideHorizontalScroller || (box.x + box.width >= 0 && box.x <= 390),
        `${label}: interactive control outside mobile viewport`,
      );
    }
    if (screenshotDir && screenshotRoutes.has(route)) {
      const filename = route === '/app' ? 'dashboard' : route.split('/').at(-1);
      await page.screenshot({ path: path.join(screenshotDir, `${filename}-mobile.png`), fullPage: true });
    }
  }

  assert.deepEqual(browserErrors, [], `Browser errors:\n${browserErrors.join('\n')}`);
  await context.close();
  console.log(
    `CMS visual quality gate passed: ${routes.length} completed routes at desktop/mobile widths, heading, placeholder, overflow, control bounds, axe, and browser-error checks.`,
  );
} finally {
  if (browser) await browser.close();
  await vite.close();
  await new Promise((resolve, reject) => backend.close((error) => (error ? reject(error) : resolve())));
}
