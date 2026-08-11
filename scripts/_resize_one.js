#!/usr/bin/env node
/* Downscale a single image to MAX_EDGE (default 2048) if it's over-large.
   One file per process (fresh libvips) to dodge the Windows lock/state issue. */
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const file = process.argv[2];
const MAX_EDGE = parseInt(process.argv[3] || '2048', 10);
if (!file) { console.error('usage: node _resize_one.js <file> [maxEdge]'); process.exit(1); }

(async () => {
  try {
    const meta = await sharp(file, { failOn: 'none' }).metadata();
    const edge = Math.max(meta.width || 0, meta.height || 0);
    if (edge <= MAX_EDGE) { console.log('keep'); process.exit(0); }
    const before = fs.statSync(file).size;
    const tmp = file + '.rs.tmp';
    const ext = path.extname(file).toLowerCase();
    let p = sharp(file, { failOn: 'none' }).rotate();
    if (meta.width >= meta.height) p = p.resize({ width: MAX_EDGE });
    else p = p.resize({ height: MAX_EDGE });
    if (ext === '.png') p = p.png({ compressionLevel: 9, effort: 10 });
    else p = p.jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:2:0' });
    await p.toFile(tmp);
    const after = fs.statSync(tmp).size;
    if (after < before * 0.95) {
      fs.writeFileSync(file, fs.readFileSync(tmp));
      console.log(`ok ${Math.round(before / 1024)}KB->${Math.round(after / 1024)}KB`);
    } else {
      console.log('nogain');
    }
    try { fs.unlinkSync(tmp); } catch (_) {}
    process.exit(0);
  } catch (e) {
    console.error(`fail ${e.message}`);
    process.exit(1);
  }
})();
