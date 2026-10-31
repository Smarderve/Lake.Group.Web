/**
 * Arabic RTL + shaping audit for every public route.
 *
 * Loads each root HTML page in Arabic at desktop and mobile widths and checks:
 *   1. the document is RTL,
 *   2. no Arabic text block inherits left alignment,
 *   3. no Arabic text sits in an LTR context (numbers inside dir="ltr" exempt),
 *   4. Arabic copy is never split into per-character spans (joined letters),
 *   5. no horizontal overflow is introduced by the Arabic layout.
 *
 * Usage: node scripts/verify-arabic-rtl.mjs [--pages=index.html,about.html]
 * Writes docs/reports/arabic-rtl-verification.md and exits non-zero on failure.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs', 'reports', 'arabic-rtl-verification.md');
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

const pageFilter = process.argv.find((arg) => arg.startsWith('--pages='))?.slice('--pages='.length).split(',').filter(Boolean);
const pages = fs.readdirSync(ROOT)
  .filter((name) => name.endsWith('.html'))
  .filter((name) => !pageFilter || pageFilter.includes(name))
  .sort();
const server = http.createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(ROOT, raw);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true });

/** Runs inside the page: collects Arabic typography defects. */
const auditPage = () => {
  const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFC]/;
  const visible = (el) => (typeof el.checkVisibility === 'function'
    ? el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: false })
    : !!el.offsetParent);
  const pathOf = (el) => {
    const parts = [];
    for (let node = el; node && node !== document.body && parts.length < 5; node = node.parentElement) {
      const cls = (node.className || '').toString().split(/\s+/).filter(Boolean).slice(0, 2);
      parts.unshift(node.tagName.toLowerCase() + (node.id ? `#${node.id}` : '') + cls.map((c) => `.${c}`).join(''));
    }
    return parts.join(' > ');
  };
  const result = { leftAligned: [], ltrArabic: [], splitArabic: [], suspiciousRects: [], overflow: 0, arabicBlocks: 0, centered: 0 };

  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('script, style, template, svg, canvas, [hidden], [aria-hidden="true"]')) continue;
    const ownText = [...el.childNodes]
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!ownText || !ARABIC.test(ownText) || !visible(el)) continue;
    result.arabicBlocks += 1;
    const style = getComputedStyle(el);
    if (style.textAlign === 'left') result.leftAligned.push({ where: pathOf(el), text: ownText.slice(0, 60) });
    if (style.textAlign === 'center') result.centered += 1;
    if (style.direction === 'ltr' && !el.closest('[dir="ltr"]')) result.ltrArabic.push({ where: pathOf(el), text: ownText.slice(0, 60) });
    if (el.closest('.split-char')) result.splitArabic.push({ where: pathOf(el), text: ownText.slice(0, 60) });
  }

  for (const span of document.querySelectorAll('.split-char')) {
    if (!ARABIC.test(span.textContent || '') || !visible(span)) continue;
    if (!result.splitArabic.some((entry) => entry.where === pathOf(span.parentElement))) {
      result.splitArabic.push({ where: pathOf(span.parentElement), text: (span.parentElement.textContent || '').slice(0, 60) });
    }
  }

  // A shaped Arabic run has roughly one client rect per visual line. Dozens of
  // rects for a one-line block means glyphs are isolated in their own boxes.
  // Mixed Arabic/Latin/number strings legitimately produce extra bidi-run rects,
  // so only pure-Arabic prose is measured here.
  const BIDI_MIXED = /[0-9A-Za-z\u0660-\u0669\u06F0-\u06F9\u200e\u200f\u2066-\u2069]/;
  for (const el of document.querySelectorAll('h1, h2, h3, p, li, .fs-display, .fs-lede')) {
    if (!visible(el)) continue;
    const text = (el.textContent || '').trim();
    if (!ARABIC.test(text) || text.length < 6 || el.querySelector('*') || BIDI_MIXED.test(text)) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = range.getClientRects().length;
    const style = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3;
    const lines = Math.max(1, Math.round(el.getBoundingClientRect().height / lineHeight));
    if (rects > lines * 3 + 2) result.suspiciousRects.push({ where: pathOf(el), text: text.slice(0, 60), rects, lines });
  }

  result.overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
  result.dir = document.documentElement.dir;
  result.lang = document.documentElement.lang;
  return result;
};

const rows = [];
const failures = [];

