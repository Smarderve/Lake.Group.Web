import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { chromium } from 'playwright';
import { makeApp, makeUser } from '../../backend/tests/helpers.js';
import { buildCmsV2SeedDataset } from '../../backend/src/lib/cms-v2-seed.js';
import { CMS_V2_DOCUMENTS, CMS_V2_PAGE_DEFINITIONS } from '../../backend/src/lib/cms-v2-content.js';
import { reviewContentRelease } from '../../backend/src/lib/cms-v2-release-review.js';
import { createDefaultComposition } from '../../backend/src/lib/cms-v2-components.js';

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
for (const page of CMS_V2_PAGE_DEFINITIONS) dataset[page.key].composition = createDefaultComposition(page.label, dataset[page.key]);
const revision = { id: 'seed-home', data: dataset.home, createdAt: '2026-09-18T12:00:00.000Z' };
const state = { home: revision, 'lake-aviation': { id: 'seed-aviation', data: dataset['lake-aviation'], createdAt: revision.createdAt }, global: { id: 'seed-global', data: dataset.global, createdAt: revision.createdAt } };
const service = {
  readDocument: async (key) => ({
    key,
    currentDraftRevisionId: state[key]?.id ?? null,
    currentPublishedRevisionId: key === 'home' ? revision.id : key === 'lake-aviation' ? 'seed-aviation' : null,
    currentDraftRevision: state[key] ?? null,
    currentPublishedRevision: state[key] ?? null,
    updatedAt: state[key] ? new Date(state[key].createdAt) : null,
  }),
  readPageSource: async (key) => {
    const route = CMS_V2_PAGE_DEFINITIONS.find((page) => page.key === key)?.route;
    if (!route) throw new Error('Unknown page');
    return { sourceUrl: `http://127.0.0.1:${sitePort}/${route}`, html: await readFile(join(root, route), 'utf8') };
  },
  listRevisions: async (key) => state[key] ? [state[key]] : [],
  listReleases: async () => [],
  reviewRelease: async ({ key }) => reviewContentRelease({ definition: CMS_V2_DOCUMENTS[key], draft: state[key].data, published: revision.data }),
  saveDraft: async ({ key, data }) => { state[key] = { id: `revision-${Date.now()}`, data, createdAt: new Date().toISOString() }; return state[key]; },
  saveDraftBatch: async ({ documents }) => documents.map((document) => { state[document.key] = { id: `revision-${document.key}-${Date.now()}`, data: document.data, createdAt: new Date().toISOString() }; return state[document.key]; }),
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
  assert.ok((await page.locator('iframe').getAttribute('srcdoc'))?.includes('<html'));
  await page.frameLocator('iframe').locator('body').waitFor();
  await page.locator('.control-inspector input').first().fill('Lake Group revised heading');
  await page.getByText('Saved draft', { exact: true }).waitFor({ timeout: 10_000 });
  assert.equal(state.home.data.composition.root.children[0].content.heading, 'Lake Group revised heading');
  await page.getByRole('button', { name: 'Review release' }).click();
  await page.getByRole('heading', { name: 'Review structured changes' }).waitFor();
  assert.ok((await page.getByRole('dialog').textContent())?.includes('composition'));
  await page.screenshot({ path: join(screenshotRoot, 'release-review-1440.png'), fullPage: true });
  await page.getByRole('dialog').getByRole('button', { name: 'Create release' }).click();
  await page.getByText('Release queued for website deployment', { exact: true }).waitFor();
  await page.screenshot({ path: join(screenshotRoot, 'editor-1440.png'), fullPage: true });
  await page.goto(`${cmsOrigin}/control/pages/lake-aviation`);
  await page.getByRole('heading', { name: 'Lake Aviation', exact: true }).waitFor();
  await page.frameLocator('iframe').locator('[data-cms-node-id="hero"]').waitFor();
  await page.locator('.control-inspector input').first().fill('Lake Aviation draft preview');
  assert.equal(await page.frameLocator('iframe').locator('[data-cms-node-id="hero"] h1,[data-cms-node-id="hero"] h2').first().textContent(), 'Lake Aviation draft preview');
  const heroImage = page.frameLocator('iframe').locator('[data-cms-node-id="hero"] img').first();
  assert.ok(await heroImage.evaluate(async (image) => { await image.decode(); return image.naturalWidth; }), 'Real website hero image must load in the preview');
  await page.frameLocator('iframe').locator('[data-cms-node-id="introduction"]').click();
  assert.equal(await page.locator('.control-inspector h2').textContent(), 'Introduction');
  await page.getByRole('button', { name: 'Insert component' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Service card/ }).click();
  await page.getByRole('button', { name: 'layout', exact: true }).click();
  await page.getByLabel('Grid span').selectOption('6');
  await page.getByRole('button', { name: 'Tablet preview' }).click();
  await page.getByLabel('Grid span').selectOption('12');
  await page.getByRole('button', { name: 'Reset to inherited' }).click();
  const canvasActions = page.locator('.composer-canvas-actions');
  await canvasActions.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await canvasActions.getByRole('button', { name: 'Hide', exact: true }).click();
  await canvasActions.getByRole('button', { name: 'Show', exact: true }).click();
  await canvasActions.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: '↶' }).click();
  await page.screenshot({ path: join(screenshotRoot, 'aviation-editor-1440.png'), fullPage: true });
  await page.goto(`${cmsOrigin}/control/navigation`);
  await page.getByRole('heading', { name: 'Navigation', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByLabel('Label').fill('Investor relations');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.getByText('Navigation draft saved', { exact: true }).waitFor();
  assert.ok(state.global.data.navigation.some((item) => item.label === 'Investor relations'));
  await page.goto(`${cmsOrigin}/control/global-data`);
  await page.getByRole('heading', { name: 'Global data', exact: true }).waitFor();
  await page.getByText('Canonical fields', { exact: true }).waitFor();
  await page.getByLabel('Published pages only').check();
  await page.goto(`${cmsOrigin}/control/media`);
  await page.getByRole('heading', { name: 'Media library', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Upload media' }).waitFor();
  for (const width of [1366,1536,1920]) { await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `editor overflow at ${width}`); }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${cmsOrigin}/control`);
  await page.getByRole('heading', { name: 'Website control center' }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(screenshotRoot, 'overview-390.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Control center browser QA passed: overview, page search, editor composition, navigation, global data, media, 1440px and 390px.');
} finally {
  if (browser) await browser.close();
  await vite.close();
  await new Promise((resolveServer) => site.close(resolveServer));
  await new Promise((resolveServer) => backend.close(resolveServer));
}
