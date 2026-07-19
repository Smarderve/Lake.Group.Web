#!/usr/bin/env node
/**
 * Root-cause fix for "nav company logo still small":
 * Company PNGs are ~1969x1969 with ~18% content height (black letterbox).
 * Letterbox CSS scale (1.75) only grew the canvas; the mark stayed ~19px.
 * Trim near-black padding and write tight transparent PNGs so --nav-logo-height
 * maps to the actual mark (parity with LAKE_GROUP_LOGO.png).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DIR = path.join(__dirname, '..', 'assets', 'images', 'logos', 'companies');
const BACKUP = path.join(DIR, '_pretrim');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function encodePngRGBA(width, height, rgba) {
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
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
  if (buf[0] !== 0x89) throw new Error('not png');
  let i = 8;
  const idats = [];
  let w = 0;
  let h = 0;
  let ctype = 6;
  let depth = 8;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + len);
    i += 12 + len;
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      ctype = data[9];
    } else if (type === 'IDAT') idats.push(data);
    else if (type === 'IEND') break;
  }
  if (depth !== 8) throw new Error('bit depth ' + depth);
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const bpp = ctype === 6 ? 4 : ctype === 2 ? 3 : ctype === 4 ? 2 : 1;
  const stride = 1 + w * bpp;
  const rgba = Buffer.alloc(w * h * 4);

  // Support filter types 0-4 (Paeth etc.) — many logo exporters use None only,
  // but be safe for Sub/Up/Average/Paeth.
  const prev = Buffer.alloc(w * bpp);
  const cur = Buffer.alloc(w * bpp);
  for (let y = 0; y < h; y++) {
    const row = y * stride;
    const filter = raw[row];
    for (let x = 0; x < w * bpp; x++) cur[x] = raw[row + 1 + x];
    const paeth = (a, b, c) => {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      if (pa <= pb && pa <= pc) return a;
      if (pb <= pc) return b;
      return c;
    };
    for (let x = 0; x < w * bpp; x++) {
      const left = x >= bpp ? cur[x - bpp] : 0;
      const up = prev[x];
      const upLeft = x >= bpp ? prev[x - bpp] : 0;
      let v = cur[x];
      if (filter === 1) v = (v + left) & 255;
      else if (filter === 2) v = (v + up) & 255;
      else if (filter === 3) v = (v + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) v = (v + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error('bad filter ' + filter);
      cur[x] = v;
    }
    for (let x = 0; x < w; x++) {
      const s = x * bpp;
      const d = (y * w + x) * 4;
      if (bpp === 4) {
        rgba[d] = cur[s];
        rgba[d + 1] = cur[s + 1];
        rgba[d + 2] = cur[s + 2];
        rgba[d + 3] = cur[s + 3];
      } else if (bpp === 3) {
        rgba[d] = cur[s];
        rgba[d + 1] = cur[s + 1];
        rgba[d + 2] = cur[s + 2];
        rgba[d + 3] = 255;
      } else if (bpp === 2) {
        rgba[d] = rgba[d + 1] = rgba[d + 2] = cur[s];
        rgba[d + 3] = cur[s + 1];
      } else {
        rgba[d] = rgba[d + 1] = rgba[d + 2] = cur[s];
        rgba[d + 3] = 255;
      }
    }
    prev.set(cur);
  }
  return { w, h, rgba };
}

function isContent(r, g, b, a) {
  if (a < 16) return false;
  // Treat near-black as padding (baked letterbox)
  return r + g + b > 48;
}

function trimFile(file) {
  const buf = fs.readFileSync(file);
  const { w, h, rgba } = decodePng(buf);
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (isContent(rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3])) {
        n++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!n) {
    console.log('skip empty', path.basename(file));
    return;
  }
  const pad = 12;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const nw = maxX - minX + 1;
  const nh = maxY - minY + 1;
  const fillH = ((maxY - minY - 2 * pad + 1) / h) * 100;
  if (fillH > 70 && nw / w > 0.85) {
    console.log('already tight', path.basename(file), w + 'x' + h, 'fillH~', fillH.toFixed(1) + '%');
    return;
  }
  const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = minX + x;
      const sy = minY + y;
      const s = (sy * w + sx) * 4;
      const d = (y * nw + x) * 4;
      const r = rgba[s];
      const g = rgba[s + 1];
      const b = rgba[s + 2];
      let a = rgba[s + 3];
      // Knock out near-black so logos sit cleanly on blue/yellow chrome
      if (r + g + b < 40) a = 0;
      out[d] = r;
      out[d + 1] = g;
      out[d + 2] = b;
      out[d + 3] = a;
    }
  }
  fs.mkdirSync(BACKUP, { recursive: true });
  const base = path.basename(file);
  fs.copyFileSync(file, path.join(BACKUP, base));
  fs.writeFileSync(file, encodePngRGBA(nw, nh, out));
  console.log(
    'trimmed',
    base,
    w + 'x' + h,
    '->',
    nw + 'x' + nh,
    'ratio',
    (nw / nh).toFixed(3),
    'wasFillH',
    fillH.toFixed(1) + '%'
  );
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png') && !f.startsWith('.'));
for (const f of files) {
  try {
    trimFile(path.join(DIR, f));
  } catch (e) {
    console.log('ERR', f, e.message);
  }
}
console.log('done');
