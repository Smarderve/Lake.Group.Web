'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const html = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8">
<link rel="stylesheet" href="/assets/fonts/fonts.css?v=60">
<link rel="stylesheet" href="/assets/tokens.css?v=62">
<style>
body{font-family:var(--font-body);font-weight:400;font-size:24px;padding:40px}
h1{font-family:var(--font-heading);font-weight:700}
.ext{font-weight:700}
</style></head><body>
<h1 id="fr">Melange deja croitre francais — eecc oo</h1>
<p id="fr2">Mélange déjà croître français — éèçôî</p>
<p id="sw">Karibu Lake Group nishati usafirishaji</p>
<p class="ext" id="ext">Škoda Łódź Āfrica</p>
<script>
document.fonts.ready.then(function () {
  function check(el) {
    var ff = getComputedStyle(el).fontFamily;
    return { id: el.id, fontFamily: ff, jost: /Jost/i.test(ff) };
  }
  var report = {
    fr: check(document.getElementById('fr2')),
    sw: check(document.getElementById('sw')),
    ext: check(document.getElementById('ext')),
    checkFR: document.fonts.check('700 24px Jost', 'éèç'),
    checkSW: document.fonts.check('400 24px Jost', 'Karibu'),
    checkEXT: document.fonts.check('700 24px Jost', 'ŠŁĀ')
  };
  document.title = 'JOST_REPORT:' + JSON.stringify(report);
});
</script>
</body></html>`;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.js': 'application/javascript',
};

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/verify')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '');
  const fp = path.join(root, rel);
  if (!fp.startsWith(root) || !fs.existsSync(fp)) {
    res.writeHead(404);
    res.end('404');
    return;
  }
  const ext = path.extname(fp);
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

server.listen(8765, async () => {
  const urls = [
    'http://127.0.0.1:8765/assets/fonts/files/jost-latin-400-normal.woff2',
    'http://127.0.0.1:8765/assets/fonts/files/jost-latin-ext-400-normal.woff2',
    'http://127.0.0.1:8765/assets/fonts/files/jost-latin-ext-700-normal.woff2',
    'http://127.0.0.1:8765/assets/fonts/fonts.css?v=60',
  ];
  for (const u of urls) {
    const r = await fetch(u);
    const buf = Buffer.from(await r.arrayBuffer());
    const ok = r.status === 200 && buf.length > 100;
    const isFont = u.includes('.woff2') ? buf[0] === 0x77 && buf[1] === 0x4f : true;
    console.log(ok && isFont ? 'SERVE_OK' : 'SERVE_FAIL', path.basename(u.split('?')[0]), 'bytes=' + buf.length);
  }

  try {
    const pw = require('playwright');
    const browser = await pw.chromium.launch({ headless: true });
    const page = await browser.newPage();
    const reqs = [];
    page.on('request', (req) => {
      if (req.url().includes('jost-')) reqs.push(req.url());
    });
    await page.goto('http://127.0.0.1:8765/verify', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.title.startsWith('JOST_REPORT:'), { timeout: 8000 });
    console.log(await page.title());
    const jostReqs = [...new Set(reqs.filter((u) => u.includes('jost-')))];
    console.log(
      'NETWORK_JOST_FILES',
      jostReqs.map((u) => u.split('/').pop().split('?')[0]).join(', ')
    );
    const hasLatin = jostReqs.some((u) => /jost-latin-\d/.test(u) && !u.includes('latin-ext'));
    const hasExt = jostReqs.some((u) => u.includes('latin-ext'));
    console.log(hasLatin ? 'PASS network latin' : 'FAIL network latin');
    console.log(hasExt ? 'PASS network latin-ext' : 'FAIL network latin-ext');
    await browser.close();
  } catch (e) {
    console.log('PLAYWRIGHT_SKIP', String(e.message || e).split('\n')[0]);
    // Fallback: confirm CSS references both subsets for accented + extended samples
    const css = fs.readFileSync(path.join(root, 'assets/fonts/fonts.css'), 'utf8');
    console.log(
      css.includes('jost-latin-ext-400') && css.includes('unicode-range')
        ? 'PASS css latin-ext wired (no browser)'
        : 'FAIL css latin-ext'
    );
  }

  server.close();
});
