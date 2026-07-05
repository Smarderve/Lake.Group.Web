#!/usr/bin/env node
// QA: dependency-free CDP client. Launches headless Chrome, opens pages at a
// mobile viewport, and evaluates JS expressions (scrollWidth, offender rects,
// offline.html navigation counting). No puppeteer needed.
'use strict';
const http = require('http');
const net = require('net');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const PORT = 9333;
const ROOT = path.join(__dirname, '..');

/* ---------------- minimal WebSocket client (client->server masked) ------ */
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
      // parse frames (server->client unmasked)
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
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.onMessage((msg) => {
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
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
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2); // page names, or "--offline-test"
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--allow-file-access-from-files', '--hide-scrollbars',
    '--user-data-dir=' + path.join(ROOT, 'scripts', '_chrome_profile'),
    '--disable-crash-reporter', '--disable-breakpad',
    `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitForPort(40);
    await sleep(500);

    for (const page of args) {
      if (page === '--offline-test') {
        const t = await httpGetJson('/json/new?about:blank');
        const cdp = new CDP(await wsConnect(t.webSocketDebuggerUrl));
        await cdp.cmd('Page.enable');
        const fileUrl = 'file://' + path.join(ROOT, 'offline.html');
        await cdp.cmd('Page.navigate', { url: fileUrl });
        await sleep(1000);
        // Simulate the offline->online transition, then count navigations
        // over ~5s. Expected: exactly ONE navigation (to index.html) and no
        // bounce back to offline.html (the old bug reloaded forever).
        cdp.events.length = 0;
        await cdp.evalJs("window.dispatchEvent(new Event('online')); 'dispatched'");
        let navs = 0;
        const started = Date.now();
        while (Date.now() - started < 5200) {
          await sleep(300);
          navs += cdp.events.filter((e) => e.method === 'Page.frameNavigated' && e.params.frame && !e.params.frame.parentId).length;
          cdp.events.length = 0;
        }
        const loc = await cdp.evalJs('navigator.onLine + " | " + location.href');
        console.log(`offline.html online-test: navigations in 5s = ${navs}; onLine|url = ${loc}`);
        cdp.ws.close();
        continue;
      }
      const t = await httpGetJson('/json/new?about:blank');
      const cdp = new CDP(await wsConnect(t.webSocketDebuggerUrl));
      await cdp.cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await cdp.cmd('Page.enable');
      await cdp.cmd('Page.navigate', { url: 'file://' + path.join(ROOT, page) });
      await sleep(1800);
      // reveal everything (scroll through) then measure
      const out = await cdp.evalJs(`(async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        for (let y = 0; y <= document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await sleep(60); }
        window.scrollTo(0, 0); await sleep(400);
        const sw = document.documentElement.scrollWidth;
        const vw = window.innerWidth;
        const offenders = [];
        if (sw > vw) {
          document.querySelectorAll('body *').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.right > vw + 1 || r.left < -1) {
              if (offenders.length < 12) offenders.push(
                el.tagName + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().replace(/\\s+/g, '.') : '')
                + ' [left=' + Math.round(r.left) + ', right=' + Math.round(r.right) + ', w=' + Math.round(r.width) + ']'
              );
            }
          });
        }
        return { sw, vw, offenders };
      })()`);
      const status = out.sw <= 390 ? 'OK' : 'FAIL';
      console.log(`${page}: scrollWidth=${out.sw} innerWidth=${out.vw} -> ${status}`);
      out.offenders.forEach((o) => console.log('   offender: ' + o));
      cdp.ws.close();
    }
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().catch((e) => { console.error('ERROR: ' + e.message); process.exit(1); });
