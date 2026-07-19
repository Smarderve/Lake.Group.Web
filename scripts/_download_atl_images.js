#!/usr/bin/env node
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'images', 'atl');
fs.mkdirSync(DIR, { recursive: true });

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          get(new URL(r.headers.location, url).href).then(resolve, reject);
          return;
        }
        const c = [];
        r.on('data', (d) => c.push(d));
        r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(c) }));
      })
      .on('error', reject);
  });
}

(async () => {
  const items = [
    ['https://atl-tz.com/wp-content/uploads/2025/02/1-2.jpg', 'tanker-1.jpg'],
    ['https://atl-tz.com/wp-content/uploads/2025/02/39.jpg', 'tanker-2.jpg'],
    [
      'https://atl-tz.com/wp-content/uploads/2025/02/46-qu1wm36pke816ngzqbe4u9h1r5e63spqo7k60ix8xc.png',
      'tanker-3.png'
    ]
  ];
  for (const [url, name] of items) {
    const r = await get(url);
    fs.writeFileSync(path.join(DIR, name), r.body);
    console.log(r.status, name, r.body.length);
  }
  let html = fs.readFileSync(path.join(ROOT, 'atl.html'), 'utf8');
  html = html
    .replace(
      /https:\/\/atl-tz\.com\/wp-content\/uploads\/2025\/02\/1-2\.jpg/g,
      'assets/images/atl/tanker-1.jpg'
    )
    .replace(
      /https:\/\/atl-tz\.com\/wp-content\/uploads\/2025\/02\/39\.jpg/g,
      'assets/images/atl/tanker-2.jpg'
    )
    .replace(
      /https:\/\/atl-tz\.com\/wp-content\/uploads\/2025\/02\/46-qu1wm36pke816ngzqbe4u9h1r5e63spqo7k60ix8xc\.png/g,
      'assets/images/atl/tanker-3.png'
    );
  fs.writeFileSync(path.join(ROOT, 'atl.html'), html);
  console.log('atl.html images localized');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
