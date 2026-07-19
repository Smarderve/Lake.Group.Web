#!/usr/bin/env node
'use strict';
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'scripts', '_scraped');
fs.mkdirSync(OUT, { recursive: true });

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const go = (u, n) => {
      lib
        .get(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LakeGroupBot/1.0)' }, timeout: 45000 }, (r) => {
          if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && n < 6) {
            const next = r.headers.location.startsWith('http')
              ? r.headers.location
              : new URL(r.headers.location, u).href;
            go(next, n + 1);
            return;
          }
          const chunks = [];
          r.on('data', (d) => chunks.push(d));
          r.on('end', () =>
            resolve({ status: r.statusCode, headers: r.headers, body: Buffer.concat(chunks), url: u })
          );
        })
        .on('error', reject);
    };
    go(url, 0);
  });
}

function slug(u) {
  return u.replace(/^https?:\/\//, '').replace(/[\/:?&=]+/g, '_').replace(/_+$/, '');
}

async function savePage(url) {
  const r = await get(url);
  const file = path.join(OUT, slug(url) + '.html');
  fs.writeFileSync(file, r.body);
  console.log(r.status, url, '->', path.basename(file), r.body.length);
  return { ...r, file };
}

function extractUrls(html, base) {
  const out = new Set();
  const re = /(?:src|href)=["']([^"']+\.(?:png|jpe?g|webp|svg|gif))["']/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      out.add(new URL(m[1], base).href);
    } catch (_) {}
  }
  const abs = /https?:\/\/[^"'\\\s>]+\.(?:png|jpe?g|webp|svg)/gi;
  while ((m = abs.exec(html))) out.add(m[0]);
  return [...out];
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function encodePngRGBA(width, height, rgba) {
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw);
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crcBuf]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function decodePng(buf) {
  if (buf[0] !== 0x89 || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('not png');
  let i = 8;
  const idats = [];
  let w = 0;
  let h = 0;
  let ctype = 6;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + len);
    i += 12 + len;
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      ctype = data[9];
    } else if (type === 'IDAT') idats.push(data);
    else if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const bpp = ctype === 6 ? 4 : ctype === 2 ? 3 : ctype === 4 ? 2 : 1;
  const stride = 1 + w * bpp;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = y * stride;
    const filter = raw[row];
    if (filter !== 0) throw new Error('unsupported png filter ' + filter + ' in ' + w + 'x' + h);
    for (let x = 0; x < w; x++) {
      const s = row + 1 + x * bpp;
      const d = (y * w + x) * 4;
      if (bpp === 4) {
        rgba[d] = raw[s];
        rgba[d + 1] = raw[s + 1];
        rgba[d + 2] = raw[s + 2];
        rgba[d + 3] = raw[s + 3];
      } else if (bpp === 3) {
        rgba[d] = raw[s];
        rgba[d + 1] = raw[s + 1];
        rgba[d + 2] = raw[s + 2];
        rgba[d + 3] = 255;
      } else {
        rgba[d] = rgba[d + 1] = rgba[d + 2] = raw[s];
        rgba[d + 3] = bpp === 2 ? raw[s + 1] : 255;
      }
    }
  }
  return { w, h, rgba };
}

async function downloadToPng(url, destPath) {
  const r = await get(url);
  if (r.status !== 200) throw new Error('download ' + url + ' status ' + r.status);
  const ct = String(r.headers['content-type'] || '');
  const lower = url.toLowerCase();
  if (lower.endsWith('.png') || ct.includes('png')) {
    fs.writeFileSync(destPath, r.body);
    console.log('saved png', destPath, r.body.length);
    return;
  }
  // For jpg/webp try sharp if available; else keep bytes with correct ext then convert via canvas-less path
  const tmp = destPath.replace(/\.png$/i, path.extname(lower) || '.bin');
  fs.writeFileSync(tmp, r.body);
  try {
    const sharp = require('sharp');
    await sharp(tmp).png().toFile(destPath);
    fs.unlinkSync(tmp);
    console.log('converted via sharp', destPath);
  } catch (e) {
    console.log('WARN cannot convert', url, e.message, 'kept', tmp);
  }
}

(async () => {
  const pages = [
    'https://lakeagro.com/',
    'https://atl-tz.com/',
    'https://atl-tz.com/about-us/',
    'https://atl-tz.com/our-products/',
    'https://atl-tz.com/contact-us/'
  ];
  const htmlByUrl = {};
  for (const u of pages) {
    try {
      const r = await savePage(u);
      htmlByUrl[u] = r.body.toString('utf8');
    } catch (e) {
      console.log('FAIL page', u, e.message);
    }
  }

  const agroHtml = htmlByUrl['https://lakeagro.com/'] || '';
  const atlHtml = htmlByUrl['https://atl-tz.com/'] || '';
  console.log('--- AGRO asset urls ---');
  extractUrls(agroHtml, 'https://lakeagro.com/').forEach((u) => console.log(u));
  console.log('--- ATL asset urls ---');
  extractUrls(atlHtml, 'https://atl-tz.com/').forEach((u) => console.log(u));

  const hex = [...agroHtml.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].map((m) => m[0].toLowerCase());
  console.log('agro hex', [...new Set(hex)].slice(0, 40).join(' '));

  const logoDir = path.join(ROOT, 'assets', 'images', 'logos', 'companies');
  const agroCandidates = [
    'https://lakeagro.com/assets/images/logo2.png',
    'https://lakeagro.com/assets/images/logoresizey.png',
    'https://lakeagro.com/assets/images/logo.png'
  ];
  for (const u of agroCandidates) {
    try {
      await downloadToPng(u, path.join(logoDir, 'lake-agro.png'));
      break;
    } catch (e) {
      console.log('agro logo fail', u, e.message);
    }
  }

  const atlLogoGuess = extractUrls(atlHtml, 'https://atl-tz.com/').filter(
    (u) => /logo|brand|header|atl/i.test(u) && !/\.svg$/i.test(u)
  );
  console.log('atl logo candidates', atlLogoGuess);
  let atlOk = false;
  for (const u of atlLogoGuess) {
    try {
      await downloadToPng(u, path.join(logoDir, 'atl.png'));
      atlOk = true;
      break;
    } catch (e) {
      console.log('atl logo fail', u, e.message);
    }
  }
  if (!atlOk) {
    // known wp uploads pattern from prior fetch
    const extras = [
      'https://atl-tz.com/wp-content/uploads/2025/02/46-qu1wm36pke816ngzqbe4u9h1r5e63spqo7k60ix8xc.png'
    ];
    for (const u of extras) {
      try {
        await downloadToPng(u, path.join(logoDir, 'atl.png'));
        atlOk = true;
        break;
      } catch (e) {
        console.log('atl extra fail', u, e.message);
      }
    }
  }
  console.log('done atlOk', atlOk, 'agro', fs.existsSync(path.join(logoDir, 'lake-agro.png')));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
