#!/usr/bin/env node
// QA for the Global Operations globe experience. Dependency-free CDP client
// (cribbed from _qa_overflow_check.js). One short Chrome session:
//  - desktop 1440x900: scrub the sticky track through 8 progress positions,
//    screenshot each, collect console errors/exceptions;
//  - scroll normality probe above/below the section;
//  - mobile 390x844: autonomous tour, 2 screenshots a few seconds apart;
//  - reduced-motion desktop: static fallback screenshot.
// Screenshots land in scripts/_qa_screens/globe-*.png.
'use strict';
const http = require('http');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const PORT = 9333;
const BASE = 'http://127.0.0.1:8734';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'scripts', '_qa_screens');
const PROFILE = path.join(ROOT, 'scripts', '_chrome_profile_globe');

function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const key = crypto.randomBytes(16).toString('base64');
    const sock = net.connect(u.port, u.hostname, () => {
      sock.write(
        `GET ${u.pathname} HTTP/1.1\r\nHost: ${u.hostname}:${u.port}\r\n` +
        `Upgrade: websocket\r\nConnection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    let buf = Buffer.alloc(0);
    let upgraded = false;
    const listeners = [];
    const api = {
      send(obj) {
        const payload = Buffer.from(JSON.stringify(obj));
        const mask = crypto.randomBytes(4);
        let header;
        if (payload.length < 126) {
          header = Buffer.from([0x81, 0x80 | payload.length]);
        } else if (payload.length < 65536) {
          header = Buffer.alloc(4);
          header[0] = 0x81; header[1] = 0x80 | 126;
          header.writeUInt16BE(payload.length, 2);
        } else {
          header = Buffer.alloc(10);
          header[0] = 0x81; header[1] = 0x80 | 127;
          header.writeBigUInt64BE(BigInt(payload.length), 2);
        }
        const masked = Buffer.from(payload);
        for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i % 4];
        sock.write(Buffer.concat([header, mask, masked]));
      },
      onMessage(fn) { listeners.push(fn); },
      close() { sock.destroy(); },
    };
    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!upgraded) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        const head = buf.slice(0, idx).toString();
        if (!/101/.test(head.split('\r\n')[0])) { reject(new Error('WS upgrade failed: ' + head)); return; }
        buf = buf.slice(idx + 4);
        upgraded = true;
        resolve(api);
      }
      for (;;) {
        if (buf.length < 2) return;
        const fin = buf[0] & 0x80, op = buf[0] & 0x0f;
        let len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + len) return;
        const payload = buf.slice(off, off + len);
        buf = buf.slice(off + len);
        if (op === 1 && fin) {
          let msg; try { msg = JSON.parse(payload.toString()); } catch (e) { continue; }
          listeners.forEach((fn) => fn(msg));
        } else if (op === 8) { sock.destroy(); return; }
      }
    });
    sock.on('error', reject);
  });
}

function httpGetJson(pathName) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: pathName, method: 'PUT' }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(new Error('bad json: ' + d)); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function waitForPort(retries) {
  return new Promise((resolve, reject) => {
    const tryOnce = (n) => {
      const s = net.connect(PORT, '127.0.0.1', () => { s.destroy(); resolve(); });
      s.on('error', () => { s.destroy(); n > 0 ? setTimeout(() => tryOnce(n - 1), 300) : reject(new Error('chrome port never opened')); });
    };
    tryOnce(retries);
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.errors = [];
    ws.onMessage((msg) => {
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 400));
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.errors.push('console.error: ' + msg.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
      } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        this.errors.push('log: ' + (msg.params.entry.text || '').slice(0, 300));
      }
    });
  }
  cmd(method, params) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send({ id, method, params: params || {} });
    });
  }
  async evalJs(expr) {
    const r = await this.cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails.exception));
    return r.result.value;
  }
  async shot(name) {
    const r = await this.cmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64'));
    console.log('  shot: ' + name);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newTab(opts) {
  const t = await httpGetJson('/json/new?about:blank');
  const cdp = new CDP(await wsConnect(t.webSocketDebuggerUrl));
  await cdp.cmd('Page.enable');
  await cdp.cmd('Runtime.enable');
  await cdp.cmd('Log.enable');
  await cdp.cmd('Emulation.setDeviceMetricsOverride', {
    width: opts.w, height: opts.h, deviceScaleFactor: 1, mobile: !!opts.mobile,
  });
  if (opts.reducedMotion) {
    await cdp.cmd('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
  }
  return cdp;
}

// Scrolls so the sticky-track progress ≈ p, waits for the scrub lerp.
const gotoProgress = (p) => `(() => {
  const track = document.getElementById('experience-3d-track');
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
  const r = track.getBoundingClientRect();
  const topAbs = r.top + window.scrollY;
  const span = Math.max(1, r.height - (window.innerHeight - nav));
  window.scrollTo(0, Math.round(topAbs - nav + ${p} * span));
  return window.scrollY;
})()`;

async function main() {
  fs.rmSync(PROFILE, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--hide-scrollbars', '--user-data-dir=' + PROFILE,
    '--disable-crash-reporter', '--disable-breakpad',
    '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitForPort(120);
    await sleep(600);

    // ---------- Desktop scrub ----------
    console.log('DESKTOP 1440x900');
    const d = await newTab({ w: 1440, h: 900 });
    await d.cmd('Page.navigate', { url: BASE + '/index.html' });
    await sleep(2500);
    // Bring the section near the viewport so the bundle lazy-loads, then
    // poll until the experience actually boots (canvas + is-scrolly).
    for (let k = 0; k < 30; k++) {
      await d.evalJs("document.getElementById('fuel-experience').scrollIntoView(); window.scrollY");
      const ok = await d.evalJs("!!document.querySelector('#experience-3d-panel canvas') && document.getElementById('fuel-experience').classList.contains('is-scrolly')");
      if (ok) break;
      await sleep(1000);
    }
    await sleep(1000);
    const state = await d.evalJs(`JSON.stringify({
      scrolly: document.getElementById('fuel-experience').classList.contains('is-scrolly'),
      canvas: !!document.querySelector('#experience-3d-panel canvas'),
      trackH: document.getElementById('experience-3d-track').getBoundingClientRect().height,
      pageH: document.body.scrollHeight,
    })`);
    console.log('  state: ' + state);
    const positions = process.env.POS
      ? process.env.POS.split(',').map(Number)
      : [0.0, 0.12, 0.30, 0.42, 0.55, 0.68, 0.80, 0.94, 1.0];
    for (const p of positions) {
      await d.evalJs(gotoProgress(p));
      await sleep(1400);
      await d.shot(`globe-desktop-p${String(p).replace('.', '_')}.png`);
    }
    // Scroll-normality probe: above and below the section.
    await d.evalJs('window.scrollTo(0, 0)');
    await sleep(700);
    await d.shot('globe-desktop-pagetop.png');
    await d.evalJs('window.scrollTo(0, document.body.scrollHeight)');
    await sleep(700);
    const atBottom = await d.evalJs('window.innerHeight + window.scrollY >= document.body.scrollHeight - 2');
    await d.shot('globe-desktop-pagebottom.png');
    console.log('  reached page bottom: ' + atBottom);
    console.log('  console errors: ' + (d.errors.length ? '\n    ' + d.errors.join('\n    ') : 'NONE'));
    d.ws.close();

    if (process.env.DESKTOP_ONLY) return;

    // ---------- Mobile autonomous tour ----------
    console.log('MOBILE 390x844');
    const m = await newTab({ w: 390, h: 844, mobile: true });
    await m.cmd('Page.navigate', { url: BASE + '/index.html' });
    await sleep(2500);
    for (let k = 0; k < 30; k++) {
      await m.evalJs("document.getElementById('fuel-experience').scrollIntoView({block:'center'}); window.scrollY");
      const ok = await m.evalJs("!!document.querySelector('#experience-3d-panel canvas')");
      if (ok) break;
      await sleep(1000);
    }
    const mState = await m.evalJs(`JSON.stringify({
      scrolly: document.getElementById('fuel-experience').classList.contains('is-scrolly'),
      canvas: !!document.querySelector('#experience-3d-panel canvas'),
    })`);
    console.log('  state: ' + mState);
    await m.evalJs("document.getElementById('experience-3d-panel').scrollIntoView({block:'center'})");
    await sleep(500);
    await m.shot('globe-mobile-t0.png');
    await sleep(9000);
    await m.shot('globe-mobile-t9.png');
    await sleep(9000);
    await m.shot('globe-mobile-t18.png');
    console.log('  console errors: ' + (m.errors.length ? '\n    ' + m.errors.join('\n    ') : 'NONE'));
    m.ws.close();

    // ---------- Reduced motion ----------
    console.log('REDUCED MOTION 1440x900');
    const r = await newTab({ w: 1440, h: 900, reducedMotion: true });
    await r.cmd('Page.navigate', { url: BASE + '/index.html' });
    await sleep(2500);
    await r.evalJs("document.getElementById('fuel-experience').scrollIntoView({block:'center'}); window.scrollY");
    await sleep(2500);
    const rState = await r.evalJs(`JSON.stringify({
      finale: document.getElementById('experience-3d-panel').classList.contains('show-finale-full'),
      canvas: !!document.querySelector('#experience-3d-panel canvas'),
    })`);
    console.log('  state (expect finale:true, canvas:false): ' + rState);
    await r.shot('globe-reduced-motion.png');
    console.log('  console errors: ' + (r.errors.length ? '\n    ' + r.errors.join('\n    ') : 'NONE'));
    r.ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().catch((e) => { console.error('ERROR: ' + e.message); process.exit(1); });
