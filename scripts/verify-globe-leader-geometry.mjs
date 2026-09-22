import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const qaDir = path.join(root, 'docs', 'qa', 'globe-perimeter-routing');
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
const allViewports = [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1536, height: 864 }, { width: 1920, height: 1080 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 430, height: 932 }];
const requested = new Set((process.env.GLOBE_VIEWPORTS || '').split(',').filter(Boolean));
const viewports = requested.size ? allViewports.filter((viewport) => requested.has(`${viewport.width}x${viewport.height}`)) : allViewports;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${port}/index.html?final`, { waitUntil: 'domcontentloaded' });
    await page.locator('#fuel-experience').scrollIntoViewIfNeeded();
    await page.waitForSelector('#hero-globe-root canvas');
    await page.waitForFunction(() => [...document.querySelectorAll('#hero-globe-root polyline[data-leader]')].every((node) => {
      const points = (node.getAttribute('points') || '').trim().split(/\s+/).map((pair) => pair.split(',').map(Number));
      return Number(getComputedStyle(node).opacity) > .01 && points.length === 3;
    }), null, { timeout: 10000 });
    const state = await page.evaluate(() => {
      const rootRect = document.querySelector('#hero-globe-root')?.getBoundingClientRect();
      const leaders = [...document.querySelectorAll('#hero-globe-root polyline[data-leader]')].map((node) => ({
        id: node.getAttribute('data-leader'), opacity: Number(getComputedStyle(node).opacity),
        points: (node.getAttribute('points') || '').trim().split(/\s+/).map((pair) => { const [x, y] = pair.split(',').map(Number); return { x, y }; }),
      })).filter((leader) => leader.opacity > .01);
      const labels = Object.fromEntries([...document.querySelectorAll('#hero-globe-root [data-label]')].map((node) => {
        const rect = node.getBoundingClientRect();
        return [node.getAttribute('data-label'), { left: rect.left - rootRect.left, right: rect.right - rootRect.left, top: rect.top - rootRect.top, bottom: rect.bottom - rootRect.top }];
      }));
      return { leaders, labels };
    });
    const crossingPairs = [], collisionPairs = [];
    for (let i = 0; i < state.leaders.length; i += 1) for (let j = i + 1; j < state.leaders.length; j += 1) for (let a = 0; a < state.leaders[i].points.length - 1; a += 1) for (let b = 0; b < state.leaders[j].points.length - 1; b += 1) if (intersects(state.leaders[i].points[a], state.leaders[i].points[a + 1], state.leaders[j].points[b], state.leaders[j].points[b + 1])) crossingPairs.push([state.leaders[i].id, state.leaders[j].id, a, b]);
    for (const leader of state.leaders) for (const [id, rect] of Object.entries(state.labels)) if (id !== leader.id) for (let i = 0; i < leader.points.length - 1; i += 1) if (intersectsRect(leader.points[i], leader.points[i + 1], rect)) { collisionPairs.push([leader.id, id]); break; }
    results.push({ viewport, crossings: crossingPairs.length, collisions: collisionPairs.length, crossingPairs, collisionPairs, leaders: state.leaders.length, ...(process.env.GLOBE_DEBUG_POINTS ? { leaderPoints: state.leaders } : {}) });
    if ([1366, 1440, 1920, 390, 430].includes(viewport.width)) await page.locator('#fuel-experience').screenshot({ path: path.join(qaDir, `globe-${viewport.width}x${viewport.height}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.crossings !== 0 || result.collisions !== 0 || result.leaders !== 10)) process.exitCode = 1;