for (const page of pages) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      serviceWorkers: 'block',
    });
    const tab = await context.newPage();
    await tab.addInitScript(() => {
      try { localStorage.setItem('lake-lang', 'ar'); } catch (error) { /* ignore */ }
      // Record whether Arabic ever lands in per-character boxes, including the
      // animated first frames that a settled-state-only audit would miss.
      window.__arabicSplitSeen = false;
      const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFC]/;
      (function watch() {
        for (const span of document.querySelectorAll('.split-char')) {
          if (ARABIC.test(span.textContent || '')) { window.__arabicSplitSeen = true; break; }
        }
        requestAnimationFrame(watch);
      })();
    });
    let audit;
    let error = null;
    try {
      await tab.goto(`${baseUrl}/${page}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await tab.waitForFunction(() => window.LakeI18n && window.LakeI18n.current === 'ar' && !document.documentElement.classList.contains('lake-i18n-booting'), null, { timeout: 20000 });
      await tab.evaluate(() => document.fonts?.ready);
      await tab.waitForTimeout(1200);
      // Reveal surfaces that start collapsed so their Arabic copy is measured too.
      await tab.evaluate(() => document.querySelectorAll('details').forEach((node) => { node.open = true; }));
      if (viewport.name === 'desktop') {
        const verticals = tab.locator('#nav-companies-trigger').first();
        if (await verticals.count()) { await verticals.hover().catch(() => {}); await tab.waitForTimeout(350); }
        const language = tab.locator('.lang-trigger:visible').first();
        if (await language.count()) { await language.click().catch(() => {}); await tab.waitForTimeout(350); }
      } else {
        const toggle = tab.locator('#nav-toggle, .nav-toggle').first();
        if (await toggle.count()) { await toggle.click().catch(() => {}); await tab.waitForTimeout(400); }
        const drawerLanguage = tab.locator('.mob-language-trigger:visible').first();
        if (await drawerLanguage.count()) { await drawerLanguage.click().catch(() => {}); await tab.waitForTimeout(300); }
      }
      audit = await tab.evaluate(auditPage);
      audit.splitArabicFirstFrames = await tab.evaluate(() => window.__arabicSplitSeen === true);
    } catch (cause) {
      error = cause.message.split('\n')[0];
    }
    await context.close();

    const row = {
      page,
      viewport: viewport.name,
      error,
      dir: audit?.dir ?? null,
      arabicBlocks: audit?.arabicBlocks ?? 0,
      centered: audit?.centered ?? 0,
      leftAligned: audit?.leftAligned ?? [],
      ltrArabic: audit?.ltrArabic ?? [],
      splitArabic: audit?.splitArabic ?? [],
      splitArabicDuringLoad: audit?.splitArabicFirstFrames ?? false,
      suspiciousRects: audit?.suspiciousRects ?? [],
      overflow: audit?.overflow ?? 0,
    };
    rows.push(row);
    const bad = error || row.dir !== 'rtl' || row.leftAligned.length || row.ltrArabic.length
      || row.splitArabic.length || row.splitArabicDuringLoad || row.suspiciousRects.length || row.overflow > 1;
    if (bad) failures.push(row);
    console.log(`${bad ? 'FAIL' : 'ok  '} ${page} [${viewport.name}] blocks=${row.arabicBlocks} left=${row.leftAligned.length} ltr=${row.ltrArabic.length} split=${row.splitArabic.length} splitFirstFrames=${row.splitArabicDuringLoad} rects=${row.suspiciousRects.length} overflow=${row.overflow}${error ? ` error=${error}` : ''}`);
  }
}

await browser.close();
await new Promise((resolve) => server.close(resolve));

const passing = rows.length - failures.length;
const lines = [
  '# Arabic RTL and shaping verification',
  '',
  `Generated by \`scripts/verify-arabic-rtl.mjs\` — ${rows.length} route/viewport combinations across ${pages.length} routes at 1440×900 and 390×844, with the Arabic locale stored before load.`,
  '',
  `**Result: ${passing}/${rows.length} passing.**`,
  '',
  '| Route | Viewport | RTL | Arabic blocks | Left-aligned | LTR context | Split glyphs | Suspect rects | Centered | Overflow |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.page} | ${row.viewport} | ${row.error ? `error: ${row.error}` : row.dir === 'rtl' ? 'yes' : 'NO'} | ${row.arabicBlocks} | ${row.leftAligned.length} | ${row.ltrArabic.length} | ${row.splitArabic.length} | ${row.suspiciousRects.length} | ${row.centered} | ${row.overflow}px |`),
];

if (failures.length) {
  lines.push('', '## Exceptions', '');
  for (const row of failures) {
    lines.push(`### ${row.page} (${row.viewport})`, '');
    if (row.error) lines.push(`- load error: ${row.error}`);
    if (row.dir && row.dir !== 'rtl') lines.push(`- document dir is ${row.dir}, expected rtl`);
    for (const item of row.leftAligned) lines.push(`- left-aligned: \`${item.where}\` — ${item.text}`);
    for (const item of row.ltrArabic) lines.push(`- LTR context: \`${item.where}\` — ${item.text}`);
    for (const item of row.splitArabic) lines.push(`- split glyphs: \`${item.where}\` — ${item.text}`);
    if (row.splitArabicDuringLoad) lines.push('- Arabic entered per-character boxes during the page load (letters cannot join)');
    for (const item of row.suspiciousRects) lines.push(`- rect anomaly: \`${item.where}\` — ${item.text} (${item.rects} rects / ${item.lines} lines)`);
    if (row.overflow > 1) lines.push(`- horizontal overflow: ${row.overflow}px`);
    lines.push('');
  }
} else {
  lines.push('', 'No left-aligned Arabic blocks, LTR-context Arabic copy, split glyphs, rect anomalies or overflow were found on any route.', '');
  lines.push('The `Centered` column counts Arabic blocks that inherit the design\'s intentional centered treatment (hero statements and card copy centered in English too). It is informational, not a defect signal.', '');
}

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, `${lines.join('\n')}\n`);
console.log(`\n${passing}/${rows.length} route/viewport checks passed. Report: ${path.relative(ROOT, REPORT)}`);
if (failures.length) process.exitCode = 1;
