/**
 * CDP screenshot of #fuel-experience on live site after planet textures load.
 * Dependency-free (Chrome DevTools Protocol), Windows-friendly.
 */
'use strict';
const http = require('http');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const CHROME =
  process.env.CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9335;
const TARGET = process.env.QA_URL || 'https://lakegroup.vercel.app/';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'scripts', '_qa_screens');
const PROFILE = path.join(ROOT, 'scripts', '_chrome_profile_planet_qa');

function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const key = crypto.randomBytes(16).toString('base64');
    const sock = net.connect(u.port, u.hostname, () => {
      sock.write(
        `GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.hostname}:${u.port}\r\n` +
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
          header[0] = 0x81;
          header[1] = 0x80 | 126;
          header.writeUInt16BE(payload.length, 2);
        } else {
          header = Buffer.alloc(10);
          header[0] = 0x81;
          header[1] = 0x80 | 127;
          header.writeBigUInt64BE(BigInt(payload.length), 2);
        }
        const masked = Buffer.from(payload);
        for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i % 4];
        sock.write(Buffer.concat([header, mask, masked]));
      },
      onMessage(fn) {
        listeners.push(fn);
      },
      close() {
        sock.destroy();
      },
    };
    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!upgraded) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        const head = buf.slice(0, idx).toString();
        if (!/101/.test(head.split('\r\n')[0])) {
          reject(new Error('WS upgrade failed: ' + head));
          return;
        }
        buf = buf.slice(idx + 4);
        upgraded = true;
        resolve(api);
      }
      for (;;) {
        if (buf.length < 2) return;
        const op = buf[0] & 0x0f;
        let len = buf[1] & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          len = Number(buf.readBigUInt64BE(2));
          off = 10;
        }
        if (buf.length < off + len) return;
        const payload = buf.slice(off, off + len);
        buf = buf.slice(off + len);
        if (op === 1) {
          let msg;
          try {
            msg = JSON.parse(payload.toString());
          } catch (e) {
            continue;
          }
          listeners.forEach((fn) => fn(msg));
        } else if (op === 8) {
          sock.destroy();
          return;
        }
      }
    });
    sock.on('error', reject);
  });
}

function httpGetJson(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: PORT, path: pathname, method: 'PUT' },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(new Error('bad json: ' + d));
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function waitForPort(retries) {
  return new Promise((resolve, reject) => {
    const tryOnce = (n) => {
      const s = net.connect(PORT, '127.0.0.1', () => {
        s.destroy();
        resolve();
      });
      s.on('error', () => {
        s.destroy();
        n > 0 ? setTimeout(() => tryOnce(n - 1), 300) : reject(new Error('chrome port never opened'));
      });
    };
    tryOnce(retries);
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.tex = [];
    ws.onMessage((msg) => {
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
      if (msg.method === 'Network.responseReceived') {
        const url = msg.params.response.url;
        if (/earth_(color_2048|specular_1024|normal_1024)\.jpg/.test(url)) {
          this.tex.push({
            url,
            status: msg.params.response.status,
            len:
              msg.params.response.headers['content-length'] ||
              msg.params.response.headers['Content-Length'],
          });
        }
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send({ id, method, params });
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function screenshotFull(cdp, outPath) {
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('saved', outPath, 'bytes', fs.statSync(outPath).size);
}

(async () => {
  fs.rmSync(PROFILE, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(PROFILE, { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--hide-scrollbars',
      '--user-data-dir=' + PROFILE,
      '--disable-crash-reporter',
      '--disable-breakpad',
      '--use-angle=swiftshader-webgl',
      '--enable-unsafe-swiftshader',
      `--remote-debugging-port=${PORT}`,
      '--remote-allow-origins=*',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    await waitForPort(120);
    await sleep(600);

    const t = await httpGetJson('/json/new?about:blank');
    const ws = await wsConnect(t.webSocketDebuggerUrl);
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send('Page.navigate', { url: TARGET });
    await sleep(2500);

    for (let k = 0; k < 40; k++) {
      await cdp.eval(
        "document.getElementById('fuel-experience') && document.getElementById('fuel-experience').scrollIntoView({block:'center'}); true"
      );
      const ok = await cdp.eval(
        "!!document.querySelector('#experience-3d-panel canvas') && document.querySelector('#experience-3d-panel canvas').width > 32"
      );
      const texOk = cdp.tex.filter((x) => x.status === 200).length >= 2;
      if (ok && texOk) break;
      await sleep(750);
    }
    await sleep(4500);

    console.log('texture_responses', JSON.stringify(cdp.tex, null, 2));
    const state = await cdp.eval(`JSON.stringify({
      canvas: !!document.querySelector('#experience-3d-panel canvas'),
      w: (document.querySelector('#experience-3d-panel canvas')||{}).width||0,
      h: (document.querySelector('#experience-3d-panel canvas')||{}).height||0
    })`);
    console.log('state', state);

    await screenshotFull(cdp, path.join(OUT, 'planet-textures-fuel-desktop.png'));

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.eval(
      "document.getElementById('fuel-experience') && document.getElementById('fuel-experience').scrollIntoView({block:'center'}); true"
    );
    await sleep(3500);
    await screenshotFull(cdp, path.join(OUT, 'planet-textures-fuel-mobile.png'));

    ws.close();
  } finally {
    try {
      chrome.kill();
    } catch (_) {}
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
