'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FAQ_PAGES = [
  'lake-oil.html', 'lake-aviation.html', 'lake-gas.html', 'lake-lubes.html',
  'lake-buildings.html', 'lake-pipes.html', 'lake-steel.html', 'lake-cylinders.html',
  'lake-premix-cement.html', 'gulf-aggregates.html', 'aficd.html', 'aill.html',
  'lake-trans.html', 'cross-country.html', 'lake-agro.html', 'assembly-tech.html',
  'nextdrive-motors.html',
];
const COMPANY_PAGES = [...FAQ_PAGES, 'agrinova-tech.html'];
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
];

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const relative = decodeURIComponent((request.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(ROOT, relative);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        response.writeHead(404).end();
        return;
      }
      const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(response);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function installedChromium() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

test('all business vertical FAQs render in the content root and work as disclosures', async () => {
  const server = await startServer();
  let browser;
  try {
    const executablePath = installedChromium();
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  } catch (error) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    throw new Error(`Playwright Chromium is unavailable; runtime browser assertions could not run: ${error.message}`);
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  try {
    const base = `http://127.0.0.1:${server.address().port}/`;
    for (const pageName of FAQ_PAGES) {
      await page.goto(`${base}${pageName}`, { waitUntil: 'domcontentloaded' });
      const faq = page.locator('.lg-company-faq');
      assert.equal(await faq.count(), 1, `${pageName}: exactly one injected FAQ`);
      assert.equal(await faq.locator('details', {}).count(), 4, `${pageName}: four questions`);
      assert.equal(await faq.locator('summary', {}).count(), 4, `${pageName}: four visible questions`);
      assert.ok(await faq.locator('h2', {}).isVisible(), `${pageName}: heading is visible`);

      const placement = await faq.evaluate((section) => {
        const root = section.parentElement;
        const footer = document.querySelector('footer');
        const permittedRoot = root.matches('main, .page-wrapper');
        const footerAfterFaq = !footer || !!(section.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING);
        const nestedInChrome = !!section.closest('nav, footer, [data-chat-widget], .chat-widget, #chat-widget');
        return { permittedRoot, footerAfterFaq, nestedInChrome };
      });
      assert.ok(placement.permittedRoot, `${pageName}: FAQ is directly in the page content root`);
      assert.ok(placement.footerAfterFaq, `${pageName}: FAQ precedes footer`);
      assert.equal(placement.nestedInChrome, false, `${pageName}: FAQ is outside navigation/chat/footer chrome`);

      for (let row = 0; row < 4; row += 1) {
        const disclosure = faq.locator('details', {}).nth(row);
        const summary = disclosure.locator('summary', {});
        await summary.click();
        assert.equal(await disclosure.evaluate((node) => node.open), true, `${pageName}: row ${row + 1} opens`);
        await summary.click();
        assert.equal(await disclosure.evaluate((node) => node.open), false, `${pageName}: row ${row + 1} closes`);
      }
    }

    await page.goto(`${base}agrinova-tech.html`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('.lg-company-faq').count(), 0, 'Agrinova does not receive the generic FAQ');
    assert.equal(await page.locator('main details').count(), 5, 'Agrinova retains its five existing FAQ rows');
    assert.deepEqual(pageErrors, [], 'no uncaught browser errors across company pages');
    assert.deepEqual(consoleErrors, [], 'no browser console errors across company pages');
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('company pages preserve editorial centering and fit desktop, wide, and mobile viewports', async () => {
  const server = await startServer();
  let browser;
  try {
    const executablePath = installedChromium();
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  } catch (error) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    throw new Error(`Playwright Chromium is unavailable; responsive browser assertions could not run: ${error.message}`);
  }

  try {
    const page = await browser.newPage();
    const base = `http://127.0.0.1:${server.address().port}/`;
    for (const pageName of COMPANY_PAGES) {
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await page.goto(`${base}${pageName}`, { waitUntil: 'domcontentloaded' });
        const layout = await page.evaluate(() => {
          const editorial = Array.from(document.querySelectorAll(
            '.fs-section > .container > h2, .fs-section > .container > p:not(.footer-motto)'
          ));
          return {
            viewport: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            overflow: document.documentElement.scrollWidth > innerWidth,
            editorialCount: editorial.length,
            misaligned: editorial.filter((element) => getComputedStyle(element).textAlign !== 'center').length,
            faqCount: document.querySelectorAll('.lg-company-faq').length,
          };
        });
        assert.equal(layout.overflow, false, `${pageName} at ${viewport.width}px: no horizontal overflow`);
        if (pageName !== 'agrinova-tech.html') {
          assert.ok(layout.editorialCount > 0, `${pageName}: editorial headings or introductions were inspected`);
          assert.equal(layout.misaligned, 0, `${pageName} at ${viewport.width}px: section headings and intro prose are centered`);
          assert.equal(layout.faqCount, 1, `${pageName} at ${viewport.width}px: FAQ remains mounted`);
        } else {
          assert.equal(layout.faqCount, 0, `${pageName} at ${viewport.width}px: existing custom FAQ remains the only FAQ`);
        }
      }
    }
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('homepage gallery defers at boot, warms its seven-card window, and remains navigable', async () => {
  const server = await startServer();
  let browser;
  try {
    const executablePath = installedChromium();
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  } catch (error) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    throw new Error(`Playwright Chromium is unavailable; gallery browser assertions could not run: ${error.message}`);
  }

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const base = `http://127.0.0.1:${server.address().port}/`;
    await page.goto(`${base}index.html`, { waitUntil: 'domcontentloaded' });

    const boot = await page.locator('[data-action-gallery] img', {}).evaluateAll((images) => ({
      count: images.length,
      withSource: images.filter((img) => img.hasAttribute('src')).length,
      eager: images.filter((img) => img.loading === 'eager').length,
    }));
    assert.ok(boot.count >= 7, 'the complete gallery is built');
    assert.equal(boot.withSource, 0, 'gallery images have no requests assigned at page boot');
    assert.equal(boot.eager, 0, 'no gallery image competes eagerly with homepage hero resources at boot');

    await page.evaluate(() => {
      const section = document.querySelector('#in-action');
      window.scrollTo(0, section.getBoundingClientRect().top + scrollY - innerHeight + 80);
    });
    await page.waitForFunction(() => {
      const visible = Array.from(document.querySelectorAll('[data-action-gallery] .action-tile'))
        .filter((tile) => Number(tile.style.opacity) > 0);
      return visible.length === 7 && visible.every((tile) => {
        const img = tile.querySelector('img');
        return img && img.hasAttribute('src') && img.complete && img.naturalWidth > 0;
      });
    }, null, { timeout: 20000 });
    assert.equal(await page.locator('[data-action-gallery] [data-action-skel]').evaluate((node) => node.classList.contains('is-done')), true, 'skeleton is removed after visible cards are ready');

    const count = page.locator('[data-action-gallery] [data-action-count]', {});
    await page.locator('[data-action-gallery] [data-action-next]', {}).click();
    await page.waitForFunction(() => document.querySelector('[data-action-gallery] [data-action-count]').textContent.startsWith('2 /'));
    assert.equal(await page.locator('[data-action-gallery] .action-tile.is-active img', {}).getAttribute('fetchpriority'), 'high', 'the newly active cached image is promoted to high priority');
    await page.locator('[data-action-gallery] [data-action-prev]', {}).click();
    await page.waitForFunction(() => document.querySelector('[data-action-gallery] [data-action-count]').textContent.startsWith('1 /'));

    const beforeDrag = await count.innerText();
    const stageBox = await page.locator('[data-action-gallery] .action-stage', {}).boundingBox();
    await page.mouse.move(stageBox.x + stageBox.width * 0.72, stageBox.y + stageBox.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(stageBox.x + stageBox.width * 0.28, stageBox.y + stageBox.height * 0.55, { steps: 5 });
    await page.mouse.up();
    await page.waitForFunction((previous) => document.querySelector('[data-action-gallery] [data-action-count]').textContent !== previous, beforeDrag, { timeout: 5000 });

    await page.locator('[data-action-gallery] [data-filter="gas"]', {}).click();
    await page.waitForFunction(() => {
      const visible = Array.from(document.querySelectorAll('[data-action-gallery] .action-tile'))
        .filter((tile) => Number(tile.style.opacity) > 0);
      return visible.length > 0 && visible.every((tile) => {
        const img = tile.querySelector('img');
        return img && img.complete && img.naturalWidth > 0;
      });
    }, null, { timeout: 20000 });
    assert.ok(await count.innerText(), 'filter rebuild retains the gallery counter');
    await page.locator('[data-action-gallery] [data-filter="all"]', {}).click();
    const beforeAutoplay = await count.innerText();
    await page.mouse.move(2, 2);
    await page.waitForFunction((previous) => document.querySelector('[data-action-gallery] [data-action-count]').textContent !== previous, beforeAutoplay, { timeout: 6500 });
    assert.deepEqual(pageErrors, [], 'gallery interactions raise no uncaught browser errors');
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
