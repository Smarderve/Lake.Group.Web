#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const PORT = 8788;
const OUT = path.join(ROOT, 'scripts', '_live_verify_out.json');

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.join(ROOT, urlPath.replace(/^\//, ''));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('404 ' + urlPath);
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    process.env.LOCALAPPDATA + '\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
    'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe'
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const probeHtml = `<!DOCTYPE html><html><body><pre id="out">running</pre>
<script>
(async () => {
  const base = 'http://127.0.0.1:${PORT}';
  async function load(p) {
    const html = await (await fetch(base + '/' + p)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // execute inline? skip - instead open in iframe
    return doc;
  }
  const report = { note: 'fallback-no-cdp' };
  document.getElementById('out').textContent = JSON.stringify(report);
})();
</script></body></html>`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const browser = findBrowser();
  console.log('browser', browser);
  if (!browser) {
    // Static file verification without browser
    const report = staticVerify();
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    server.close();
    return;
  }

  // Use playwright-core connecting to channel if available, else static
  let used = false;
  try {
    const pwPath = path.join(ROOT, 'scripts', '_tmp_pw', 'node_modules', 'playwright');
    const playwright = fs.existsSync(pwPath) ? require(pwPath) : require('playwright');
    const b = await playwright.chromium.launch({
      executablePath: browser,
      headless: true
    });
    used = true;
    const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const report = {};

    async function measure(sel) {
      return page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          height: cs.height,
          maxHeight: cs.maxHeight,
          rectH: Math.round(r.height * 10) / 10,
          rectW: Math.round(r.width * 10) / 10,
          naturalW: el.naturalWidth || null,
          naturalH: el.naturalHeight || null,
          className: el.className,
          src: el.getAttribute('src')
        };
      }, sel);
    }

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    report.home = {
      navLogo: await measure('.site-nav .nav-logo img'),
      footerLogo: await measure('.site-footer .footer-logo img'),
      marqueeBg: await page.evaluate(() => getComputedStyle(document.querySelector('.marquee-wrap')).backgroundColor),
      marqueeH: await page.evaluate(() => Math.round(document.querySelector('.marquee-wrap').getBoundingClientRect().height)),
      loop: await page.evaluate(() => {
        const list = document.querySelector('.logoloop__list');
        const imgs = [...document.querySelectorAll('#hero-logo-loop img')];
        const links = [...document.querySelectorAll('#hero-logo-loop a.logoloop__link')];
        return {
          listStyle: list ? getComputedStyle(list).listStyleType : null,
          imgCount: imgs.length,
          imgH: imgs[0] ? getComputedStyle(imgs[0]).height : null,
          blankTargets: links.filter((a) => a.target === '_blank').length,
          sampleHrefs: links.slice(0, 14).map((a) => a.getAttribute('href')),
          fade: getComputedStyle(document.querySelector('.logoloop')).getPropertyValue('--logoloop-fadeColor')
        };
      })
    };

    await page.evaluate(() => localStorage.setItem('lake-lang', 'ar'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    report.ar = await page.evaluate(() => ({
      badge: document.querySelector('.about-badge p')?.textContent,
      badgeNum: document.querySelector('.about-badge .num')?.textContent,
      nums: [...document.querySelectorAll('.hero-stat-num')].map((e) => e.textContent.trim()),
      stripNums: [...document.querySelectorAll('.stat-number')].map((e) => e.textContent.trim()),
      about: document.querySelector('[data-i18n="index.33"]')?.textContent?.slice(0, 180),
      eyebrow: document.querySelector('[data-i18n="hero.eyebrow"]')?.textContent,
      latinGeo: (document.body.innerText.match(/Dar es Salaam|\\bTanzania\\b|\\bKenya\\b|Central Africa/g) || []).slice(0, 20)
    }));

    await page.evaluate(() => localStorage.setItem('lake-lang', 'en'));
    await page.goto(`http://127.0.0.1:${PORT}/lake-lubes.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    report.lubes = {
      nav: await measure('.site-nav .nav-logo img'),
      letterbox: await page.evaluate(() =>
        document.querySelector('.site-nav .nav-logo img')?.classList.contains('nav-logo-img--letterboxed')
      ),
      company: await page.evaluate(() =>
        document.querySelector('.site-nav .nav-logo')?.classList.contains('nav-logo--company')
      ),
      footer: await measure('.site-footer .footer-logo img'),
      footerSrc: await page.evaluate(() => document.querySelector('.site-footer .footer-logo img')?.getAttribute('src'))
    };

    await page.goto(`http://127.0.0.1:${PORT}/lake-gas.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    report.gas = {
      nav: await measure('.site-nav .nav-logo img'),
      letterbox: await page.evaluate(() =>
        document.querySelector('.site-nav .nav-logo img')?.classList.contains('nav-logo-img--letterboxed')
      ),
      footer: await measure('.site-footer .footer-logo img')
    };

    await page.goto(`http://127.0.0.1:${PORT}/atl.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    report.atl = {
      title: await page.title(),
      h1: await page.evaluate(() => document.querySelector('.page-hero h1')?.textContent),
      navSrc: await page.evaluate(() => document.querySelector('.site-nav .nav-logo img')?.getAttribute('src')),
      img404: await page.evaluate(async () => {
        const imgs = [...document.querySelectorAll('img')].slice(0, 30);
        const bad = [];
        for (const img of imgs) {
          if (!img.complete || img.naturalWidth === 0) bad.push(img.src);
        }
        return bad.slice(0, 10);
      })
    };

    await page.goto(`http://127.0.0.1:${PORT}/lake-agro.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    report.agro = {
      title: await page.title(),
      theme: await page.evaluate(() => document.body.classList.contains('co-theme-agro')),
      gold: await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--gold').trim()),
      navSrc: await page.evaluate(() => document.querySelector('.site-nav .nav-logo img')?.getAttribute('src'))
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    report.mobile = {
      footer: await measure('.site-footer .footer-logo img'),
      marqueeH: await page.evaluate(() => Math.round(document.querySelector('.marquee-wrap').getBoundingClientRect().height)),
      nav: await measure('.site-nav .nav-logo img')
    };

    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await b.close();
  } catch (e) {
    console.log('browser verify failed', e.message);
    const report = staticVerify();
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
  server.close();
})();

function staticVerify() {
  const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
  const pngDims = (p) => {
    const b = fs.readFileSync(path.join(ROOT, p));
    return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20);
  };
  const j = JSON.parse(read('assets/i18n-content.json'));
  const mount = read('assets/components/logo-loop-mount.js');
  const idx = read('index.html');
  const logos = [...mount.matchAll(/src: '([^']+\.png)'/g)].map((m) => m[1]);
  const missing = logos.filter((p) => !fs.existsSync(path.join(ROOT, p)));
  let ext = [];
  for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
    if (/href="https:\/\/atl-tz\.com"|href="https:\/\/lakeagro\.com/.test(read(f))) ext.push(f);
  }
  return {
    mode: 'static',
    logos,
    missing,
    fade: (mount.match(/fadeOutColor: '([^']+)'/) || [])[1],
    marqueeBlue: /background:\s*var\(--color-brand-blue\)/.test(idx),
    yellowBorder: /border-top:\s*2px solid var\(--color-yellow-accent\)/.test(idx),
    aboutBadge: /about\.badge/.test(idx),
    arHero: j.ar['hero.eyebrow'],
    arBadge: j.ar['about.badge'],
    darLatinAr: /\bDar es Salaam\b/.test(JSON.stringify(j.ar)),
    lubesPng: pngDims('assets/images/logos/companies/lake-lubes.png'),
    atlPng: pngDims('assets/images/logos/companies/atl.png'),
    agroPng: pngDims('assets/images/logos/companies/lake-agro.png'),
    externalHrefs: ext,
    agroThemeCss: /body\.co-theme-agro\s*\{/.test(read('lake-agro.html')),
    footerToken: /footer-logo-height/.test(read('assets/tokens.css'))
  };
}
