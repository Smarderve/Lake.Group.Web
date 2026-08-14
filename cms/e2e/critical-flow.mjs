import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import axe from 'axe-core';
import { makeApp, makeUser } from '../../backend/tests/helpers.js';

const backendPort = 4010;
const cmsPort = 5180;
const cmsOrigin = `http://127.0.0.1:${cmsPort}`;
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const cmsRoot = fileURLToPath(new URL('..', import.meta.url));
const articleTitle = `Phase 17 critical flow ${Date.now()}`;
const articleSlug = `phase-17-critical-flow-${Date.now()}`;

process.env.CMS_PROXY_TARGET = backendOrigin;

const users = [
  await makeUser({ email: 'editor@phase17.test', password: 'editor-password', role: 'EDITOR' }),
  await makeUser({ email: 'reviewer@phase17.test', password: 'reviewer-password', role: 'REVIEWER' }),
  await makeUser({ email: 'viewer@phase17.test', password: 'viewer-password', role: 'VIEWER' }),
];
const { app } = makeApp({
  users,
  options: { csrfAllowedOrigins: [cmsOrigin] },
});

const backend = await new Promise((resolve, reject) => {
  const server = app.listen(backendPort, '127.0.0.1', () => resolve(server));
  server.once('error', reject);
});
const vite = await createServer({
  configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
  root: cmsRoot,
  server: { host: '127.0.0.1', port: cmsPort, strictPort: true },
});

let browser;
const consoleErrors = [];

function captureBrowserErrors(page, actor) {
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      consoleErrors.push(`${actor}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(`${actor}: ${error.message}`));
}

async function login(page, email, password) {
  await page.goto(`${cmsOrigin}/login`);
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(`${cmsOrigin}/app`);
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
}

async function assertNoSeriousAxeViolations(page, label) {
  await page.addScriptTag({ content: axe.source });
  const results = await page.evaluate(async () => window.axe.run(document));
  const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  assert.deepEqual(
    serious.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) })),
    [],
    `${label} has serious or critical accessibility violations`,
  );
}

try {
  await vite.listen();
  browser = await chromium.launch({ headless: true });

  const editorContext = await browser.newContext();
  const editorPage = await editorContext.newPage();
  captureBrowserErrors(editorPage, 'editor');
  await login(editorPage, 'editor@phase17.test', 'editor-password');
  await assertNoSeriousAxeViolations(editorPage, 'Dashboard');

  await editorPage.goto(`${cmsOrigin}/app/news/new`);
  await editorPage.getByLabel(/^Title/).fill(articleTitle);
  await editorPage.getByLabel(/^Slug/).fill(articleSlug);
  await editorPage.getByLabel(/^Body/).fill('This article proves the complete governed publishing path.');
  await editorPage.getByLabel(/^Why is this changing/).fill('Phase 17 end-to-end verification');
  await editorPage.getByRole('button', { name: 'Create draft' }).click();
  await editorPage.waitForURL(`${cmsOrigin}/app/news`);

  await editorPage.goto(`${cmsOrigin}/app/drafts`);
  const draft = editorPage.getByRole('link', { name: articleTitle });
  await draft.waitFor();
  await draft.locator('xpath=ancestor::li').getByRole('button', { name: 'Submit' }).click();
  await editorPage.getByRole('dialog', { name: 'Submit for review?' }).getByRole('button', { name: 'Submit for review' }).click();
  await editorPage.getByText('Submitted for review', { exact: true }).waitFor();
  await editorContext.close();

  const reviewerContext = await browser.newContext();
  const reviewerPage = await reviewerContext.newPage();
  captureBrowserErrors(reviewerPage, 'reviewer');
  await login(reviewerPage, 'reviewer@phase17.test', 'reviewer-password');
  await reviewerPage.goto(`${cmsOrigin}/app/review`);
  await reviewerPage.getByRole('link', { name: articleSlug }).first().click();
  await reviewerPage.getByRole('button', { name: 'Approve' }).click();
  await reviewerPage.getByRole('button', { name: 'Publish now' }).waitFor();
  await reviewerPage.getByRole('button', { name: 'Publish now' }).click();
  await reviewerPage.getByText('PUBLISHED', { exact: true }).first().waitFor();

  const publicResponse = await reviewerContext.request.get(`${backendOrigin}/api/public/news/${articleSlug}`);
  assert.equal(publicResponse.status(), 200);
  assert.equal((await publicResponse.json()).news.title, articleTitle);
  await reviewerContext.close();

  const viewerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const viewerPage = await viewerContext.newPage();
  captureBrowserErrors(viewerPage, 'viewer');
  await login(viewerPage, 'viewer@phase17.test', 'viewer-password');
  assert.equal(
    await viewerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'mobile dashboard must not overflow horizontally',
  );
  await viewerPage.getByRole('button', { name: 'Open navigation' }).click();
  await viewerPage.getByRole('dialog', { name: 'Navigation menu' }).waitFor();
  await viewerPage.getByRole('button', { name: 'Close navigation' }).click();
  await viewerPage.goto(`${cmsOrigin}/app/review`);
  await viewerPage.getByText("You don't have access to this area").waitFor();
  await assertNoSeriousAxeViolations(viewerPage, 'Unauthorized state');
  await viewerContext.close();

  assert.deepEqual(consoleErrors, [], `browser console errors:\n${consoleErrors.join('\n')}`);
  console.log('CMS E2E passed: login → dashboard → draft → review → approve → publish → public visibility; viewer denial, mobile drawer, and axe checks passed.');
} finally {
  if (browser) await browser.close();
  await vite.close();
  await new Promise((resolve, reject) => backend.close((error) => (error ? reject(error) : resolve())));
}
