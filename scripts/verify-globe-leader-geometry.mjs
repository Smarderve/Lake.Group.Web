import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const qaDir = path.join(root, 'docs', 'qa', 'globe-orbit-docks');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return response.writeHead(404).end();
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

function intersects(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const onSegment = (p, q, r) => Math.min(p.x, q.x) <= r.x && r.x <= Math.max(p.x, q.x) && Math.min(p.y, q.y) <= r.y && r.y <= Math.max(p.y, q.y);
  const ab1 = cross(a, b, c), ab2 = cross(a, b, d), cd1 = cross(c, d, a), cd2 = cross(c, d, b);
  return (ab1 === 0 && onSegment(a, b, c)) || (ab2 === 0 && onSegment(a, b, d)) || (cd1 === 0 && onSegment(c, d, a)) || (cd2 === 0 && onSegment(c, d, b)) || ((ab1 > 0) !== (ab2 > 0) && (cd1 > 0) !== (cd2 > 0));
}

function intersectsRect(a, b, rect) {
  if (a.x > rect.left && a.x < rect.right && a.y > rect.top && a.y < rect.bottom) return true;
  const edges = [
    [{ x: rect.left, y: rect.top }, { x: rect.right, y: rect.top }],
    [{ x: rect.right, y: rect.top }, { x: rect.right, y: rect.bottom }],
    [{ x: rect.right, y: rect.bottom }, { x: rect.left, y: rect.bottom }],
    [{ x: rect.left, y: rect.bottom }, { x: rect.left, y: rect.top }],
  ];
  return edges.some(([c, d]) => intersects(a, b, c, d));
}

