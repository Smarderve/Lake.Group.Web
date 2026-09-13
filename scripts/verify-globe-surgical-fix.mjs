import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = path.join(root, 'docs', 'qa', 'globe-surgical-20260913');
await fs.mkdir(outDir, { recursive: true });
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  const requestPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, requestPath);
  if (!file.startsWith(root) || !fsSync.existsSync(file) || fsSync.statSync(file).isDirectory()) {
    response.writeHead(404); response.end(); return;
  }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fsSync.createReadStream(file).pipe(response);
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const port = server.address().port;
console.log(`[qa] serving on 127.0.0.1:${port}`);

const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server', '--disable-gpu', '--disable-dev-shm-usage'] });

/* ---------- PART A: interaction QA on the real homepage, drags in every phase ---------- */
const context = await browser.newContext({
  viewport: { width: 960, height: 720 },
  deviceScaleFactor: 1,
  recordVideo: { dir: path.join(outDir, '_video'), size: { width: 960, height: 720 } },
});
await context.addInitScript(() => {
  // Synthetic PointerEvents are untrusted; pointer capture would throw on them.
  const noop = function () {};
  for (const proto of [typeof Element !== 'undefined' ? Element.prototype : null, typeof SVGElement !== 'undefined' ? SVGElement.prototype : null]) {
    if (!proto) continue;
    if (proto.setPointerCapture) proto.setPointerCapture = noop;
    if (proto.releasePointerCapture) proto.releasePointerCapture = noop;
  }
});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.locator('#fuel-experience').scrollIntoViewIfNeeded();
await page.waitForSelector('#hero-globe-root canvas', { state: 'attached', timeout: 30000 });
await page.waitForTimeout(3000);

