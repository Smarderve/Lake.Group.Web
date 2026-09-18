import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { chromium } from 'playwright';
import { makeApp, makeUser } from '../../backend/tests/helpers.js';
import { buildCmsV2SeedDataset } from '../../backend/src/lib/cms-v2-seed.js';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const cmsRoot = fileURLToPath(new URL('../', import.meta.url));
const screenshotRoot = resolve(root, 'docs/qa/cms-v2-control-center');
const backendPort = 4191;
const cmsPort = 5191;
const sitePort = 4192;
const cmsOrigin = `http://127.0.0.1:${cmsPort}`;
process.env.CMS_PROXY_TARGET = `http://127.0.0.1:${backendPort}`;
process.env.VITE_PUBLIC_SITE_URL = `http://127.0.0.1:${sitePort}`;

const dataset = await buildCmsV2SeedDataset({ root });
const revision = { id: 'seed-home', data: dataset.home, createdAt: '2026-09-18T12:00:00.000Z' };
let current = revision;
const service = {
  readDocument: async (key) => ({
    key,
    currentDraftRevisionId: key === 'home' ? current.id : null,
    currentPublishedRevisionId: key === 'home' ? revision.id : null,
    currentDraftRevision: key === 'home' ? current : null,
    currentPublishedRevision: key === 'home' ? revision : null,
    updatedAt: key === 'home' ? new Date(current.createdAt) : null,
  }),
  listRevisions: async (key) => key === 'home' ? [current] : [],
  listReleases: async () => [],
  saveDraft: async ({ data }) => { current = { id: `revision-${Date.now()}`, data, createdAt: new Date().toISOString() }; return current; },
  publish: async ({ revisionId }) => ({ id: `release-${Date.now()}`, revisionId, publishedAt: new Date().toISOString(), integrity: 'sha256-test' }),
};
const user = await makeUser({ email: 'control-qa@lakegroup.test', password: 'control-qa-password', role: 'SUPER_ADMIN' });
user.cmsAccessLevel = 'IT_ADMIN';
const { app } = makeApp({ users: [user], options: { cmsV2Service: service, csrfAllowedOrigins: [cmsOrigin], cmsAllowedOrigins: [cmsOrigin] } });
const backend = await new Promise((resolveServer, reject) => { const server = app.listen(backendPort, '127.0.0.1', () => resolveServer(server)); server.once('error', reject); });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2' };
const site = createHttpServer(async (req, res) => {
  const path = new URL(req.url, `http://127.0.0.1:${sitePort}`).pathname;
  const target = resolve(root, `.${path === '/' ? '/index.html' : path}`);
  if (!(target === root || target.startsWith(root + sep))) { res.writeHead(403).end(); return; }
  try { if (!(await stat(target)).isFile()) throw new Error('Not a file'); res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream' }); createReadStream(target).pipe(res); } catch { res.writeHead(404).end(); }
});
await new Promise((resolveServer, reject) => { site.listen(sitePort, '127.0.0.1', resolveServer); site.once('error', reject); });
const vite = await createViteServer({ configFile: join(cmsRoot, 'vite.config.ts'), root: cmsRoot, server: { host: '127.0.0.1', port: cmsPort, strictPort: true } });
let browser;
try {
  await vite.listen();
  await mkdir(screenshotRoot, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${cmsOrigin}/login`);
  await page.getByLabel(/^Email/).fill(user.email);
  await page.getByLabel(/^Password/).fill('control-qa-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(`${cmsOrigin}/app`);
  await page.goto(`${cmsOrigin}/control`);
  await page.getByRole('heading', { name: 'Website control center' }).waitFor();
  await page.screenshot({ path: join(screenshotRoot, 'overview-1440.png'), fullPage: true });
  await page.getByRole('link', { name: 'Pages', exact: true }).click();
  await page.getByRole('heading', { name: 'Pages', exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Search pages' }).fill('index.html');
  assert.equal(await page.locator('.control-table tbody tr').count(), 1);
  await page.screenshot({ path: join(screenshotRoot, 'pages-1440.png'), fullPage: true });
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('heading', { name: 'Home', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Mobile preview' }).click();
  assert.equal(await page.locator('iframe').getAttribute('src'), `http://127.0.0.1:${sitePort}/index.html`);
  await page.frameLocator('iframe').locator('body').waitFor();
  await page.locator('.control-inspector textarea').first().fill('Lake Group revised heading');
  await page.getByText('Saved draft', { exact: true }).waitFor({ timeout: 10_000 });
  assert.equal(current.data.hero.heading, 'Lake Group revised heading');
  await page.screenshot({ path: join(screenshotRoot, 'editor-1440.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${cmsOrigin}/control`);
  await page.getByRole('heading', { name: 'Website control center' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(screenshotRoot, 'overview-390.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Control center browser QA passed: overview, page search, editor autosave, actual site iframe, 1440px and 390px.');
} finally {
  if (browser) await browser.close();
  await vite.close();
  await new Promise((resolveServer) => site.close(resolveServer));
  await new Promise((resolveServer) => backend.close(resolveServer));
}
