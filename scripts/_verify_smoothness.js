/* Verify the flagship.css smoothness layer via CDP (headless Chrome).
 * Usage: node scripts/_verify_smoothness.js
 * Launches its own Chrome instance (port 9333) so no external setup is needed. */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = require('path').join(__dirname, '..', '.chrome-smooth');
const CDP_PORT = 9333;
const BASE = 'http://127.0.0.1:8080';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJson(url, method) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: method || 'GET' }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('bad json: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function createTarget() {
  try { return await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, 'PUT'); }
  catch (e) { return await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, 'GET'); }
}

async function main() {
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (_) {}
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=' + CDP_PORT,
    `--user-data-dir=${PROFILE}`, '--window-size=1280,800', 'about:blank'
  ], { stdio: 'ignore' });

  let version = null;
  for (let i = 0; i < 40; i++) {
    try { version = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/version`); break; }
    catch (e) { await sleep(300); }
  }
  if (!version) throw new Error('CDP endpoint not reachable on port ' + CDP_PORT);

  const target = await createTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let msgId = 0;
  const pending = new Map();
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  };
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  function send(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }

  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }

  async function load(url, waitMs) {
    await send('Page.navigate', { url });
    await sleep(waitMs || 3500);
  }

  const results = [];
  async function check(label, pass, extra) {
    results.push(`${label}: ${pass ? 'PASS' : 'FAIL'}${extra ? ' (' + extra + ')' : ''}`);
  }

  await send('Page.enable');
  await send('Runtime.enable');

  async function shot(name) {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('_shot_' + name + '.png', Buffer.from(s.data, 'base64'));
  }

  // Desktop check on a flagship-powered page (company pages load flagship.css)
  await load(BASE + '/lake-oil.html');
  await shot('company');
  await check('company: flagship v98 loaded',
    await evaluate(`[...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href).some(h => h.includes('flagship.css?v=98'))`));
  await check('company: tap-highlight transparent',
    await evaluate(`getComputedStyle(document.body).webkitTapHighlightColor === 'rgba(0, 0, 0, 0)'`));
  await check('company: touch-action manipulation',
    await evaluate(`getComputedStyle(document.querySelector('a')).touchAction === 'manipulation'`));
  await check('company: page renders (body text > 200 chars)',
    await evaluate(`document.body.innerText.length > 200`));
  await check('company: no broken layout (body has height)',
    await evaluate(`document.body.scrollHeight > 400`));

  // Home page check (theme.css based)
  await load(BASE + '/index.html');
  await shot('home');
  await check('home: hero renders', await evaluate(`!!document.querySelector('.hero, .hero-section, .page-hero, .fs-hero')`));
  await check('home: tap-highlight transparent',
    await evaluate(`getComputedStyle(document.body).webkitTapHighlightColor === 'rgba(0, 0, 0, 0)'`));

  // Touch emulation check
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.reload');
  await sleep(3000);
  await shot('mobile');
  const t = await evaluate(`({
    coarse: matchMedia('(pointer: coarse)').matches,
    noHover: matchMedia('(hover: none)').matches,
    overscroll: getComputedStyle(document.body).overscrollBehaviorY,
    heroVisible: !!document.querySelector('.hero, .hero-section, .page-hero, .fs-hero')
  })`);
  await check('touch: coarse pointer emulated', t.coarse);
  await check('touch: hover:none emulated', t.noHover);
  await check('touch: overscroll contain', t.overscroll === 'contain', t.overscroll);
  await check('touch: hero visible', t.heroVisible);

  console.log(results.join('\n'));
  ws.close();
  chrome.kill();
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (_) {}
  process.exit(0);
}

main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
