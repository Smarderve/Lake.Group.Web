/* Verify offline.html renders its offline UI and capture a screenshot.
 * Uses Chrome DevTools Protocol over Node's native WebSocket (no deps).
 * Trick: inject navigator.onLine=false via Page.addScriptToEvaluateOnNewDocument
 * so the page's auto-redirect (if (navigator.onLine) onOnline()) never fires,
 * while the network stays online so all real CSS/fonts/images load.
 */
const fs = require('fs');
const http = require('http');

const CDP_PORT = 9333;
const TARGET_URL = 'http://127.0.0.1:8124/offline.html';
const OUT_PNG = process.argv[2] || '_offline_card.png';
const VW = parseInt(process.argv[3] || '1280', 10);
const VH = parseInt(process.argv[4] || '800', 10);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJson(url, method) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: method || 'GET' }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('bad json from ' + url + ': ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function createTarget() {
  try {
    return await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, 'PUT');
  } catch (e) {
    return await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, 'GET');
  }
}

async function main() {
  // wait for chrome debugging endpoint
  let version = null;
  for (let i = 0; i < 30; i++) {
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: VW, height: VH, deviceScaleFactor: 1, mobile: VW < 600
  });

  // Force offline *state* (navigator.onLine === false) before any page script runs.
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });`
  });

  const loaded = new Promise(resolve => {
    const h = msg => { const m = JSON.parse(msg.data); if (m.method === 'Page.loadEventFired') { ws.removeEventListener('message', h); resolve(); } };
    ws.addEventListener('message', h);
  });
  await send('Page.navigate', { url: TARGET_URL });
  await Promise.race([loaded, sleep(8000)]);

  // give the page a beat to settle + lazy styles
  await sleep(600);

  // Verify computed styles + offline UI text
  const probe = await send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('main.card');
      const cs = card ? getComputedStyle(card) : null;
      const status = document.querySelector('#net-status');
      return {
        url: location.href,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        cardFound: !!card,
        cardBg: cs ? cs.backgroundImage : null,
        cardBorderTop: cs ? cs.borderTopColor + ' ' + cs.borderTopWidth + ' ' + cs.borderTopStyle : null,
        cardPadding: cs ? cs.padding : null,
        cardMaxWidth: cs ? cs.maxWidth : null,
        cardShadow: cs ? cs.boxShadow : null,
        cardRadius: cs ? cs.borderRadius : null,
        h1: document.querySelector('h1') ? document.querySelector('h1').innerText : null,
        lead: document.querySelector('p.lead') ? document.querySelector('p.lead').innerText.slice(0, 60) : null,
        retry: document.querySelector('#retry-btn') ? document.querySelector('#retry-btn').innerText : null,
        statusClass: status ? status.className : null,
        statusText: status ? document.querySelector('#net-text').innerText : null,
        navOnLine: navigator.onLine
      };
    })()`,
    returnByValue: true
  });
  console.log('PROBE_RESULT=' + JSON.stringify(probe.result.value, null, 2));

  // Screenshot the card area (the whole viewport is fine; card is centered)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(OUT_PNG, Buffer.from(shot.data, 'base64'));
  console.log('SCREENSHOT_SAVED=' + OUT_PNG + ' bytes=' + fs.statSync(OUT_PNG).size);

  ws.close();
  process.exit(0);
}

main().catch(err => { console.error('FATAL: ' + err.message); process.exit(1); });
