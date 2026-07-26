/**
 * Serve gallery.html via file:// or local static, assert computed styles,
 * and capture 375 / 1440 screenshots if Playwright is available.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'scripts', '_gallery_verify_out');
fs.mkdirSync(OUT, { recursive: true });

function contentType(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css';
  if (p.endsWith('.js')) return 'application/javascript';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/gallery.html';
  const filePath = path.join(ROOT, urlPath.replace(/^\//, ''));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': contentType(filePath) });
  fs.createReadStream(filePath).pipe(res);
});

async function assertViewport(page, width, label) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('http://127.0.0.1:' + port + '/gallery.html', { waitUntil: 'networkidle', timeout: 60000 });
  // wait for skeleton / fonts
  await page.waitForTimeout(1200);

  const result = await page.evaluate(() => {
    const grid = document.getElementById('gallery-grid');
    const cs = getComputedStyle(grid);
    const cols = cs.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
    const gap = parseFloat(cs.columnGap || cs.gap) || 0;
    const tiles = [...document.querySelectorAll('.gallery-tile:not(.is-hidden)')];
    const sample = tiles.slice(0, 8).map((t) => {
      const imgWrap = t.querySelector('.gallery-tile__image');
      const img = t.querySelector('img');
      const cap = t.querySelector('.gallery-tile__caption');
      const ics = getComputedStyle(imgWrap);
      const imgCs = getComputedStyle(img);
      const tr = t.getBoundingClientRect();
      return {
        tileH: Math.round(tr.height),
        imgH: Math.round(imgWrap.getBoundingClientRect().height),
        imgHcss: ics.height,
        objectFit: imgCs.objectFit,
        opacity: parseFloat(getComputedStyle(t).opacity),
        captionBelow: cap && cap.getBoundingClientRect().top >= imgWrap.getBoundingClientRect().bottom - 1,
        hasSpan: !!(t.style.gridRow || t.style.gridColumn || getComputedStyle(t).gridRowStart !== 'auto'),
      };
    });
    const maxTile = Math.max(...sample.map((s) => s.tileH));
    const archive = document.getElementById('gallery-archive');
    const footer = document.querySelector('.site-footer');
    const voidGap = footer.getBoundingClientRect().top - archive.getBoundingClientRect().bottom;
    const toolbar = document.querySelector('.gallery-toolbar');
    const meta = document.querySelector('.gallery-meta');
    return {
      cols,
      gap,
      maxTile,
      sample,
      voidGap,
      masonryClass: grid.className.includes('masonry'),
      tileCount: tiles.length,
      toolbarVisible: !!(toolbar && toolbar.offsetHeight > 0),
      metaVisible: !!(meta && meta.offsetHeight > 0),
      visibleTiles: sample.filter((s) => s.opacity > 0.5).length,
    };
  });

  const shot = path.join(OUT, 'gallery-' + width + '.png');
  await page.screenshot({ path: shot, fullPage: true });

  const expectedCols = width < 768 ? 2 : width < 1200 ? 3 : 4;
  const expectedImgH = width < 768 ? 240 : width < 1200 ? 220 : 260;
  const pass =
    result.cols >= 2 &&
    result.cols === expectedCols &&
    result.gap > 0 &&
    !result.masonryClass &&
    result.sample.every((s) => s.objectFit === 'cover' && s.captionBelow && !s.hasSpan) &&
    result.sample.every((s) => Math.abs(s.imgH - expectedImgH) <= 2) &&
    result.maxTile <= 360 &&
    result.voidGap < 80 &&
    result.visibleTiles >= 6 &&
    result.toolbarVisible &&
    result.metaVisible;

  return { label, width, expectedCols, expectedImgH, pass, result, shot };
}

let port;
server.listen(0, '127.0.0.1', async () => {
  port = server.address().port;
  console.log('Serving on', port);
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const r375 = await assertViewport(page, 375, 'mobile');
    const r1440 = await assertViewport(page, 1440, 'desktop');
    await browser.close();
    for (const r of [r375, r1440]) {
      console.log(JSON.stringify({
        label: r.label,
        width: r.width,
        pass: r.pass,
        cols: r.result.cols,
        expectedCols: r.expectedCols,
        gap: r.result.gap,
        maxTile: r.result.maxTile,
        voidGap: r.result.voidGap,
        imgHs: r.result.sample.map((s) => s.imgH),
        objectFit: r.result.sample[0] && r.result.sample[0].objectFit,
        captionBelow: r.result.sample.every((s) => s.captionBelow),
        shot: r.shot,
      }, null, 2));
    }
    const allPass = r375.pass && r1440.pass;
    console.log(allPass ? 'COMPUTED VERIFY PASS' : 'COMPUTED VERIFY FAIL');
    server.close();
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('Playwright error:', err.message);
    server.close();
    process.exit(2);
  }
});
