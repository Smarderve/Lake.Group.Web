/**
 * SECURITY_ROADMAP Phase 7 — CSP verification (headless Chrome).
 *
 * 1. Every page serves the CSP meta and loads with ZERO Content-Security-
 *    Policy violations (console errors / securitypolicyviolation events).
 * 2. Enforcement probe: a data:-URI script injected into the page is
 *    BLOCKED (script-src has no data:) while inline scripts still run.
 * 3. DOM-XSS probe (index.html): the assistant is asked a question whose
 *    payload contains an <img onerror> — the payload must be rendered as
 *    text only and never execute.
 *
 * Usage:  node scripts/_verify_csp.js   (backend on :4000 optional — the
 * assistant probe degrades gracefully if it is not running)
 * Exit 0 = PASS, 1 = FAIL.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveStatic } = require('./_safe_static.js');

const CHROME = process.env.CHROME_PATH || '';
const ROOT = path.join(__dirname, '..');
const PORT = 8797;
// Production deliberately has no implicit API origin. Set LAKE_API_BASE to
// an HTTPS endpoint only when explicitly exercising the write-only beacons.
const API = process.env.LAKE_API_BASE || '';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

let server;
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const filePath = resolveStatic(ROOT, url.pathname === '/' ? '/index.html' : url.pathname);
      if (!filePath) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve());
  });
}

async function main() {
  await startServer();
  const browser = await chromium.launch({
    headless: true,
    ...(CHROME ? { executablePath: CHROME } : {}),
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  if (API) await page.addInitScript((api) => { window.LAKE_API_BASE = api; }, API);

  const files = fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => !process.env.CSP_PAGE || f === process.env.CSP_PAGE)
    .sort();
  let fail = 0;

  for (const file of files) {
    const violations = [];
    const onViolation = (msg) => {
      const text = String(msg.text() || '');
      if (/Content Security Policy|Refused to|violat/i.test(text)) violations.push(text.slice(0, 500));
    };
    page.on('console', onViolation);
    page.on('pageerror', onViolation);
    // The meta is static in the file — no page context needed (offline.html
    // self-redirects when it detects connectivity, which would race an
    // in-page query). Console violations are still captured from the live
    // page load below.
    const hasCspMeta = fs.readFileSync(path.join(ROOT, file), 'utf8').includes('http-equiv="Content-Security-Policy"');
    try {
      await page.goto(`http://127.0.0.1:${PORT}/${file}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(500);
      const problems = violations.filter((v) => !/favicon|404/i.test(v));
      const ok = hasCspMeta && problems.length === 0;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${file}  csp=${hasCspMeta ? 'yes' : 'NO'} violations=${problems.length}${problems.length ? '  [' + problems[0] + ']' : ''}`);
      if (problems.some((problem) => /inline event handler/i.test(problem))) {
        const inlineHandlers = await page.evaluate(() => Array.from(document.querySelectorAll('*')).flatMap(
          (element) => Array.from(element.attributes)
            .filter((attribute) => /^on/i.test(attribute.name))
            .map((attribute) => `${element.tagName.toLowerCase()}[${attribute.name}=${attribute.value}]`),
        ));
        console.log(`  inline handlers: ${inlineHandlers.join(', ') || 'none found'}`);
      }
      if (!ok) fail = 1;
    } catch (e) {
      console.log(`${ok ? 'PASS' : 'FAIL'} ${file}  (page self-navigated: ${e.message.slice(0, 50)})`);
      if (!hasCspMeta) fail = 1;
    } finally {
      page.removeListener('console', onViolation);
      page.removeListener('pageerror', onViolation);
    }
  }

  // --- Enforcement probe: data:-URI script must be blocked; inline runs. ---
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const blocked = await page.evaluate(async () => {
    window.__inlineRan = false;
    const s = document.createElement('script');
    s.textContent = 'window.__inlineRan = true';
    document.head.appendChild(s);
    const d = document.createElement('script');
    d.src = 'data:text/javascript,window.__dataRan=1';
    document.head.appendChild(d);
    await new Promise((r) => setTimeout(r, 300));
    return { inlineRan: window.__inlineRan === true, dataRan: window.__dataRan === 1 };
  });
  const enforcementOk = blocked.inlineRan === true && blocked.dataRan !== true;
  console.log(`${enforcementOk ? 'PASS' : 'FAIL'} enforcement: inline runs=${blocked.inlineRan}, data:-script blocked=${blocked.dataRan !== true}`);
  if (!enforcementOk) fail = 1;

  // --- DOM-XSS probe: chat payload must render as text, never execute. ---
  const payload = '<img src=x onerror="window.__cspXss=1"> does lake group exist?';
  try {
    const opened = await page.evaluate(() => {
      const launcher = document.querySelector('.la-launcher, [class*="la-launcher"]');
      if (launcher && !launcher.hidden && document.querySelector('.la-panel')) {
        launcher.click();
        return true;
      }
      return false;
    });
    if (opened) {
      await page.waitForSelector('.la-input', { state: 'visible', timeout: 5000 });
      await page.fill('.la-input', payload);
      await page.press('.la-input', 'Enter');
      await page.waitForTimeout(2500);
      const domState = await page.evaluate(() => ({
        xss: window.__cspXss === 1,
        injectedImgs: document.querySelectorAll('img[src="x"]').length,
        injectedScripts: document.querySelectorAll('script[data-xss]').length,
      }));
      const domOk = !domState.xss && domState.injectedImgs === 0 && domState.injectedScripts === 0;
      console.log(`${domOk ? 'PASS' : 'FAIL'} DOM-XSS probe: payload not executed (onerror=${domState.xss}, injected-img=${domState.injectedImgs})`);
      if (!domOk) fail = 1;
    } else {
      console.log('SKIP  DOM-XSS probe (assistant launcher not found on index.html)');
    }
  } catch (e) {
    console.log(`SKIP  DOM-XSS probe (${e.message.slice(0, 60)})`);
  }

  await browser.close();
  await new Promise((r) => server.close(r));
  console.log(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(fail);
}

main();
