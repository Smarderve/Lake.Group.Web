/**
 * Local verification for the hero-globe island (fresh Chrome profile each run).
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHROME =
  process.env.CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const STATIC_PORT = Number(process.env.HERO_QA_PORT || 8777);
const CDP_PORT = Number(process.env.HERO_QA_CDP || 9347);
const PROFILE = path.join(
  ROOT,
  'scripts',
  '_chrome_profile_hero_globe_qa_' + Date.now(),
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      const filePath = path.normalize(path.join(ROOT, urlPath.replace(/^\//, '')));
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType(filePath),
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(STATIC_PORT, '127.0.0.1', () => resolve(server));
  });
}

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
        const b0 = buf[0];
        const b1 = buf[1];
        const maskedBit = (b1 & 0x80) !== 0;
        let len = b1 & 0x7f;
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
        const maskLen = maskedBit ? 4 : 0;
        if (buf.length < off + maskLen + len) return;
        let payload = buf.slice(off + maskLen, off + maskLen + len);
        if (maskedBit) {
          const mask = buf.slice(off, off + 4);
          payload = Buffer.from(payload);
          for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
        }
        buf = buf.slice(off + maskLen + len);
        if ((b0 & 0x0f) === 1) {
          try {
            const msg = JSON.parse(payload.toString());
            listeners.forEach((fn) => fn(msg));
          } catch (_) {}
        }
      }
    });
    sock.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const server = await startStaticServer();
  fs.mkdirSync(PROFILE, { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-popup-blocking',
      `http://127.0.0.1:${STATIC_PORT}/index.html`,
    ],
    { stdio: 'ignore' },
  );

  let ws;
  try {
    await sleep(3500);
    const list = await new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });
    const page =
      list.find((t) => t.type === 'page' && /127\.0\.0\.1/.test(t.url)) ||
      list.find((t) => t.type === 'page') ||
      list[0];
    if (!page || !page.webSocketDebuggerUrl) throw new Error('No CDP page target');

    ws = await wsConnect(
      page.webSocketDebuggerUrl.replace('ws://localhost', 'ws://127.0.0.1'),
    );

    const network = [];
    const consoleErrors = [];
    const exceptions = [];
    let nextId = 1;
    const pending = new Map();

    ws.onMessage((msg) => {
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
      if (msg.method === 'Network.requestWillBeSent') {
        network.push(msg.params.request.url);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(
          (msg.params.args || [])
            .map((a) => a.value || a.description || '')
            .join(' '),
        );
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails || {};
        exceptions.push(d.text || (d.exception && d.exception.description) || 'exception');
      }
    });

    const send = (method, params = {}) => {
      const id = nextId++;
      return new Promise((resolve) => {
        pending.set(id, resolve);
        ws.send({ id, method, params });
      });
    };

    const evalExpr = async (expression) => {
      const msg = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (msg.error) throw new Error(JSON.stringify(msg.error));
      return msg.result && msg.result.result && msg.result.result.value;
    };

    await send('Network.enable');
    await send('Runtime.enable');
    await send('Page.enable');

    await evalExpr(
      `document.getElementById('fuel-experience') && document.getElementById('fuel-experience').scrollIntoView({block:'center'}); true`,
    );

    let ready = false;
    for (let i = 0; i < 50; i++) {
      await sleep(400);
      ready = await evalExpr(
        `(function(){
          var c = document.querySelector('#experience-3d-panel canvas');
          return !!(window.LakeHeroGlobe && c && c.width > 32 && c.height > 32);
        })()`,
      );
      if (ready) break;
    }

    const detail = await evalExpr(
      `(function(){
        var panel = document.getElementById('experience-3d-panel');
        var canvas = panel && panel.querySelector('canvas');
        return {
          hasCanvas: !!canvas,
          canvasW: canvas ? canvas.width : 0,
          canvasH: canvas ? canvas.height : 0,
          loading: panel && panel.classList.contains('is-loading'),
          error: !!(panel && panel.querySelector('.experience-3d-error')),
          globeRoots: document.querySelectorAll('#hero-globe-root').length,
          lakeHeroGlobe: typeof window.LakeHeroGlobe !== 'undefined',
          threeGlobal: typeof THREE !== 'undefined',
          scripts: Array.prototype.map.call(document.scripts, function(s){ return s.src; }).filter(Boolean),
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
      })()`,
    );

    const externalGlobe = network.filter((u) => {
      if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('chrome')) return false;
      if (u.indexOf('127.0.0.1:' + STATIC_PORT) !== -1) return false;
      return /globe|earth|unpkg|jsdelivr|cdnjs|cloudflare|textures|topo|blue.?marble/i.test(u);
    });

    const textureHits = network.filter((u) => /assets\/images\/globe\//.test(u));
    const bundleHits = network.filter((u) => /hero-globe\.bundle\.js/.test(u));
    const oldHits = network.filter((u) => /hero-3d|three\.module|images\/planet\//.test(u));

    const report = {
      canvasReady: !!ready,
      detail,
      textureHits: [...new Set(textureHits)],
      bundleHits: [...new Set(bundleHits)],
      oldAssetHits: [...new Set(oldHits)],
      externalGlobeAssetHits: [...new Set(externalGlobe)],
      consoleErrors: consoleErrors.slice(0, 20),
      exceptions: exceptions.slice(0, 20),
      bundleBytes: fs.statSync(path.join(ROOT, 'assets', 'hero-globe.bundle.js')).size,
      textures: Object.fromEntries(
        fs
          .readdirSync(path.join(ROOT, 'assets', 'images', 'globe'))
          .filter((n) => !n.endsWith('.md'))
          .map((n) => [n, fs.statSync(path.join(ROOT, 'assets', 'images', 'globe', n)).size]),
      ),
    };

    console.log(JSON.stringify(report, null, 2));

    const ok =
      report.canvasReady &&
      report.detail &&
      report.detail.hasCanvas &&
      report.externalGlobeAssetHits.length === 0 &&
      report.oldAssetHits.length === 0 &&
      report.textureHits.length >= 1 &&
      report.exceptions.length === 0;

    console.log(ok ? 'VERIFY_OK' : 'VERIFY_FAILED');
    process.exitCode = ok ? 0 : 1;
  } finally {
    try {
      if (ws) ws.close();
    } catch (_) {}
    try {
      chrome.kill();
    } catch (_) {}
    server.close();
    await sleep(800);
    try {
      fs.rmSync(PROFILE, { recursive: true, force: true });
    } catch (_) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
