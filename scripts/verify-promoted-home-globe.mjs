import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const qaDir = path.join(root, 'docs', 'qa');
const videoDir = path.join(qaDir, '_home-globe-video');
await fs.mkdir(qaDir, { recursive: true });
await fs.rm(videoDir, { recursive: true, force: true });
await fs.mkdir(videoDir, { recursive: true });

const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  const requestPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, requestPath);
  if (!file.startsWith(root) || !fsSync.existsSync(file) || fsSync.statSync(file).isDirectory()) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fsSync.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(4175, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const initContext = async (viewport, recordVideo) => {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...(recordVideo ? { recordVideo: { dir: videoDir, size: viewport } } : {}) });
  await context.addInitScript(() => {
    window.__globeContextCanvases = 0;
    const seen = new WeakSet();
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const context = original.call(this, type, ...args);
      if (context && /^(webgl2?|experimental-webgl)$/.test(String(type)) && !seen.has(this)) { seen.add(this); window.__globeContextCanvases += 1; }
      return context;
    };
  });
  return context;
};

const viewports = [
  { width:390,height:844 }, { width:430,height:900 }, { width:768,height:900 },
  { width:1024,height:900 }, { width:1280,height:900 }, { width:1366,height:900 },
  { width:1440,height:1000 }, { width:1536,height:1000 }, { width:1920,height:1080 },
];
const expectedLabels = ['tz','ke','ug','rw','bi','cd','zm','mz','et','ae'];
const results = [];
for (const viewport of viewports) {
  const context = await initContext(viewport, false);
  const page = await context.newPage();
  const requests = [];
  const failedRequests = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  await page.goto('http://127.0.0.1:4175/index.html?final', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('#fuel-experience').scrollIntoViewIfNeeded();
  await page.waitForSelector('#hero-globe-root canvas', { timeout: 20000 });
  await page.waitForTimeout(1200);
  const state = await page.evaluate((expected) => {
    const canvases = document.querySelectorAll('#hero-globe-root canvas');
    const labels = [...document.querySelectorAll('#hero-globe-root [data-label]')].map((node) => node.getAttribute('data-label'));
    const rect = document.getElementById('hero-globe-root')?.getBoundingClientRect();
    return {
      canvases: canvases.length,
      webglContextCanvases: window.__globeContextCanvases,
      labels,
      exactLabels: expected.every((id) => labels.includes(id)) && labels.length === expected.length,
      rootWidth: Math.round(rect?.width || 0), rootHeight: Math.round(rect?.height || 0),
      heroVisible: Boolean(document.querySelector('.hero-stage')),
      navVisible: Boolean(document.querySelector('.site-nav')),
    };
  }, expectedLabels);
  const labLoads = requests.filter((url) => url.includes('/assets/globe-lab.bundle.js')).length;
  const oldLoads = requests.filter((url) => url.includes('/assets/hero-globe.bundle.js')).length;
  results.push({ viewport, ...state, labLoads, oldLoads, failedRequests });
  const screenshot = viewport.width === 1440 ? 'home-globe-promoted-1440.png' : viewport.width === 1920 ? 'home-globe-promoted-1920.png' : viewport.width === 390 ? 'home-globe-promoted-390.png' : null;
  if (screenshot) await page.locator('#fuel-experience').screenshot({ path: path.join(qaDir, screenshot) });
  await context.close();
}

const labContext = await initContext({ width:1440,height:1000 }, false);
const labPage = await labContext.newPage();
await labPage.goto('http://127.0.0.1:4175/globe-lab.html?final', { waitUntil: 'networkidle', timeout: 20000 });
await labPage.waitForSelector('#root canvas', { timeout: 20000 });
await labPage.screenshot({ path: path.join(qaDir, 'globe-lab-approved-1440.png') });
await labContext.close();

const videoContext = await initContext({ width:1440,height:900 }, true);
const videoPage = await videoContext.newPage();
await videoPage.goto('http://127.0.0.1:4175/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
await videoPage.locator('#fuel-experience').scrollIntoViewIfNeeded();
await videoPage.waitForSelector('#hero-globe-root canvas', { timeout: 20000 });
await videoPage.waitForTimeout(12500);
const recorded = await videoPage.video().path();
await videoContext.close();
await browser.close();
server.close();

const mp4 = path.join(qaDir, 'home-globe-promoted-sequence.mp4');
const converted = spawnSync('ffmpeg', ['-y','-i',recorded,'-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',mp4], { stdio:'pipe', encoding:'utf8' });
if (converted.status !== 0) throw new Error(`ffmpeg failed: ${converted.stderr}`);
await fs.rm(videoDir, { recursive: true, force: true });

const source = await fs.readFile(path.join(root, 'globe-lab', 'entry.tsx'), 'utf8');
const assertions = {
  allBreakpointsPass: results.every((item) => item.canvases === 1 && item.webglContextCanvases === 1 && item.exactLabels && item.rootWidth > 0 && item.rootHeight > 0 && item.labLoads === 1 && item.oldLoads === 0 && item.failedRequests.length === 0),
  oneCanvasEverywhere: results.every((item) => item.canvases === 1),
  oneWebglContextEverywhere: results.every((item) => item.webglContextCanvases === 1),
  oldBundleNeverLoaded: results.every((item) => item.oldLoads === 0),
  approvedBundleLoadedOnce: results.every((item) => item.labLoads === 1),
  exactTenLabelsEverywhere: results.every((item) => item.exactLabels),
  visibilityPausePresent: source.includes("document.hidden||!onscreen?'never':'always'") && source.includes('IntersectionObserver'),
  dprCapPreserved: source.includes('dpr={[1,1.65]}'),
  coordinatesPreserved: expectedLabels.every((id) => source.includes(`id:'${id}'`)),
};
const output = { generatedAt:new Date().toISOString(), assertions, results, screenshots:['docs/qa/globe-lab-approved-1440.png','docs/qa/home-globe-promoted-1440.png','docs/qa/home-globe-promoted-1920.png','docs/qa/home-globe-promoted-390.png'], recording:'docs/qa/home-globe-promoted-sequence.mp4' };
await fs.writeFile(path.join(qaDir, 'home-globe-promotion-verification.json'), `${JSON.stringify(output,null,2)}\n`);
console.log(JSON.stringify({ assertions, breakpoints:results.length, recordingBytes:(await fs.stat(mp4)).size }, null, 2));
if (!Object.values(assertions).every(Boolean)) process.exitCode = 1;
