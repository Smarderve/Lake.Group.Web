'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const test = require('node:test');
const { chromium } = require('playwright');
const { resolveStatic } = require('../scripts/_safe_static.js');

const ROOT = path.join(__dirname, '..');
const ROUTES = [
  'lake-oil.html', 'lake-gas.html', 'lake-lubes.html', 'lake-steel.html',
  'lake-trans.html', 'lake-aviation.html', 'lake-buildings.html', 'lake-pipes.html',
  'lake-premix-cement.html', 'lake-cylinders.html', 'gulf-aggregates.html',
  'aficd.html', 'aill.html', 'assembly-tech.html', 'lake-agro.html',
  'agrinova-tech.html', 'cross-country.html', 'acfs.html', 'atl.html',
  'nextdrive-motors.html', 'ocean-galleria.html'
];

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const requestPath = (req.url || '/').split('?')[0];
      const filePath = resolveStatic(ROOT, requestPath === '/' ? '/index.html' : requestPath);
      if (!filePath) return res.writeHead(403).end('Forbidden');
      fs.readFile(filePath, (error, data) => {
        if (error) return res.writeHead(404).end('Not found');
        res.writeHead(200).end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('company pages keep document width within the mobile viewport', { timeout: 120000 }, async (t) => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ROUTES) {
      await page.goto(`http://127.0.0.1:${server.address().port}/${route}`, { waitUntil: 'domcontentloaded' });
      const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, documentWidth: document.documentElement.scrollWidth }));
      assert.ok(
        dimensions.documentWidth <= dimensions.viewport + 1,
        `${route} at ${width}px overflows: ${dimensions.documentWidth}px document / ${dimensions.viewport}px viewport`
      );
    }
  }

  assert.deepStrictEqual(errors, [], 'company route rendering must not raise page errors');
});
