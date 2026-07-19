'use strict';
/**
 * Verify LogoLoop paths + nav logo heights on home + subsidiaries.
 * Usage: node scripts/_verify_logoloop_nav.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const PORT = 8765;

const logos = [
  'assets/images/logos/companies/lake-oil.png',
  'assets/images/logos/companies/lake-gas.png',
  'assets/images/logos/companies/lake-lubes.png',
  'assets/images/logos/companies/lake-steel.png',
  'assets/images/logos/companies/lake-trans.png',
  'assets/images/logos/companies/lake-aviation.png',
  'assets/images/logos/companies/lake-buildings.png',
  'assets/images/logos/companies/lake-plastics.png',
  'assets/images/logos/companies/lake-premix-cement.png',
  'assets/images/logos/companies/gulf-aggregates.png',
  'assets/images/logos/companies/cross-country.png',
  'assets/images/logos/companies/ocean-galleria.png',
];

console.log('=== Path verification ===');
let missing = 0;
for (const rel of logos) {
  const full = path.join(ROOT, rel);
  const ok = fs.existsSync(full);
  if (!ok) missing += 1;
  console.log(ok ? 'OK ' : 'MISS', rel);
}
if (missing) {
  console.error('FAIL: missing logo files');
  process.exit(1);
}

const css = fs.readFileSync(path.join(ROOT, 'assets/components/LogoLoop.css'), 'utf8');
const mount = fs.readFileSync(path.join(ROOT, 'assets/components/logo-loop-mount.js'), 'utf8');
const jsx = fs.readFileSync(path.join(ROOT, 'assets/components/LogoLoop.jsx'), 'utf8');

const checks = [
  [/list-style:\s*none/, css, 'LogoLoop.css list-style reset'],
  [/\.logoloop__list\s*\{[^}]*margin:\s*0/s, css, 'LogoLoop.css list margin reset'],
  [/\.logoloop__list\s*\{[^}]*padding:\s*0/s, css, 'LogoLoop.css list padding reset'],
  [/hideFailedLogoItem|closest\('\.logoloop__item'\)/, mount, 'mount onError hide'],
  [/onError=\{e =>/, jsx, 'JSX onError hide'],
  [/speed:\s*60/, mount, 'mount speed 60'],
  [/logoHeight:\s*44/, mount, 'mount logoHeight 44'],
  [/gap:\s*48/, mount, 'mount gap 48'],
  [/fadeOutColor:\s*'var\(--color-yellow-accent\)'/, mount, 'fade color token'],
  [/max-width:\s*none\s*!important/, fs.readFileSync(path.join(ROOT, 'assets/flagship.css'), 'utf8'), 'flagship nav max-width none'],
  [/nav-logo-img--letterboxed/, fs.readFileSync(path.join(ROOT, 'assets/site.js'), 'utf8'), 'site.js letterbox class'],
  [/--nav-logo-letterbox-scale/, fs.readFileSync(path.join(ROOT, 'assets/tokens.css'), 'utf8'), 'letterbox scale token'],
];

console.log('\n=== Static checks ===');
let failed = 0;
for (const [re, src, label] of checks) {
  const ok = re.test(src);
  console.log(ok ? 'OK ' : 'FAIL', label);
  if (!ok) failed += 1;
}

async function tryBrowser() {
  try {
    const puppeteer = require('puppeteer-core');
    const chrome =
      process.env.CHROME_PATH ||
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    return { puppeteer, chrome };
  } catch (_) {
    return null;
  }
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, ''));
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found: ' + urlPath);
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const types = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.json': 'application/json',
          '.woff2': 'font/woff2',
        };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const browserKit = await tryBrowser();
  if (!browserKit) {
    console.log('\n(no puppeteer-core - skipping live DOM height check)');
    if (failed) process.exit(1);
    console.log('\nALL STATIC CHECKS PASSED');
    process.exit(0);
  }

  const server = await startServer();
  const browser = await browserKit.puppeteer.launch({
    executablePath: browserKit.chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const pages = ['index.html', 'lake-lubes.html', 'lake-oil.html'];
  console.log('\n=== Live DOM checks ===');
  try {
    for (const pageName of pages) {
      const page = await browser.newPage();
      const failedUrls = [];
      page.on('response', (res) => {
        const u = res.url();
        if (u.includes('/logos/') && res.status() >= 400) failedUrls.push(u + ' ' + res.status());
      });
      await page.goto(`http://127.0.0.1:${PORT}/${pageName}`, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
      await new Promise((r) => setTimeout(r, 800));
      const data = await page.evaluate(() => {
        const img = document.querySelector('.site-nav .nav-logo img');
        const rect = img ? img.getBoundingClientRect() : null;
        const loop = document.querySelector('#hero-logo-loop .logoloop');
        const items = loop ? [...loop.querySelectorAll('.logoloop__item')] : [];
        const visibleItems = items.filter((li) => getComputedStyle(li).display !== 'none');
        const imgs = loop ? [...loop.querySelectorAll('img')] : [];
        const broken = imgs.filter((i) => !i.complete || i.naturalWidth === 0);
        const listEl = loop ? loop.querySelector('.logoloop__list') : null;
        const listStyleType = listEl ? getComputedStyle(listEl).listStyleType : null;
        const bullets = items.some(
          (li) => getComputedStyle(li).listStyleType !== 'none' && getComputedStyle(li).display !== 'none'
        );
        return {
          src: img ? img.getAttribute('src') : null,
          cssHeight: img ? getComputedStyle(img).height : null,
          boxHeight: rect ? Math.round(rect.height * 10) / 10 : null,
          boxWidth: rect ? Math.round(rect.width * 10) / 10 : null,
          letterboxed: img ? img.classList.contains('nav-logo-img--letterboxed') : false,
          natural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
          loopPresent: !!loop,
          loopItemCount: visibleItems.length,
          brokenCount: broken.length,
          listStyleType,
          hasBulletListStyle: bullets,
          logoHeightVar: loop
            ? getComputedStyle(loop).getPropertyValue('--logoloop-logoHeight').trim()
            : null,
          gapVar: loop ? getComputedStyle(loop).getPropertyValue('--logoloop-gap').trim() : null,
        };
      });
      console.log(pageName, JSON.stringify(data));
      if (failedUrls.length) {
        console.log('  404s:', failedUrls);
        failed += 1;
      }
      if (pageName === 'index.html') {
        if (!data.loopPresent || data.brokenCount > 0 || data.hasBulletListStyle) failed += 1;
        if (data.logoHeightVar !== '44px' || data.gapVar !== '48px') {
          console.log('  FAIL: unexpected loop metrics', data.logoHeightVar, data.gapVar);
          failed += 1;
        }
        if (data.loopItemCount < 20) {
          console.log('  WARN: expected >=20 visible loop items, got', data.loopItemCount);
        }
        if (data.boxHeight < 55 || data.boxHeight > 65) {
          console.log('  FAIL: home nav logo height unexpected', data.boxHeight);
          failed += 1;
        }
      }
      if (pageName !== 'index.html') {
        if (data.letterboxed && data.boxHeight < 90) {
          console.log('  FAIL: letterboxed company logo still undersized', data.boxHeight);
          failed += 1;
        }
        if (!data.letterboxed && (data.boxHeight < 55 || data.boxHeight > 65)) {
          console.log('  FAIL: wide company logo height unexpected', data.boxHeight);
          failed += 1;
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failed) {
    console.error('\nFAILED checks:', failed);
    process.exit(1);
  }
  console.log('\nALL CHECKS PASSED');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
