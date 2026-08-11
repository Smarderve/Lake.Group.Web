'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveStatic } = require('./_safe_static.js');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const html = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8">
<link rel="preload" href="/assets/fonts/files/jost-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/files/jost-latin-ext-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/files/jost-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/files/jost-latin-ext-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/fonts.css?v=60">
<link rel="stylesheet" href="/assets/tokens.css?v=62">
<style>
body{font-family:var(--font-body);font-weight:400;font-size:28px;padding:40px}
h1{font-family:var(--font-heading);font-weight:700}
</style></head><body>
<h1>Mélange déjà croître français — éèçôî</h1>
<p>Karibu Lake Group nishati usafirishaji</p>
<p style="font-weight:700">Škoda Łódź Āfrica</p>
<script>
document.fonts.ready.then(function(){
  var out = {
    checkFR: document.fonts.check('700 28px Jost', 'éèçô'),
    checkSW: document.fonts.check('400 28px Jost', 'Karibu nishati'),
    checkEXT: document.fonts.check('700 28px Jost', 'ŠŁĀ'),
    body: getComputedStyle(document.body).fontFamily,
    h1: getComputedStyle(document.querySelector('h1')).fontFamily
  };
  document.body.setAttribute('data-report', JSON.stringify(out));
});
</script>
</body></html>`;

const mime = {
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.html': 'text/html; charset=utf-8',
};

const hits = new Set();
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath.includes('jost-')) hits.add(path.basename(urlPath));
  if (urlPath === '/' || urlPath === '/verify') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  const fp = resolveStatic(root, (req.url || '/').split('?')[0]);
  if (!fp || !fs.existsSync(fp)) {
    res.writeHead(404);
    res.end('404');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(fp)] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

server.listen(8766, async () => {
  const userData = path.join(root, '_tmp_chrome_profile');
  fs.mkdirSync(userData, { recursive: true });
  const dumpPath = path.join(root, '_tmp_jost_dump.html');

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userData}`,
    `--dump-dom`,
    'http://127.0.0.1:8766/verify',
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      fs.writeFileSync(dumpPath, out);
      if (!out.includes('data-report')) {
        console.log('CHROME_WARN', 'no data-report yet', 'code=' + code, err.slice(0, 200));
      }
      resolve();
    });
    child.on('error', reject);
  });

  // Give late font requests a moment; dump-dom may finish before all preloads land
  await sleep(500);

  const dump = fs.readFileSync(dumpPath, 'utf8');
  const m = dump.match(/data-report="([^"]+)"/);
  if (m) {
    const report = JSON.parse(m[1].replace(/&quot;/g, '"'));
    console.log('FONT_REPORT', JSON.stringify(report));
    console.log(report.checkFR ? 'PASS FR accents in Jost' : 'FAIL FR accents');
    console.log(report.checkSW ? 'PASS SW Latin in Jost' : 'FAIL SW Latin');
    console.log(report.checkEXT ? 'PASS latin-ext glyphs in Jost' : 'FAIL latin-ext glyphs');
    console.log(/Jost/i.test(report.body) ? 'PASS body stack Jost' : 'FAIL body stack');
  } else {
    console.log('FAIL parse report from dump-dom');
  }

  const hitList = [...hits].sort();
  console.log('NETWORK_HITS', hitList.join(', '));
  console.log(hitList.some((h) => /jost-latin-\d/.test(h) && !h.includes('ext')) ? 'PASS network latin' : 'FAIL network latin');
  console.log(hitList.some((h) => h.includes('latin-ext')) ? 'PASS network latin-ext' : 'FAIL network latin-ext');

  try {
    fs.rmSync(userData, { recursive: true, force: true });
    fs.unlinkSync(dumpPath);
  } catch (_) {}

  server.close();
});
