// One-off QA script: renders mandatory pages at 1440 and 390 to verify no
// decorative ticks / paired rules / leftover spacing remain after cleanup.
// Temporary helper with a leading underscore per repo rules; removed after use.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/qa/tick-cleanup-20260911');
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) throw new Error('traversal');
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const PAGES = process.argv[2]
  ? process.argv[2].split(',')
  : ['lake-oil.html', 'lake-gas.html', 'lake-steel.html', 'lake-premix-cement.html', 'index.html', 'about.html', 'aficd.html', 'lake-cylinders.html'];

const { chromium } = await import('playwright');
const browser = await chromium.launch();

for (const page of PAGES) {
  for (const width of [1440, 390]) {
    const p = await browser.newPage({ viewport: { width, height: 900 } });
    const pageErrors = new Set();
    p.on('pageerror', (e) => pageErrors.add(e.message.split('\n')[0].slice(0, 120)));
    try {
      await p.goto(`${BASE}/${page}`, { waitUntil: 'commit', timeout: 60000 });
      await p.waitForTimeout(2500);

      const m = await p.evaluate(() => {
        const doc = document.documentElement;
        // any decorative tick visible anywhere?
        const all = document.querySelectorAll('iconify-icon, li, ul, span, div');
        let tickVisible = false;
        for (const el of all) {
          const cs = getComputedStyle(el, '::before');
          if (cs && cs.content && cs.content.includes('\u2713')) tickVisible = true;
          if (el.tagName === 'ICONIFY-ICON' && (el.getAttribute('icon') || '').includes('check')) tickVisible = true;
        }
        const anyFsCheck = document.querySelectorAll('.fs-check li').length;
        const borderSample = anyFsCheck ? getComputedStyle(document.querySelector('.fs-check li')).borderBottomWidth : null;
        return {
          tickVisible,
          anyFsCheck,
          borderSample,
          overflow: doc.scrollWidth > window.innerWidth + 1,
        };
      });
      await p.screenshot({ path: join(OUT, `${page.replace('.html', '')}-${width}.png`), fullPage: false });
      console.log(
        `${page} @${width}: tickVisible=${m.tickVisible} fsCheckItems=${m.anyFsCheck} liBorder=${m.borderSample} overflow=${m.overflow} errors=${pageErrors.size ? [...pageErrors].join(' | ') : 'none'}`
      );
    } catch (err) {
      console.log(`${page} @${width}: RENDER FAIL ${err.message.split('\n')[0]}`);
    } finally {
      await p.close().catch(() => {});
    }
  }
}
await browser.close().catch(() => {});
try { server.close(); server.closeAllConnections(); } catch {}
console.log('DONE');
setTimeout(() => process.exit(0), 500);
