import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'docs', 'qa', 'forms');
await fs.mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://local').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(`${root}${path.sep}`)) throw new Error('outside root');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [360, 390, 412, 430]) for (const name of ['contact', 'careers']) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.route(/\/api\/(?:contact|careers)\/token$/, (route) => route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ token: 'browser-qa-token', startedAt: Date.now() - 5000 }) }));
    await page.route(/\/api\/(?:contact\/messages|careers\/applications)$/, (route) => route.fulfill({ status: 201,
      contentType: 'application/json', body: JSON.stringify({ ok: true, requestId: 'browser-qa' }) }));
    await page.goto(`http://127.0.0.1:${server.address().port}/${name}.html`, { waitUntil: 'domcontentloaded' });
    const form = page.locator(name === 'contact' ? '#contact-message-form' : '#career-application-form');
    await form.waitFor();
    await form.scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    const fontSize = await form.locator('input[type="email"]').evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    await form.screenshot({ path: path.join(output, `${name}-${width}.png`) });
    if (width === 390) {
      if (name === 'contact') {
        await page.locator('#contact-name').fill('Browser QA');
        await page.locator('#contact-email').fill('qa@example.com');
        await page.locator('#contact-subject').fill('Delivery check');
        await page.locator('#contact-message').fill('This is a controlled browser submission check.');
        await page.locator('#contact-consent').check();
      } else {
        await page.locator('#career-name').fill('Browser QA');
        await page.locator('#career-email').fill('qa@example.com');
        await page.locator('#career-phone').fill('+255700000000');
        await page.locator('#career-nationality').fill('Tanzanian');
        await page.locator('#career-cover-letter').fill('Controlled application browser check.');
        await page.locator('#career-cv').setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\nstartxref\n9\n%%EOF') });
        await page.locator('#career-consent').check();
      }
      await form.locator('button[type="submit"]').click();
      const message = await page.locator(name === 'contact' ? '#contact-form-status' : '#career-form-status').textContent();
      if (!message?.includes(name === 'contact' ? 'Message sent successfully.' : 'Application submitted successfully.')) {
        throw new Error(`${name} mocked submission did not complete: ${message}`);
      }
      if (name === 'contact') {
        await page.route(/\/api\/contact\/messages$/, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"DELIVERY_TEMPORARILY_UNAVAILABLE"}}' }));
        await page.locator('#contact-name').fill('Preserve my details');
        await page.locator('#contact-email').fill('qa@example.com');
        await page.locator('#contact-subject').fill('Retry check');
        await page.locator('#contact-message').fill('My enquiry must remain after a service failure.');
        await page.locator('#contact-consent').check();
        await form.locator('button[type="submit"]').click();
        if (await page.locator('#contact-name').inputValue() !== 'Preserve my details') throw new Error('Contact error cleared visitor details');
      }
    }
    results.push({ name, width, overflow, fontSize });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(results, null, 2));
if (results.some((item) => item.overflow || item.fontSize < 16)) {
  console.error(results);
  process.exit(1);
}
console.log(`Public form mobile QA passed: ${results.length} viewport/page combinations; zero overflow; input font >= 16px.`);
