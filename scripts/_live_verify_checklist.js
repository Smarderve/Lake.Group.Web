#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT = 8777;

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
    res.end('404');
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withPlaywright(fn) {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (_) {
    try {
      execFileSync('npm', ['install', 'playwright', '--no-save', '--prefix', path.join(ROOT, 'scripts', '_tmp_pw')], {
        stdio: 'inherit',
        cwd: ROOT,
        shell: true
      });
      playwright = require(path.join(ROOT, 'scripts', '_tmp_pw', 'node_modules', 'playwright'));
    } catch (e) {
      console.log('NO_PLAYWRIGHT', e.message);
      return null;
    }
  }
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function measure(page, sel) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      className: el.className,
      height: cs.height,
      maxHeight: cs.maxHeight,
      width: cs.width,
      rectH: Math.round(r.height * 10) / 10,
      rectW: Math.round(r.width * 10) / 10,
      naturalW: el.naturalWidth || null,
      naturalH: el.naturalHeight || null,
      src: el.getAttribute('src')
    };
  }, sel);
}

(async () => {
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  console.log('server', PORT);

  const result = await withPlaywright(async (browser) => {
    const out = {};
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // Homepage
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
    await sleep(800);
    out.home = {
      navLogo: await measure(page, '.site-nav .nav-logo img'),
      footerLogo: await measure(page, '.site-footer .footer-logo img'),
      marqueeBg: await page.evaluate(() => getComputedStyle(document.querySelector('.marquee-wrap')).backgroundColor),
      marqueeH: await page.evaluate(() => Math.round(document.querySelector('.marquee-wrap').getBoundingClientRect().height)),
      loopImgs: await page.evaluate(() => {
        const imgs = [...document.querySelectorAll('#hero-logo-loop .logoloop__item img')];
        return {
          count: imgs.length,
          bullets: getComputedStyle(document.querySelector('.logoloop__list') || document.body).listStyleType,
          heights: imgs.slice(0, 3).map((i) => getComputedStyle(i).height),
          failedHidden: [...document.querySelectorAll('.logoloop__item')].filter((li) => li.style.display === 'none')
            .length,
          hrefs: [...document.querySelectorAll('#hero-logo-loop .logoloop__link')]
            .slice(0, 16)
            .map((a) => ({ href: a.getAttribute('href'), target: a.getAttribute('target') }))
        };
      }),
      fadeColor: await page.evaluate(() =>
        getComputedStyle(document.querySelector('.logoloop')).getPropertyValue('--logoloop-fadeColor')
      )
    };

    // Arabic digits + places
    await page.evaluate(() => localStorage.setItem('lake-lang', 'ar'));
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(1000);
    out.ar = await page.evaluate(() => {
      const badge = document.querySelector('.about-badge p');
      const nums = [...document.querySelectorAll('.hero-stat-num, .stat-number')]
        .slice(0, 6)
        .map((el) => el.textContent.trim());
      const about = document.querySelector('[data-i18n="index.33"]');
      const eyebrow = document.querySelector('[data-i18n="hero.eyebrow"]');
      return {
        badge: badge && badge.textContent,
        nums,
        about: about && about.textContent.slice(0, 160),
        eyebrow: eyebrow && eyebrow.textContent,
        hasDarLatin: /Dar es Salaam|Tanzania|Kenya/.test(document.body.innerText.slice(0, 8000))
      };
    });

    // Subsidiary lubes
    await page.evaluate(() => localStorage.setItem('lake-lang', 'en'));
    await page.goto(`http://127.0.0.1:${PORT}/lake-lubes.html`, { waitUntil: 'networkidle' });
    await sleep(900);
    out.lubes = {
      navLogo: await measure(page, '.site-nav .nav-logo img'),
      letterboxed: await page.evaluate(() =>
        document.querySelector('.site-nav .nav-logo img').classList.contains('nav-logo-img--letterboxed')
      ),
      companyClass: await page.evaluate(() =>
        document.querySelector('.site-nav .nav-logo').classList.contains('nav-logo--company')
      ),
      footerLogo: await measure(page, '.site-footer .footer-logo img'),
      footerSrc: await page.evaluate(() => document.querySelector('.site-footer .footer-logo img').getAttribute('src'))
    };

    // Subsidiary gas
    await page.goto(`http://127.0.0.1:${PORT}/lake-gas.html`, { waitUntil: 'networkidle' });
    await sleep(900);
    out.gas = {
      navLogo: await measure(page, '.site-nav .nav-logo img'),
      letterboxed: await page.evaluate(() =>
        document.querySelector('.site-nav .nav-logo img').classList.contains('nav-logo-img--letterboxed')
      ),
      footerLogo: await measure(page, '.site-footer .footer-logo img')
    };

    // ATL + Agro pages
    await page.goto(`http://127.0.0.1:${PORT}/atl.html`, { waitUntil: 'networkidle' });
    await sleep(600);
    out.atl = {
      title: await page.title(),
      navSrc: await page.evaluate(() => document.querySelector('.site-nav .nav-logo img').getAttribute('src')),
      ok: await page.evaluate(() => !!document.querySelector('.page-hero h1'))
    };
    await page.goto(`http://127.0.0.1:${PORT}/lake-agro.html`, { waitUntil: 'networkidle' });
    await sleep(600);
    out.agro = {
      title: await page.title(),
      theme: await page.evaluate(() => document.body.classList.contains('co-theme-agro')),
      navSrc: await page.evaluate(() => document.querySelector('.site-nav .nav-logo img').getAttribute('src')),
      ok: await page.evaluate(() => !!document.querySelector('.page-hero h1'))
    };

    // Mobile viewport home footer
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
    await sleep(500);
    out.mobileFooter = await measure(page, '.site-footer .footer-logo img');
    out.mobileMarqueeH = await page.evaluate(() =>
      Math.round(document.querySelector('.marquee-wrap').getBoundingClientRect().height)
    );

    return out;
  });

  console.log(JSON.stringify(result, null, 2));
  server.close();
  if (!result) process.exit(2);
})().catch((e) => {
  console.error(e);
  server.close();
  process.exit(1);
});
