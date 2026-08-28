import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium, firefox, webkit } from 'playwright';

const root = process.cwd();
const liveOrigin = 'https://lakegroup.vercel.app';
const localViewports = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 820, height: 1180 }, { name: 'mobile', width: 390, height: 844 }];
const liveViewports = [{ name: 'wide', width: 1920, height: 1080 }, { name: 'desktop', width: 1440, height: 900 }, { name: 'tablet', width: 820, height: 1180 }, { name: 'mobile', width: 390, height: 844 }, { name: 'small-mobile', width: 360, height: 800 }];
const rootPages = fs.readdirSync(root).filter(f => f.endsWith('.html')).sort();
const keyPages = ['index.html', 'about.html', 'leadership.html', 'history.html', 'gallery.html', 'contact.html', 'news.html', 'careers.html', 'csr.html', 'investors.html', 'africa-network.html', 'projects.html', 'lake-oil.html', 'lake-gas.html', 'lake-lubes.html', 'lake-agro.html', 'aficd.html', 'lake-trans.html', 'lake-steel.html', 'lake-premix-cement.html', 'station-locator.html', 'under-construction.html'].filter(f => rootPages.includes(f));

function serve() {
  const server = http.createServer((req, res) => {
    const requested = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, requested);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    const ext = path.extname(file);
    const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type }); fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function inspect(browser, origin, pageName, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const page = await context.newPage();
  const consoleErrors = [], consoleWarnings = [], failed = [], responses = [];
  page.on('console', m => (m.type() === 'error' ? consoleErrors : consoleWarnings).push(m.text()));
  page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', r => failed.push(`${r.url()} :: ${r.failure()?.errorText || 'failed'}`));
  page.on('response', r => { if (r.status() >= 400) responses.push({ url: r.url(), status: r.status() }); });
  const started = Date.now(); let navigationError = null;
  try { await page.goto(`${origin}/${pageName}`, { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch (e) { navigationError = e.message; }
  await page.waitForTimeout(800);
  const data = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const lcp = performance.getEntriesByType('largest-contentful-paint').at(-1);
    const oldTerms = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /subsidiaries/i.test(e.textContent || '')).map(e => e.textContent.trim()).filter(Boolean).slice(0, 20);
    const brokenRects = [...document.querySelectorAll('body *')].map(e => ({ selector: e.id ? `#${e.id}` : `.${String(e.className || '').split(/\s+/).filter(Boolean).slice(0,2).join('.')}`, rect: e.getBoundingClientRect() })).filter(x => x.rect.right > innerWidth + 1 || x.rect.left < -1).slice(0, 10);
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id); const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
    return { title: document.title, description: document.querySelector('meta[name="description"]')?.content || '', build: window.__LAKE_BUILD__ || null, scrollWidth: document.documentElement.scrollWidth, innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, brokenRects, duplicateIds: [...new Set(duplicateIds)], oldTerms, iframeCount: document.querySelectorAll('iframe').length, lottieCount: document.querySelectorAll('dotlottie-player, dotlottie-wc, [data-lottie], [data-dotlottie]').length, resources: resources.length, transfer: resources.reduce((n, r) => n + (r.transferSize || 0), 0), largest: resources.map(r => ({ url: r.name, transfer: r.transferSize || 0, duration: Math.round(r.duration) })).sort((a,b) => b.transfer-a.transfer).slice(0, 5), fcp: paints.find(p => p.name === 'first-contentful-paint')?.startTime ?? null, lcp: lcp?.startTime ?? null, domContentLoaded: nav?.domContentLoadedEventEnd ?? null, load: nav?.loadEventEnd ?? null };
  });
  await context.close();
  return { origin, page: pageName, viewport: viewport.name, elapsed: Date.now() - started, navigationError, consoleErrors, consoleWarnings, failed, responses, ...data };
}

function inventory() {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() && !['node_modules', '.git'].includes(e.name) ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []);
  const files = walk(root); const by = ext => files.filter(f => f.toLowerCase().endsWith(ext));
  const images = files.filter(f => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(f)).map(f => ({ path: path.relative(root, f), bytes: fs.statSync(f).size })).sort((a,b) => b.bytes-a.bytes).slice(0, 50);
  return { counts: { files: files.length, html: by('.html').length, css: by('.css').length, js: by('.js').length, json: by('.json').length, images: images.length }, images, serviceWorkers: files.filter(f => /(^|\/)(sw|service-worker).*\.(js|ts)$/i.test(f.replaceAll('\\','/'))).map(f => path.relative(root,f)), lottie: files.filter(f => /\.(lottie|lottie\.json|json)$/i.test(f) && /lottie|animation|doodle|wired/i.test(f)).map(f => path.relative(root,f)).slice(0, 200) };
}

const server = await serve(); const localOrigin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const local = [], live = [];
const localJobs = rootPages.flatMap(page => (keyPages.includes(page) ? localViewports : [localViewports[2]]).map(viewport => [localOrigin, page, viewport]));
const liveJobs = keyPages.flatMap(page => liveViewports.map(viewport => [liveOrigin, page, viewport]));
async function runJobs(jobs, output, concurrency = 4) {
  let cursor = 0;
  async function worker() { while (cursor < jobs.length) { const job = jobs[cursor++]; output.push(await inspect(browser, ...job)); } }
  await Promise.all(Array.from({ length: concurrency }, worker));
}
await runJobs(localJobs, local); await runJobs(liveJobs, live);
const engines = {};
for (const [name, api] of Object.entries({ chromium, firefox, webkit })) { try { const b = await api.launch({ headless: true }); engines[name] = 'available'; await b.close(); } catch { engines[name] = 'unavailable'; } }
await browser.close(); await new Promise(resolve => server.close(resolve));
const report = { generatedAt: new Date().toISOString(), liveOrigin, localOrigin, rootPages, keyPages, engines, inventory: inventory(), local, live };
fs.writeFileSync(path.join(root, 'docs', 'reports', 'full-site-audit-data.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pages: rootPages.length, keyPages: keyPages.length, localRuns: local.length, liveRuns: live.length, engines, inventory: report.inventory.counts, liveErrors: live.reduce((n,x) => n + x.consoleErrors.length + x.failed.length + x.responses.length, 0), liveOverflow: live.filter(x => x.overflow).length }, null, 2));
