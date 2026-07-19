#!/usr/bin/env node
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'assets', 'images', 'logos', 'companies');
const SCRAPED = path.join(__dirname, '_scraped');

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          get(new URL(r.headers.location, url).href).then(resolve, reject);
          return;
        }
        const chunks = [];
        r.on('data', (d) => chunks.push(d));
        r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(chunks), ct: r.headers['content-type'] }));
      })
      .on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(SCRAPED, { recursive: true });
  const urls = [
    'https://lakeagro.com/assets/images/logoresizey.png',
    'https://lakeagro.com/assets/images/logo2.png',
    'https://lakeagro.com/assets/images/logo.png',
    'https://lakeagro.com/assets/images/favicon.png',
    'https://lakeagro.com/favicon.ico'
  ];
  for (const u of urls) {
    try {
      const r = await get(u);
      const name = u.split('/').pop();
      const file = path.join(SCRAPED, 'agro_' + name);
      fs.writeFileSync(file, r.body);
      const isPng = r.body[0] === 0x89 && r.body[1] === 0x50;
      let dims = '';
      if (isPng && r.body.length > 24) {
        dims = r.body.readUInt32BE(16) + 'x' + r.body.readUInt32BE(20);
      }
      console.log(r.status, u, r.body.length, isPng ? 'PNG' : 'other', dims, r.ct);
    } catch (e) {
      console.log('FAIL', u, e.message);
    }
  }

  // Parse homepage for green CSS and product text
  const home = fs.readFileSync(path.join(SCRAPED, 'lakeagro.com.html'), 'utf8');
  const cssLinks = [...home.matchAll(/href=["']([^"']+\.css[^"']*)["']/gi)].map((m) => m[1]);
  console.log('css', cssLinks);
  for (const href of cssLinks.slice(0, 8)) {
    const url = new URL(href, 'https://lakeagro.com/').href;
    try {
      const r = await get(url);
      const text = r.body.toString('utf8');
      const greens = [...text.matchAll(/#([0-9a-fA-F]{3,8})\b/g)]
        .map((m) => m[0].toLowerCase())
        .filter((h) => {
          if (h.length === 4) {
            const r = parseInt(h[1] + h[1], 16);
            const g = parseInt(h[2] + h[2], 16);
            const b = parseInt(h[3] + h[3], 16);
            return g > r + 20 && g > b + 10;
          }
          if (h.length >= 7) {
            const r = parseInt(h.slice(1, 3), 16);
            const g = parseInt(h.slice(3, 5), 16);
            const b = parseInt(h.slice(5, 7), 16);
            return g > r + 20 && g > b + 10;
          }
          return false;
        });
      console.log('greens from', url, [...new Set(greens)].slice(0, 20).join(' '));
      fs.writeFileSync(path.join(SCRAPED, 'agro_' + path.basename(href.split('?')[0])), text.slice(0, 200000));
    } catch (e) {
      console.log('css fail', url, e.message);
    }
  }

  // Prefer logoresizey if it's a real agro mark (not tiny)
  const candidates = ['agro_logoresizey.png', 'agro_logo2.png', 'agro_logo.png'];
  for (const c of candidates) {
    const p = path.join(SCRAPED, c);
    if (!fs.existsSync(p)) continue;
    const b = fs.readFileSync(p);
    if (b[0] !== 0x89) continue;
    const w = b.readUInt32BE(16);
    const h = b.readUInt32BE(20);
    console.log('candidate', c, w, h, b.length);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