await fs.promises.mkdir(qaDir, { recursive: true });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const allViewports = [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1536, height: 864 }, { width: 1920, height: 1080 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 820, height: 1180 }, { width: 1024, height: 768 }];
const requested = new Set((process.env.GLOBE_VIEWPORTS || '').split(',').filter(Boolean));
const viewports = requested.size ? allViewports.filter((viewport) => requested.has(`${viewport.width}x${viewport.height}`)) : allViewports;
const browser = await chromium.launch({ headless: true });
const results = [];
const expectedNames = { tz: 'TANZANIA', ke: 'KENYA', ug: 'UGANDA', rw: 'RWANDA', bi: 'BURUNDI', cd: 'DR CONGO', zm: 'ZAMBIA', mz: 'MOZAMBIQUE', et: 'ETHIOPIA', ae: 'UAE' };

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${port}/index.html?final`, { waitUntil: 'domcontentloaded' });
    await page.locator('#fuel-experience').scrollIntoViewIfNeeded();
    await page.waitForSelector('#hero-globe-root canvas');
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(350);
    await page.waitForFunction(() => [...document.querySelectorAll('#hero-globe-root path[data-leader]')].every((node) => {
      return Number(node.dataset.progress) === 1 && node.getTotalLength() > 0;
    }), null, { timeout: 10000 });
    const state = await page.evaluate(() => {
      const rootRect = document.querySelector('#hero-globe-root')?.getBoundingClientRect();
      const leaders = [...document.querySelectorAll('#hero-globe-root path[data-leader]')].map((node) => ({
        id: node.getAttribute('data-leader'), opacity: Number(getComputedStyle(node).opacity),
        points: Array.from({length:65},(_,i)=>{const p=node.getPointAtLength(node.getTotalLength()*i/64);return {x:p.x,y:p.y};}),
      })).filter((leader) => leader.opacity > .01);
      const labels = Object.fromEntries([...document.querySelectorAll('#hero-globe-root [data-label]')].map((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return [node.getAttribute('data-label'), { name: node.textContent.trim(), visible: Number(style.opacity) > .01 && style.display !== 'none' && style.visibility !== 'hidden', left: rect.left - rootRect.left, right: rect.right - rootRect.left, top: rect.top - rootRect.top, bottom: rect.bottom - rootRect.top }];
      }));
      const sample = document.querySelector('#hero-globe-root path[data-leader]');
      const bundleLoaded = performance.getEntriesByType('resource').some((entry) => entry.name.includes('/assets/globe-lab.bundle.js?v=20260925-orbit'));
      return { leaders, labels, bundleLoaded, bounds: { width: rootRect.width, height: rootRect.height }, center: { x: Number(sample?.dataset.centerX), y: Number(sample?.dataset.centerY) }, radius: Number(sample?.dataset.globeRadius) };
    });
    const crossingPairs = [], collisionPairs = [], labelOverlaps = [], clippedLabels = [], missingLabels = [];
    for (let i = 0; i < state.leaders.length; i += 1) for (let j = i + 1; j < state.leaders.length; j += 1) for (let a = 0; a < state.leaders[i].points.length - 1; a += 1) for (let b = 0; b < state.leaders[j].points.length - 1; b += 1) if (intersects(state.leaders[i].points[a], state.leaders[i].points[a + 1], state.leaders[j].points[b], state.leaders[j].points[b + 1])) crossingPairs.push([state.leaders[i].id, state.leaders[j].id, a, b]);
    for (const leader of state.leaders) for (const [id, rect] of Object.entries(state.labels)) if (id !== leader.id) for (let i = 0; i < leader.points.length - 1; i += 1) if (intersectsRect(leader.points[i], leader.points[i + 1], rect)) { collisionPairs.push([leader.id, id]); break; }
    for (const [id, name] of Object.entries(expectedNames)) if (state.labels[id]?.name !== name || !state.labels[id]?.visible) missingLabels.push(id);
    for (const [id, rect] of Object.entries(state.labels)) {
      if (rect.left < 7.9 || rect.top < 7.9 || rect.right > state.bounds.width - 7.9 || rect.bottom > state.bounds.height - 7.9) clippedLabels.push(id);
      for (const [otherId, other] of Object.entries(state.labels)) if (id < otherId && rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top) labelOverlaps.push([id, otherId]);
    }
    const distance = (point) => Math.hypot(point.x - state.center.x, point.y - state.center.y);
    const lengths = state.leaders.map((leader) => ({ id: leader.id, length: leader.points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - leader.points[index].x, point.y - leader.points[index].y), 0) }));
    const inwardRoutes = state.leaders.filter((leader) => leader.points.some((point, index) => index > 0 && distance(point) <= distance(leader.points[index - 1]) + .01)).map((leader) => leader.id);
    const centralZoneRoutes = state.leaders.filter((leader) => leader.points.slice(1).some((point) => distance(point) < state.radius * .55)).map((leader) => leader.id);
    const longRoutes = lengths.filter((leader) => leader.length > state.radius).map((leader) => leader.id);
    results.push({ viewport, bundleLoaded: state.bundleLoaded, crossings: crossingPairs.length, collisions: collisionPairs.length, labelOverlaps: labelOverlaps.length, clippedLabels: clippedLabels.length, missingLabels: missingLabels.length, inwardViolations: inwardRoutes.length, centralZoneViolations: centralZoneRoutes.length, longLeaderViolations: longRoutes.length, maximumLeaderLength: Math.max(...lengths.map((leader) => leader.length)), lengthLimit: state.radius, crossingPairs, collisionPairs, labelOverlapPairs: labelOverlaps, clippedLabelIds: clippedLabels, missingLabelIds: missingLabels, inwardRoutes, centralZoneRoutes, longRoutes, leaders: state.leaders.length, ...(process.env.GLOBE_DEBUG_POINTS ? { leaderPoints: state.leaders, labelRects: state.labels, center: state.center } : {}) });
    await page.locator('#fuel-experience').screenshot({ path: path.join(qaDir, `globe-${viewport.width}x${viewport.height}.png`) });
    await page.close();
  }
  const rotatingPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await rotatingPage.goto(`http://127.0.0.1:${port}/index.html?globeStart=0`, { waitUntil: 'domcontentloaded' });
  await rotatingPage.locator('#fuel-experience').scrollIntoViewIfNeeded();
  await rotatingPage.waitForSelector('#hero-globe-root canvas');
  await rotatingPage.waitForTimeout(500);
  results[0].rotationLabelsHidden = await rotatingPage.evaluate(() => [...document.querySelectorAll('#hero-globe-root [data-label], #hero-globe-root [data-leader]')].every((node) => (node.hasAttribute('data-leader') ? Number(node.dataset.progress)===0 : Number(getComputedStyle(node).opacity) < .01)));
  await rotatingPage.close();
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(path.join(qaDir,'verification.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({viewport,crossingPairs,collisionPairs,labelOverlapPairs,clippedLabelIds,maximumLeaderLength,lengthLimit})=>({viewport,crossingPairs,collisionPairs,labelOverlapPairs,clippedLabelIds,maximumLeaderLength,lengthLimit})),null,2));
if (results[0]?.rotationLabelsHidden !== true || results.some((result) => !result.bundleLoaded || result.longLeaderViolations !== 0 || result.crossings !== 0 || result.collisions !== 0 || result.labelOverlaps !== 0 || result.clippedLabels !== 0 || result.missingLabels !== 0 || result.leaders !== 10)) process.exitCode = 1;
