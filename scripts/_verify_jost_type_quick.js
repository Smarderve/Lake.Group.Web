#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const cases = [
  { lang: 'en', w: 390, label: 'en-mobile' },
  { lang: 'en', w: 768, label: 'en-tablet' },
  { lang: 'en', w: 1440, label: 'en-desktop' },
  { lang: 'ar', w: 1440, label: 'ar-desktop' },
  { lang: 'hi', w: 390, label: 'hi-mobile' },
  { lang: 'fr', w: 1440, label: 'fr-desktop' },
  { lang: 'sw', w: 768, label: 'sw-tablet' },
];

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function probeFor(c) {
  return `<!doctype html><html lang="${c.lang}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/assets/tokens.css?v=62">
<link rel="stylesheet" href="/assets/flagship.css?v=87">
</head><body>
<h1 style="font-size:var(--fs-hero)">H</h1>
<h2 style="font-size:var(--fs-display)">S</h2>
<p id="lede" style="font-size:var(--fs-lede)">L</p>
<p id="body" style="font-size:var(--body-size);line-height:var(--body-line-height)">B</p>
<script>
document.documentElement.lang = ${JSON.stringify(c.lang)};
if (${JSON.stringify(c.lang)} === 'ar') document.documentElement.dir = 'rtl';
const r = getComputedStyle(document.documentElement);
const o = {
  label: ${JSON.stringify(c.label)},
  tokenHero: r.getPropertyValue('--fs-hero').trim(),
  tokenDisplay: r.getPropertyValue('--fs-display').trim(),
  tokenBody: r.getPropertyValue('--body-size').trim(),
  tokenLH: r.getPropertyValue('--body-line-height').trim(),
  h1: getComputedStyle(document.querySelector('h1')).fontSize,
  h2: getComputedStyle(document.querySelector('h2')).fontSize,
  lede: getComputedStyle(document.getElementById('lede')).fontSize,
  body: getComputedStyle(document.getElementById('body')).fontSize,
  bodyLH: getComputedStyle(document.getElementById('body')).lineHeight,
  family: getComputedStyle(document.body).fontFamily.split(',')[0].replace(/"/g,'')
};
document.body.setAttribute('data-report', JSON.stringify(o));
</script>
</body></html>`;
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html';
  const fp = path.join(ROOT, urlPath);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) {
    res.writeHead(404);
    res.end('404');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

function dump(url, userData, w) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userData}`,
      `--window-size=${w},900`,
      '--virtual-time-budget=2500',
      '--dump-dom',
      url,
    ];
    const child = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', () => resolve(out));
    child.on('error', reject);
  });
}

server.listen(8773, async () => {
  const userData = path.join(ROOT, '_tmp_chrome_type3');
  fs.mkdirSync(userData, { recursive: true });
  const probePath = path.join(ROOT, '_tmp_type_probe3.html');
  try {
    for (const c of cases) {
      fs.writeFileSync(probePath, probeFor(c));
      const html = await dump('http://127.0.0.1:8773/_tmp_type_probe3.html', userData, c.w);
      const m = html.match(/data-report="([^"]+)"/);
      if (!m) {
        console.log('FAIL', c.label);
        continue;
      }
      const report = JSON.parse(m[1].replace(/&quot;/g, '"'));
      console.log(JSON.stringify(report));
      const h1 = parseFloat(report.h1);
      if (c.w <= 400 && h1 > 48) console.log('WARN mobile hero', h1);
      if (c.w >= 1200 && h1 > 72) console.log('WARN desktop hero', h1);
      if (!/Jost/i.test(report.family) && (c.lang === 'en' || c.lang === 'fr' || c.lang === 'sw')) {
        console.log('WARN font family', report.family);
      }
    }
  } finally {
    server.close();
    try {
      fs.rmSync(userData, { recursive: true, force: true });
      fs.unlinkSync(probePath);
    } catch (_) {}
  }
});