await page.evaluate(() => {
  window.__qa = { samples: [], drags: [] };
  const canvas = document.querySelector('#hero-globe-root canvas');
  let pointerId = 7;
  window.__qa.drag = (dx, dy) => {
    const rect = canvas.getBoundingClientRect();
    const x0 = rect.x + rect.width / 2, y0 = rect.y + rect.height / 2;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId, button: 0, clientX: x0, clientY: y0, bubbles: true }));
    for (let step = 1; step <= 10; step++) {
      canvas.dispatchEvent(new PointerEvent('pointermove', { pointerId, clientX: x0 + (dx * step) / 10, clientY: y0 + (dy * step) / 10, bubbles: true }));
    }
    canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId, clientX: x0 + dx, clientY: y0 + dy, bubbles: true }));
    window.__qa.drags.push({ dx, dy });
    pointerId += 1;
  };
  const t0 = performance.now();
  const tick = () => {
    const panel = document.querySelector('.experience-3d-panel');
    const labels = [...document.querySelectorAll('#hero-globe-root [data-label]')];
    window.__qa.samples.push({
      t: performance.now() - t0,
      phase: panel?.dataset.globePhase || 'none',
      labelSum: labels.reduce((sum, label) => sum + parseFloat(getComputedStyle(label).opacity || '0'), 0),
    });
    if (performance.now() - t0 < 47000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// Drags in every phase of loop 1: rotation, africa approach, reveal, hold, retract/clean.
const dragPlan = [900, 5600, 9500, 13000, 16000];
for (const at of dragPlan) {
  const now = await page.evaluate(() => window.__qa.samples.at(-1)?.t ?? 0);
  const wait = at - now;
  if (wait > 0) await page.waitForTimeout(wait);
  await page.evaluate(() => window.__qa.drag(140, -40));
  await page.waitForTimeout(120);
}

// Let the untouched remainder of loop 2 finish (~47s total => two full loops observed).
const elapsedNow = await page.evaluate(() => window.__qa.samples.at(-1)?.t ?? 0);
if (47000 - elapsedNow > 0) await page.waitForTimeout(47000 - elapsedNow);
const samples = await page.evaluate(() => window.__qa.samples);
const drags = await page.evaluate(() => window.__qa.drags);

/* ---------- Analysis: interaction ---------- */
const order = ['clean', 'rotate', 'africa-centered', 'reveal', 'reveal-mid', 'hold', 'retract'];
const rank = Object.fromEntries(order.map((name, index) => [name, index]));
// Illegitimate restart signature: phase falls back to 'clean' from anything but 'retract'
// (the only legal way 'clean' follows), or jumps back before 'reveal' once revealed.
let loopRestarts = 0;
for (let i = 1; i < samples.length; i++) {
  const prev = samples[i - 1].phase, cur = samples[i].phase;
  if (cur === 'clean' && prev !== 'retract' && prev !== 'clean') loopRestarts += 1;
  if ((cur === 'rotate' || cur === 'africa-centered') && (rank[prev] ?? -1) >= rank.reveal) loopRestarts += 1;
}
// Reveal continuity: within a single reveal episode (reveal→hold, bounded by clean/rotate),
// labels must never vanish once shown.
let sawHigh = false, revealCollapse = false, firstCollapse = null;
for (const s of samples) {
  const r = rank[s.phase] ?? -1;
  if (r < rank.reveal) { sawHigh = false; continue; } // clean/rotate: episode boundary
  if (r > rank.hold) continue; // retract: labels legitimately fade
  if (s.labelSum > 1.5) sawHigh = true;
  if (sawHigh && s.labelSum === 0) { revealCollapse = true; firstCollapse = { t: Number(s.t.toFixed(0)), phase: s.phase }; break; }
}

const summary = {
  generatedAt: new Date().toISOString(),
  sampleCount: samples.length,
  dragsExecuted: drags.length,
  dragTimingsMs: dragPlan,
  dragPhases: dragPlan.map((at) => samples.find((s) => s.t >= at - 60 && s.t <= at + 400)?.phase || 'unknown'),
  pageErrors,
  loopRestartsAfterDrag: loopRestarts,
  revealCollapseAfterDrag: revealCollapse,
  firstCollapse,
  bundleStructure: {},
  approach: {},
  lighting: null,
};
// Static proof the hesitation-prone two-tween structure is gone from the shipped bundle.
try {
  const bundle = fsSync.readFileSync(path.join(root, 'assets', 'globe-lab.bundle.js'), 'utf8');
  const oldBundle = fsSync.existsSync(path.join(outDir, 'bundle-before.js'))
    ? fsSync.readFileSync(path.join(outDir, 'bundle-before.js'), 'utf8') : '';
  summary.bundleStructure = {
    oldHadTwoTweenSweep: oldBundle.includes('Math.PI*2-.24') || oldBundle.includes('(Math.PI*2-.24)'),
    newHasTwoTweenSweep: bundle.includes('Math.PI*2-.24'),
    newHasFullRevolutionSweep: bundle.includes('Math.PI*2)}') || bundle.includes('*(Math.PI*2)'),
    newHasDragTimelineReset: bundle.includes('.current=0&&'),
  };
} catch (error) {
  summary.bundleStructure = { error: String(error).split('\n')[0] };
}
const writeSummary = async () => fs.writeFile(path.join(outDir, 'qa-summary.json'), JSON.stringify(summary, null, 2));
await writeSummary();
console.log('[qa] core interaction analysis written');
// Free the recording context before the harness runs (SwiftShader WebGL is memory hungry).
await context.close();

/* ---------- PART B/C: per-bundle approach velocity + lighting (before vs after) ---------- */
const analyzeApproach = (frames) => {
  if (frames.length < 10) return { frames: frames.length, note: 'insufficient frames' };
  const duration = frames.at(-1).t;
  // Per-frame horizontal anchor deltas; ignore only the last 150ms (rest flatten).
  const deltas = frames.slice(1).map((f, i) => ({ t: f.t, dx: Math.abs(f.x1 - frames[i].x1) }));
  const windowEnd = duration - 150;
  const inWindow = deltas.filter((d) => d.t <= windowEnd);
  const moving = inWindow.filter((d) => d.dx > 0.35).length;
  // Stall cluster: consecutive frames with sub-pixel movement anywhere in the course.
  let best = { frames: 0, startT: 0, endT: 0 };
  let run = null;
  for (const d of inWindow) {
    if (d.dx < 0.35) { run = run ? { ...run, endT: d.t, frames: run.frames + 1 } : { startT: d.t, endT: d.t, frames: 1 }; }
    else { if (run && run.frames > best.frames) best = run; run = null; }
  }
  if (run && run.frames > best.frames) best = run;
  return {
    frames: frames.length,
    durationMs: Number(duration.toFixed(0)),
    anchorMovementPx: Number(Math.abs(frames.at(-1).x1 - frames[0].x1).toFixed(1)),
    movingFrames: moving,
    stalledWindowSharePct: Number((100 * (1 - moving / Math.max(1, inWindow.length))).toFixed(1)),
    largestStallCluster: best.frames >= 3 ? { frames: best.frames, atPctOfCourse: Number((100 * best.startT / duration).toFixed(0)) } : { frames: best.frames },
  };
};

const sampleApproach = (pageRef) => pageRef.evaluate(() => new Promise((resolve) => {
  const leader = document.querySelector('[data-leader="tz"]');
  const panel = document.querySelector('.experience-3d-panel');
  const t0 = performance.now();
  let started = false, startAt = 0;
  const frames = [];
  const tick = () => {
    const now = performance.now();
    const phase = panel?.dataset.globePhase || 'none';
    if (!started && phase === 'rotate') { started = true; startAt = now; }
    if (started) frames.push({ t: now - startAt, x1: Number(leader.getAttribute('x1')) });
    const settled = started && phase === 'africa-centered' && now - startAt > 2600;
    if (settled || (started && now - startAt > 8000) || now - t0 > 25000) resolve(frames);
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));

try {
  // Mirror the production mount: sized panel + #hero-globe-root + the globe CSS from index.html.
  const harnessHtml = (scriptPath) => `<!doctype html><html><head><meta charset="utf-8"><base href="/"><title>harness</title>
<style>
  html,body{margin:0;background:#04101c}
  .globe-panel{position:relative;width:900px;height:600px;overflow:hidden}
  #hero-globe-root{position:absolute;inset:0;z-index:0;width:100%;height:100%;overflow:visible;background:transparent}
  #hero-globe-root > .experience{position:relative;width:100% !important;height:100% !important;min-height:100%;overflow:visible;isolation:isolate;background:transparent}
  #hero-globe-root canvas{display:block;position:absolute !important;inset:0;width:100% !important;height:100% !important;background:transparent !important;cursor:grab;touch-action:pan-y}
  #hero-globe-root .leaders,#hero-globe-root .labels{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
  #hero-globe-root .map-label{position:absolute;left:0;top:0;display:inline-flex;align-items:center;gap:7px;color:rgba(246,249,250,.94);font-size:11px;font-weight:700;white-space:nowrap;opacity:0}
  #hero-globe-root .map-label img{width:17px;height:12px;object-fit:cover}
</style>
</head><body><div class="globe-panel experience-3d-panel"><div id="hero-globe-root"></div></div><script src="${scriptPath}"><\/script></body></html>`;
  await fs.writeFile(path.join(outDir, 'before.html'), harnessHtml('/docs/qa/globe-surgical-20260913/bundle-before.js'));
  await fs.writeFile(path.join(outDir, 'after.html'), harnessHtml('/assets/globe-lab.bundle.js?v=20260913-01'));

  const withPage = async (file, fn) => {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    try {
      await p.goto(`http://127.0.0.1:${port}/docs/qa/globe-surgical-20260913/${file}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await p.waitForSelector('#hero-globe-root canvas', { state: 'attached', timeout: 30000 });
      // Verify which bundle text actually executed via in-page fetch of the same URL.
      const scriptSrc = await p.evaluate(() => document.querySelector('script[src]')?.getAttribute('src'));
      const bundleText = await p.evaluate(async (src) => await fetch(src).then((r) => r.text()), scriptSrc);
      const markers = {
        servedOldLight: bundleText.includes('intensity:.56,color:"#5c9bc4"'),
        servedNewLight: bundleText.includes('intensity:.74,color:"#5c9bc4"'),
        servedOldReset: bundleText.includes('timeline.current=0'),
      };
      return { markers, ...(await fn(p)) };
    } finally {
      await ctx.close();
    }
  };

  // Approach sampling runs the live timeline (no ?final); lighting shots use ?final (frozen Africa-centered hold).
  const before = await withPage('before.html', async (p) => {
    const approach = analyzeApproach(await sampleApproach(p));
    await p.goto(`http://127.0.0.1:${port}/docs/qa/globe-surgical-20260913/before.html?final&r=${Math.random()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForSelector('#hero-globe-root canvas', { state: 'attached', timeout: 30000 });
    await p.waitForTimeout(5000);
    await p.screenshot({ path: path.join(outDir, 'lighting-before.png') });
    return { approach };
  });
  const after = await withPage('after.html', async (p) => {
    const approach = analyzeApproach(await sampleApproach(p));
    await p.goto(`http://127.0.0.1:${port}/docs/qa/globe-surgical-20260913/after.html?final&r=${Math.random()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForSelector('#hero-globe-root canvas', { state: 'attached', timeout: 30000 });
    await p.waitForTimeout(5000);
    await p.screenshot({ path: path.join(outDir, 'lighting-after.png') });
    return { approach };
  });

  summary.approach = { before, after };
  if (fsSync.existsSync(path.join(outDir, 'lighting-before.png')) && fsSync.existsSync(path.join(outDir, 'lighting-after.png'))) {
    const { default: sharp } = await import('sharp');
    // Full-frame Africa-centered globe on a 900x600 canvas: west limb, east limb, center, north,
    // plus the West Africa landmass itself (northwest bulge, not the ocean-dominated limb).
    const regions = {
      westLimb: { left: 205, top: 230, width: 120, height: 150 },
      westAfrica: { left: 285, top: 165, width: 115, height: 125 },
      eastLimb: { left: 575, top: 230, width: 120, height: 150 },
      center: { left: 390, top: 230, width: 120, height: 150 },
      north: { left: 390, top: 90, width: 120, height: 100 },
    };
    const stats = {};
    for (const [name, img] of [['before', 'lighting-before.png'], ['after', 'lighting-after.png']]) {
      const file = path.join(outDir, img);
      const whole = await sharp(file).greyscale().toBuffer().then((b) => sharp(b).stats());
      stats[name] = { wholeMean: Number(whole.channels[0].mean.toFixed(2)) };
      for (const [region, rect] of Object.entries(regions)) {
        const clip = await sharp(file).extract(rect).greyscale().toBuffer().then((b) => sharp(b).stats());
        stats[name][region] = { mean: Number(clip.channels[0].mean.toFixed(2)), stdev: Number(clip.channels[0].stdev.toFixed(2)) };
      }
    }
    summary.lighting = {
      stats,
      westAfricaMeanDelta: Number((stats.after.westAfrica.mean - stats.before.westAfrica.mean).toFixed(2)),
      westAfricaStdevDelta: Number((stats.after.westAfrica.stdev - stats.before.westAfrica.stdev).toFixed(2)),
      eastLimbMeanDelta: Number((stats.after.eastLimb.mean - stats.before.eastLimb.mean).toFixed(2)),
      centerMeanDelta: Number((stats.after.center.mean - stats.before.center.mean).toFixed(2)),
      wholeMeanDelta: Number((stats.after.wholeMean - stats.before.wholeMean).toFixed(2)),
    };
  }
} catch (error) {
  summary.harnessError = String(error).split('\n')[0];
}
await writeSummary();

await browser.close();
server.close();

/* ---------- Optional mp4 conversion of the two-loop recording ---------- */
try {
  const videoDir = path.join(outDir, '_video');
  const files = fsSync.existsSync(videoDir) ? fsSync.readdirSync(videoDir) : [];
  if (files.length) {
    const { execSync } = await import('node:child_process');
    execSync(`ffmpeg -y -i "${path.join(videoDir, files[0])}" -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -movflags +faststart "${path.join(outDir, 'two-loop-drag-recording.mp4')}"`, { stdio: 'pipe' });
  }
  await fs.rm(path.join(outDir, '_video'), { recursive: true, force: true });
} catch { /* ffmpeg unavailable; webm kept if conversion failed */ }

console.log(JSON.stringify(summary, null, 2));
