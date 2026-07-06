#!/usr/bin/env node
// QA for the offline knowledge assistant. Dependency-free CDP client
// (cribbed from _globe_qa.js). Short sessions:
//   A desktop 1280x900 (index.html): EN countries question, live language
//     switch to sw + Swahili question, reload -> IndexedDB history restore,
//     CDP offline emulation -> still answers, console error collection.
//   B mobile 390x844: full-height sheet layout screenshot.
//   C desktop keyboard-only: Enter opens, focus lands in input, typed
//     question answered, Tab cycles inside panel (focus trap), Esc closes.
// Screenshots land in scripts/_qa_screens/assistant-*.png.
'use strict';
const http = require('http');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const PORT = 9345;
const BASE = 'http://127.0.0.1:8734';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'scripts', '_qa_screens');
const PROFILE = path.join(ROOT, 'scripts', '_chrome_profile_assistant');

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
  async key(key, code, keyCode, text) {
    const base = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
    await this.cmd('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, base, text ? { text } : {}));
    await this.cmd('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll a boolean expression until it's truthy (heavy pages load slowly on a
// cold profile; fixed sleeps are not reliable).
async function waitFor(cdp, expr, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 20000);
  for (;;) {
    let ok = false;
    try { ok = await cdp.evalJs(expr); } catch (e) { /* page mid-navigation */ }
    if (ok) return true;
    if (Date.now() > deadline) return false;
    await sleep(300);
  }
}

const BOOTED = "!!(window.__LAKE_ASSISTANT_ACTIVE__ && window.__LAKE_ASSISTANT_KB__ && typeof FlexSearch !== 'undefined' && document.querySelector('#chat-widget .la-launcher'))";

async function newTab(opts) {
  const t = await httpGetJson('/json/new?about:blank');
  const cdp = new CDP(await wsConnect(t.webSocketDebuggerUrl));
  await cdp.cmd('Page.enable');
  await cdp.cmd('Runtime.enable');
  await cdp.cmd('Log.enable');
  await cdp.cmd('Network.enable');
  await cdp.cmd('Emulation.setDeviceMetricsOverride', {
    width: opts.w, height: opts.h, deviceScaleFactor: 1, mobile: !!opts.mobile,
  });
  return cdp;
}

// Ask a question through the real UI (input + form submit) and wait for the
// bot's reply; returns { text, links } of the last bot message.
const askExpr = (q) => `(async () => {
  const input = document.querySelector('#chat-widget .la-input');
  const form = document.querySelector('#chat-widget .la-inputrow');
  input.value = ${JSON.stringify(q)};
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const msgs = document.querySelectorAll('#chat-widget .la-msg:not(.la-typing)');
    const last = msgs[msgs.length - 1];
    if (last && last.classList.contains('la-bot')) {
      return {
        text: last.querySelector('p').textContent,
        links: Array.from(last.querySelectorAll('a')).map((a) => a.getAttribute('href') + ' | ' + a.textContent),
      };
    }
  }
  return null;
})()`;

const openExpr = `(() => {
  const btn = document.querySelector('#chat-widget .la-launcher');
  if (document.querySelector('#chat-widget .la-panel').hidden) btn.click();
  return !document.querySelector('#chat-widget .la-panel').hidden;
})()`;

const stateExpr = `JSON.stringify({
  assistantActive: !!window.__LAKE_ASSISTANT_ACTIVE__,
  flexsearch: typeof FlexSearch !== 'undefined',
  kb: !!window.__LAKE_ASSISTANT_KB__,
  kbLangs: window.__LAKE_ASSISTANT_KB__ ? Object.keys(window.__LAKE_ASSISTANT_KB__.langs) : null,
  legacyGone: !document.getElementById('chat-btn') && !document.getElementById('chat-box'),
  lang: window.LakeI18n ? window.LakeI18n.current : null,
})`;

async function main() {
  fs.rmSync(PROFILE, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--hide-scrollbars', '--user-data-dir=' + PROFILE,
    '--disable-crash-reporter', '--disable-breakpad',
    `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*',
    'about:blank',
  ], { stdio: 'ignore' });
  let failures = 0;
  const check = (label, ok, detail) => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${label}${detail ? ' — ' + detail : ''}`);
    if (!ok) failures++;
  };
  try {
    await waitForPort(120);
    await sleep(600);

    /* ---------- A. Desktop: EN, sw switch, reload/history, offline ---- */
    console.log('A. DESKTOP 1280x900 (index.html)');
    const d = await newTab({ w: 1280, h: 900 });
    await d.cmd('Page.navigate', { url: BASE + '/index.html' });
    check('page booted (assistant + KB + FlexSearch)', await waitFor(d, BOOTED, 30000));
    const st = JSON.parse(await d.evalJs(stateExpr));
    check('assistant boot state', st.assistantActive && st.flexsearch && st.kb && st.legacyGone, JSON.stringify(st));

    await d.evalJs(openExpr);
    await sleep(500);
    await d.shot('assistant-desktop-open.png');

    const en = await d.evalJs(askExpr('Which countries do you operate in?'));
    check('EN countries answer', !!en && /Tanzania/.test(en.text) && /Kenya/.test(en.text) && /Mozambique/.test(en.text) && /8 countries/.test(en.text), en && en.text.slice(0, 110));
    check('EN answer has source link', !!en && en.links.some((l) => l.includes('africa-network.html')), en && en.links.join(' ; '));
    await d.shot('assistant-desktop-en-countries.png');

    // Live language switch to Swahili.
    await d.evalJs("window.LakeI18n.apply('sw')");
    await sleep(600);
    const placeholderSw = await d.evalJs("document.querySelector('#chat-widget .la-input').placeholder");
    check('UI re-translated after apply(sw)', /Uliza/.test(placeholderSw), placeholderSw);
    const swAns = await d.evalJs(askExpr('Mnafanya kazi nchi gani?'));
    check('SW countries answer', !!swAns && /nchi 8/.test(swAns.text) && /Msumbiji/.test(swAns.text), swAns && swAns.text.slice(0, 110));
    await d.shot('assistant-desktop-sw-countries.png');

    // Reload: history must be restored from IndexedDB.
    await d.cmd('Page.navigate', { url: BASE + '/index.html' });
    check('page re-booted after reload', await waitFor(d, BOOTED, 30000));
    await sleep(500); // allow the async IndexedDB restore to render
    await d.evalJs(openExpr);
    await sleep(700);
    const restored = await d.evalJs("document.querySelectorAll('#chat-widget .la-msg').length");
    check('history restored after reload (IndexedDB)', restored >= 4, restored + ' messages');
    await d.shot('assistant-desktop-restored.png');

    // Offline: assistant must still answer (all retrieval is local).
    await d.cmd('Network.emulateNetworkConditions', {
      offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
    });
    const probe = await d.evalJs("fetch('assets/i18n-content.json', {cache:'no-store'}).then(() => 'online').catch(() => 'offline-or-sw')");
    console.log('  network probe while offline: ' + probe);
    const off = await d.evalJs(askExpr('Una malori mangapi?'));
    check('answers while offline (sw trucks)', !!off && /700/.test(off.text), off && off.text.slice(0, 110));
    await d.shot('assistant-desktop-offline.png');
    await d.cmd('Network.emulateNetworkConditions', {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
    });

    // Restore language for later sessions/humans.
    await d.evalJs("window.LakeI18n.apply('en')");
    await sleep(300);
    const dErrors = d.errors.filter((e) => !/favicon/.test(e));
    check('zero console errors (desktop)', dErrors.length === 0, dErrors.join(' | ') || 'none');
    d.ws.close();

    /* ---------- B. Mobile 390px sheet ---------------------------------- */
    console.log('B. MOBILE 390x844');
    const m = await newTab({ w: 390, h: 844, mobile: true });
    await m.cmd('Page.navigate', { url: BASE + '/index.html' });
    check('mobile page booted', await waitFor(m, BOOTED, 30000));
    await m.evalJs(openExpr);
    await sleep(500);
    const sheet = JSON.parse(await m.evalJs(`JSON.stringify((() => {
      const r = document.querySelector('#chat-widget .la-panel').getBoundingClientRect();
      return { w: r.width, h: r.height, top: r.top, launcherHidden: getComputedStyle(document.querySelector('#chat-widget .la-launcher')).display === 'none' };
    })())`));
    check('mobile full-height sheet', sheet.w === 390 && sheet.h === 844 && sheet.top === 0, JSON.stringify(sheet));
    await m.shot('assistant-mobile-sheet.png');
    const mErrors = m.errors.filter((e) => !/favicon/.test(e));
    check('zero console errors (mobile)', mErrors.length === 0, mErrors.join(' | ') || 'none');
    m.ws.close();

    /* ---------- C. Keyboard-only operation ----------------------------- */
    console.log('C. KEYBOARD-ONLY (desktop)');
    const k = await newTab({ w: 1280, h: 900 });
    await k.cmd('Page.navigate', { url: BASE + '/about.html' });
    check('about page booted', await waitFor(k, BOOTED, 30000));
    await k.evalJs("document.querySelector('#chat-widget .la-launcher').focus(); document.activeElement.className");
    await k.key('Enter', 'Enter', 13, '\r');
    await sleep(600);
    const focusInInput = await k.evalJs("document.activeElement.classList.contains('la-input')");
    check('Enter opens panel, focus in input', focusInInput);
    await k.cmd('Input.insertText', { text: 'Who is the CEO?' });
    await k.key('Enter', 'Enter', 13, '\r');
    await sleep(900);
    const kbAns = await k.evalJs("(() => { const m = document.querySelectorAll('#chat-widget .la-msg:not(.la-typing)'); const l = m[m.length-1]; return l && l.classList.contains('la-bot') ? l.querySelector('p').textContent : null; })()");
    check('typed question answered (CEO)', !!kbAns && /Awadh/.test(kbAns), kbAns && kbAns.slice(0, 100));
    // Focus trap: tab forward 8 times, focus must stay inside the panel.
    let trapped = true;
    for (let i = 0; i < 8; i++) {
      await k.key('Tab', 'Tab', 9);
      await sleep(80);
      const inside = await k.evalJs("!!document.activeElement.closest('#chat-widget .la-panel')");
      if (!inside) trapped = false;
    }
    check('focus trapped in panel over 8 Tabs', trapped);
    await k.shot('assistant-keyboard.png');
    await k.key('Escape', 'Escape', 27);
    await sleep(400);
    const closed = await k.evalJs("document.querySelector('#chat-widget .la-panel').hidden && document.activeElement.classList.contains('la-launcher')");
    check('Esc closes and returns focus to launcher', closed);
    const kErrors = k.errors.filter((e) => !/favicon/.test(e));
    check('zero console errors (keyboard)', kErrors.length === 0, kErrors.join(' | ') || 'none');
    k.ws.close();

    console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
    process.exitCode = failures === 0 ? 0 : 1;
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
