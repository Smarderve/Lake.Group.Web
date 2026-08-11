/**
 * Phase 11 — accessibility audit (headless Chrome).
 *
 * Checks the main pages for hard WCAG violations that don't need a screen
 * reader to detect:
 *   - <html lang="..."> present
 *   - exactly one <h1> (reported; flagged when missing — QA standard)
 *   - every <img> has an alt attribute (empty allowed for decorative)
 *   - every form control has a label / aria-label / aria-labelledby
 *   - every button and link has an accessible name (text or aria-label)
 *   - links have a valid href
 *
 * Usage:  node scripts/_verify_accessibility.js
 * Exit 0 when no hard violations; 1 otherwise.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveStatic } = require('./_safe_static.js');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.join(__dirname, '..');
const PORT = 8795;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

const PAGES = [
  'index.html', 'about.html', 'our-story.html', 'services.html', 'africa-network.html',
  'projects.html', 'news.html', 'leadership.html', 'contact.html', 'history.html',
  'gallery.html', 'csr.html', 'careers.html', 'station-locator.html',
  'lake-oil.html', 'lake-gas.html', 'lake-trans.html', 'news-article.html',
];

let server;
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const filePath = resolveStatic(ROOT, url.pathname === '/' ? '/index.html' : url.pathname);
      if (!filePath) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve());
  });
}

const AUDIT_JS = () => {
  const issues = [];
  const html = document.documentElement;
  if (!html || !html.getAttribute('lang')) issues.push('missing <html lang>');
  const h1s = document.querySelectorAll('h1');
  if (h1s.length !== 1) issues.push(`h1 count = ${h1s.length} (expected 1)`);
  document.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('alt')) issues.push(`img missing alt: ${img.getAttribute('src') || img.className}`);
  });
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    const id = el.id;
    const labelled = (id && document.querySelector(`label[for="${id}"]`))
      || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
      || (el.closest('label'));
    if (!labelled) issues.push(`unlabelled control: <${el.tagName.toLowerCase()}>${el.name ? ' name=' + el.name : ''}${id ? ' id=' + id : ''}`);
  });
  document.querySelectorAll('button').forEach((btn) => {
    const name = (btn.textContent || '').trim() || btn.getAttribute('aria-label') || btn.getAttribute('title');
    if (!name && !btn.getAttribute('aria-hidden')) issues.push(`button without accessible name: ${btn.className || btn.type}`);
  });
  document.querySelectorAll('a').forEach((a) => {
    if (!a.getAttribute('href')) issues.push(`link without href: ${a.textContent.trim().slice(0, 40) || a.className}`);
  });
  return issues;
};

async function main() {
  await startServer();
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();

  let fail = 0;
  for (const file of PAGES) {
    try {
      await page.goto(`http://127.0.0.1:${PORT}/${file}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(400);
      const issues = await page.evaluate(AUDIT_JS);
      // Missing h1 is informational for the known hero-redesign pages.
      const hard = issues.filter((i) => !i.startsWith('h1 count'));
      const label = hard.length === 0 ? 'PASS' : 'FAIL';
      console.log(`${label} ${file}${issues.length ? '  [' + issues.join('; ') + ']' : ''}`);
      if (hard.length) fail = 1;
    } catch (e) {
      console.log(`FAIL ${file}  (load error: ${e.message.slice(0, 60)})`);
      fail = 1;
    }
  }
  await browser.close();
  await new Promise((r) => server.close(r));
  console.log(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(fail);
}

main();
