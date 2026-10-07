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
const CARD_SECTION_HEADINGS = {
  'lake-oil.html': ['Lake Oil Capabilities'],
  'lake-aviation.html': ['Our Services'],
  'lake-gas.html': ['Quality with Quantity.'],
  'lake-lubes.html': ['Product Categories & Support'],
  'lake-buildings.html': ['Gypsum Board & Marine Board'],
  'lake-pipes.html': ['Product Range'],
  'lake-steel.html': ['From tested materials to reinforcement bars.'],
  'gulf-aggregates.html': ['Quarrying & Aggregate Supply'],
  'aficd.html': ['Integrated Logistics Solutions'],
  'lake-trans.html': ['Fleet Capabilities'],
  'cross-country.html': ['Our Expertise'],
  'lake-agro.html': ['Diversified commercial production.', 'Agricultural equipment and infrastructure.'],
  'assembly-tech.html': ['Built For The Road. Engineered For The Job.'],
  'nextdrive-motors.html': ['Commercial Mobility Portfolio', 'Vehicles for Every Commercial Journey.'],
};
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

test('company pages use explicit editorial/presentation alignment and fit responsive viewports', async () => {
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
          const sections = Array.from(document.querySelectorAll(
            '.company-section--editorial, .company-section--presentation, .ag-section--editorial, .ag-section--presentation'
          )).filter((section) => !section.matches('.company-section--cards-centered'));
          const text = sections.flatMap((section) => {
            const defaultExpected = section.matches('.company-section--editorial, .ag-section--editorial') ? 'left' : 'center';
            return Array.from(section.querySelectorAll('h2, h3, h4, p, li'))
              .filter((element) => !element.closest('.stat-panel2, .stat-tile2, .info-rows, .aficd-glance-list, .aficd-ops-stats, .lg-company-faq, .ag-faq, table, form'))
              .map((element) => {
                const style = getComputedStyle(element);
                const isAviationCentered = section.matches('.company-section--aviation-centered')
                  || (section.matches('.company-section--aviation-services-centered')
                    && (element.matches('.fs-display') || element.closest('.svc-card__body')));
                const expected = isAviationCentered ? 'center' : defaultExpected;
                return { expected, actual: style.textAlign, marginLeft: style.marginLeft };
              });
          });
          return {
            viewport: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            overflow: document.documentElement.scrollWidth > innerWidth,
            sectionCount: sections.length,
            editorialCount: sections.filter((section) => section.matches('.company-section--editorial, .ag-section--editorial')).length,
            presentationCount: sections.filter((section) => section.matches('.company-section--presentation, .ag-section--presentation')).length,
            misaligned: text.filter((element) => element.actual !== element.expected
              || (element.expected === 'left' && element.marginLeft !== '0px')).length,
            faqCount: document.querySelectorAll('.lg-company-faq').length,
          };
        });
        assert.equal(layout.overflow, false, `${pageName} at ${viewport.width}px: no horizontal overflow`);
        if (pageName !== 'agrinova-tech.html') {
          assert.ok(layout.sectionCount > 0, `${pageName}: semantic text sections were inspected`);
          assert.ok(layout.editorialCount > 0, `${pageName}: at least one Type A editorial section is marked`);
          assert.ok(layout.presentationCount > 0, `${pageName}: at least one Type B presentation section is marked`);
          assert.equal(layout.misaligned, 0, `${pageName} at ${viewport.width}px: marked text aligns by type and editorial copy shares its left reading edge`);
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

test('Lake Aviation alignment exceptions stay local and responsive', { timeout: 120000 }, async () => {
  const server = await startServer();
  let browser;
  try {
    const executablePath = installedChromium();
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  } catch (error) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    throw new Error(`Playwright Chromium is unavailable; aviation alignment browser assertions could not run: ${error.message}`);
  }

  try {
    const page = await browser.newPage();
    const base = `http://127.0.0.1:${server.address().port}/`;
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ];
    const regressionPages = [
      'lake-oil.html', 'lake-gas.html', 'lake-buildings.html', 'lake-trans.html', 'agrinova-tech.html',
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(`${base}lake-aviation.html`, { waitUntil: 'domcontentloaded' });
      const aviation = await page.evaluate(() => {
        const intro = document.querySelector('.company-section--aviation-centered');
        const services = document.querySelector('.company-section--aviation-services-centered');
        const introText = Array.from(intro.querySelectorAll('.fs-display, .fs-lede, p, li'));
        const cards = Array.from(services.querySelectorAll('.svc-card'));
        const imageState = cards.map((card) => {
          const image = card.querySelector('.svc-card__media img');
          const media = card.querySelector('.svc-card__media');
          return {
            src: image.getAttribute('src'),
            objectFit: getComputedStyle(image).objectFit,
            aspectRatio: getComputedStyle(media).aspectRatio,
          };
        });
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          introAlignments: introText.map((element) => getComputedStyle(element).textAlign),
          introWidth: intro.querySelector('.lake-aviation-intro').getBoundingClientRect().width,
          introContainerWidth: intro.querySelector('.container').getBoundingClientRect().width,
          servicesTitleAlignment: getComputedStyle(services.querySelector(':scope > .container > .fs-display')).textAlign,
          cardCount: cards.length,
          cardTextAlignments: cards.flatMap((card) => [
            getComputedStyle(card.querySelector('.svc-card__title')).textAlign,
            getComputedStyle(card.querySelector('.svc-card__desc')).textAlign,
          ]),
          cardTextBoxesCentered: cards.flatMap((card) => ['.svc-card__title', '.svc-card__desc'].map((selector) => {
            const textRect = card.querySelector(selector).getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            return Math.abs((textRect.left + textRect.right) / 2 - (cardRect.left + cardRect.right) / 2) <= 1;
          })),
          cardWidths: cards.map((card) => Math.round(card.getBoundingClientRect().width)),
          imageState,
        };
      });

      assert.equal(aviation.overflow, false, `Lake Aviation at ${viewport.width}px: no horizontal overflow`);
      assert.equal(aviation.introAlignments.length, 7, 'intro heading, paragraphs, and four capability lines are inspected');
      assert.ok(aviation.introAlignments.every((alignment) => alignment === 'center'), `Lake Aviation intro text centers at ${viewport.width}px`);
      assert.ok(aviation.introWidth <= aviation.introContainerWidth, `Lake Aviation intro block fits its container at ${viewport.width}px`);
      assert.equal(aviation.servicesTitleAlignment, 'center', `Our Services title centers at ${viewport.width}px`);
      assert.equal(aviation.cardCount, 4, `four service cards remain at ${viewport.width}px`);
      assert.ok(aviation.cardTextAlignments.every((alignment) => alignment === 'center'), `service card text centers at ${viewport.width}px`);
      assert.ok(aviation.cardTextBoxesCentered.every(Boolean), `service card text boxes center under their images at ${viewport.width}px`);
      assert.ok(aviation.cardWidths.every((width) => width > 0), `service cards remain laid out at ${viewport.width}px`);
      assert.deepEqual(aviation.imageState.map(({ src }) => src), [
        'assets/images/delivery/lake-aviation/remediated/aviation-2-clean.webp',
        'assets/images/delivery/lake-aviation/remediated/aviation-4-neutral.webp',
        'assets/images/delivery/lake-aviation/remediated/aviation-6-neutral.webp',
        'assets/images/lake-aviation/ops/bulk-storage-lake-energies.webp',
      ], 'service images and their source assets remain unchanged');
      assert.ok(aviation.imageState.every((image) => image.objectFit === 'cover' && image.aspectRatio === '16 / 10'), 'service image treatment remains unchanged');

      for (const pageName of regressionPages) {
        await page.goto(`${base}${pageName}`, { waitUntil: 'domcontentloaded' });
        const introAlignment = await page.evaluate(() => {
          const section = document.querySelector('.company-section--editorial, .ag-section--editorial');
          const heading = section?.querySelector('h2, h3');
          return heading ? { text: heading.textContent.trim(), align: getComputedStyle(heading).textAlign } : null;
        });
        assert.ok(introAlignment, `${pageName} has an editorial intro heading at ${viewport.width}px`);
        assert.equal(introAlignment.align, 'left', `${pageName} editorial intro remains left aligned at ${viewport.width}px`);
        if (pageName === 'lake-oil.html') {
          assert.match(introAlignment.text, /LAKE OIL, THE FLAGSHIP COMPANY OF LAKE GROUP/i, 'Lake Oil keeps its intended intro heading');
        }
      }
    }
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('image-led company capability and product cards center text without changing geometry', { timeout: 120000 }, async () => {
  const server = await startServer();
  let browser;
  try {
    const executablePath = installedChromium();
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  } catch (error) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    throw new Error(`Playwright Chromium is unavailable; card alignment assertions could not run: ${error.message}`);
  }

  try {
    const page = await browser.newPage();
    const base = `http://127.0.0.1:${server.address().port}/`;
    const viewports = [
      { width: 1920, height: 1080 }, { width: 1440, height: 900 },
      { width: 1366, height: 768 }, { width: 768, height: 1024 },
      { width: 390, height: 844 }, { width: 412, height: 915 },
    ];

    for (const pageName of COMPANY_PAGES) {
      const expectedHeadings = CARD_SECTION_HEADINGS[pageName] || [];
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto(`${base}${pageName}`, { waitUntil: 'domcontentloaded' });
        const result = await page.evaluate(() => {
          const sections = Array.from(document.querySelectorAll('.company-section--cards-centered'));
          const cards = sections.flatMap((section) => Array.from(section.querySelectorAll(
            '.svc-card, .prod-catalog-card, .agro-prj, .aficd-solution, .aficd-cap, .atl-product-card, .nd-product-card, .nd-portfolio-item, .agro-equipment-grid figure'
          )).filter((card) => card.querySelector('img')));
          const cardText = cards.flatMap((card) => Array.from(card.querySelectorAll('h2, h3, h4, p, figcaption, strong')).map((element) => {
            const textRect = element.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            return {
              align: getComputedStyle(element).textAlign,
              measurableCard: cardRect.width >= 100,
              centered: Math.abs((textRect.left + textRect.right) / 2 - (cardRect.left + cardRect.right) / 2) <= 1,
            };
          }));
          const images = cards.flatMap((card) => Array.from(card.querySelectorAll('img')));
          const geometries = [...cards, ...images].map((element) => {
            const rect = element.getBoundingClientRect();
            return { width: Math.round(rect.width), height: Math.round(rect.height) };
          });
          const headings = sections.map((section) => ({
            text: (section.querySelector(':scope > .container h2, :scope > .container h3')?.textContent || '').trim(),
            align: getComputedStyle(section.querySelector(':scope > .container h2, :scope > .container h3')).textAlign,
          }));
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            headings,
            cardCount: cards.length,
            images: images.length,
            alignments: cardText.map((element) => element.align),
            centeredTextBoxes: cardText.map((element) => element.centered),
            cardTextMeasurable: cardText.map((element) => element.measurableCard),
            geometries,
          };
        });

        assert.equal(result.overflow, false, `${pageName} at ${viewport.width}px: no horizontal overflow`);
        assert.deepEqual(result.headings.map((heading) => heading.text), expectedHeadings,
          `${pageName} at ${viewport.width}px: only its audited image-card sections are marked`);
        if (expectedHeadings.length) {
          assert.ok(result.headings.every((heading) => heading.align === 'center'), `${pageName} section titles center at ${viewport.width}px`);
          assert.ok(result.cardCount > 0, `${pageName} image cards are present at ${viewport.width}px`);
          assert.ok(result.images >= result.cardCount, `${pageName} image assets remain in cards at ${viewport.width}px`);
          assert.ok(result.alignments.every((alignment) => alignment === 'center'), `${pageName} card text centers at ${viewport.width}px`);
          assert.ok(result.centeredTextBoxes.every((centered, index) => !result.cardTextMeasurable[index] || centered), `${pageName} card text boxes are centered within visible card widths at ${viewport.width}px`);
          assert.ok(result.geometries.slice(0, result.cardCount).every(({ width, height }) => width > 0 && height > 0), `${pageName} cards retain visible geometry at ${viewport.width}px`);
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
