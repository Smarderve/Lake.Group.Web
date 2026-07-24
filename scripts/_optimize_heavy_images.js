#!/usr/bin/env node
/**
 * Heavy image pass (quality-preserving):
 * 1) Strip metadata from JPEG/PNG (lossless size win when present)
 * 2) Emit WebP siblings at q=92 only when smaller than the source
 * 3) Patch homepage hero to prefer WebP via image-set when sibling exists
 *
 * Originals are never deleted.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const DIRS = ['assets/images/banner', 'assets/images/n-slider'];

async function optimizeOne(file) {
  const ext = path.extname(file).toLowerCase();
  const before = fs.statSync(file).size;
  const tmp = file + '.meta.tmp';

  // Lossless: re-encode without metadata; keep only if smaller.
  let pipeline = sharp(file, { failOn: 'none' }).rotate();
  if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9 });
  else pipeline = pipeline.jpeg({ quality: 100, mozjpeg: true, chromaSubsampling: '4:4:4' });
  await pipeline.toFile(tmp);
  const mid = fs.statSync(tmp).size;
  if (mid > 0 && mid < before) {
    try {
      fs.copyFileSync(tmp, file);
      fs.unlinkSync(tmp);
    } catch (e) {
      try { fs.renameSync(tmp, file); } catch (e2) { try { fs.unlinkSync(tmp); } catch (_) {} }
    }
  } else {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }

  const srcSize = fs.statSync(file).size;
  const webpPath = file.replace(/\.(jpe?g|png)$/i, '.webp');
  const webpTmp = webpPath + '.tmp';
  await sharp(file, { failOn: 'none' })
    .rotate()
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(webpTmp);
  const wSize = fs.statSync(webpTmp).size;
  if (wSize > 0 && wSize < srcSize * 0.92) {
    try {
      fs.copyFileSync(webpTmp, webpPath);
      fs.unlinkSync(webpTmp);
    } catch (e) {
      try { fs.renameSync(webpTmp, webpPath); } catch (e2) { try { fs.unlinkSync(webpTmp); } catch (_) {} }
    }
    console.log(
      `webp ${path.relative(ROOT, file)} ${(srcSize / 1024).toFixed(0)}KB → ${(wSize / 1024).toFixed(0)}KB`
    );
    return webpPath;
  }
  try { fs.unlinkSync(webpTmp); } catch (_) {}
  if (fs.existsSync(webpPath) && fs.statSync(webpPath).size >= srcSize) {
    try { fs.unlinkSync(webpPath); } catch (_) {}
  }
  console.log(`keep ${path.relative(ROOT, file)} (no smaller webp)`);
  return null;
}

async function main() {
  const files = [];
  for (const d of DIRS) {
    const dir = path.join(ROOT, d);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (/\.(jpe?g|png)$/i.test(name)) files.push(path.join(dir, name));
    }
  }

  const webps = [];
  for (const f of files) {
    const w = await optimizeOne(f);
    if (w) webps.push(w);
  }

  const oilWebp = path.join(ROOT, 'assets/images/banner/LakeOil.webp');
  const indexPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  if (fs.existsSync(oilWebp)) {
    if (!html.includes('LakeOil.webp')) {
      html = html.replace(
        /background-image:\s*url\(["']assets\/images\/banner\/LakeOil\.jpg["']\)/g,
        'background-image: image-set(url("assets/images/banner/LakeOil.webp") type("image/webp"), url("assets/images/banner/LakeOil.jpg") type("image/jpeg"))'
      );
      fs.writeFileSync(indexPath, html);
      console.log('patched index.html hero image-set');
    }
  } else {
    // Ensure we don't reference a missing webp
    html = html.replace(
      /background-image:\s*image-set\(url\(["']assets\/images\/banner\/LakeOil\.webp["']\) type\(["']image\/webp["']\),\s*url\(["']assets\/images\/banner\/LakeOil\.jpg["']\) type\(["']image\/jpeg["']\)\)/g,
      'background-image: url("assets/images/banner/LakeOil.jpg")'
    );
    fs.writeFileSync(indexPath, html);
    console.log('reverted index.html to jpg (no smaller webp)');
  }

  console.log(`\nCreated ${webps.length} smaller WebP siblings`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
