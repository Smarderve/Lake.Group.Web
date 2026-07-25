#!/usr/bin/env node
/**
 * Site-wide image optimization (in place, path-safe).
 *
 * - Walks assets/images (+ assets/icons/pwa optional) for jpg/png/webp
 * - Re-encodes only when the result is meaningfully smaller
 * - Never renames/deletes sources; does not invent WebP siblings
 * - Skips favicons, tiny SVGs, scrapes, lake-3d, QA dumps, node_modules
 *
 * Usage: node scripts/_optimize_all_images.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = [
  path.join(ROOT, 'assets', 'images'),
  path.join(ROOT, 'assets', 'icons'),
];

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  'lake-3d',
  '_scraped',
  '_qa_screens',
  '.git',
]);

const SKIP_BASENAMES = new Set([
  'favicon.ico',
  'favicon.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'maskable-icon-512x512.png',
]);

const MIN_BYTES = 3 * 1024; // skip already-tiny assets
const MIN_SAVE_RATIO = 0.02; // require >=2% smaller to replace
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;
const PNG_QUALITY = 80; // used only for palette attempts

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name);
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (shouldSkipDir(ent.name)) continue;
      walk(full, out);
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!/\.(jpe?g|png|webp)$/i.test(ext)) continue;
    if (SKIP_BASENAMES.has(ent.name.toLowerCase())) continue;
    out.push(full);
  }
}

function replaceFile(src, tmp) {
  // Windows-safe: read optimized bytes, overwrite target, then drop temp.
  // Avoid rename-over-locked files (EPERM on some AV / preview handles).
  const buf = fs.readFileSync(tmp);
  fs.writeFileSync(src, buf);
  try {
    fs.unlinkSync(tmp);
  } catch (_) {}
}

async function replaceIfSmaller(src, tmp, before) {
  const after = fs.statSync(tmp).size;
  const saved = before - after;
  if (after > 0 && saved >= before * MIN_SAVE_RATIO) {
    replaceFile(src, tmp);
    return { before, after, saved, replaced: true };
  }
  try {
    fs.unlinkSync(tmp);
  } catch (_) {}
  return { before, after, saved: 0, replaced: false };
}

async function optimizeJpeg(file, before) {
  const tmp = file + '.opt.tmp';
  await sharp(file, { failOn: 'none' })
    .rotate()
    .jpeg({
      quality: JPEG_QUALITY,
      mozjpeg: true,
      chromaSubsampling: '4:2:0',
      trellisQuantisation: true,
      overshootDeringing: true,
      optimizeScans: true,
    })
    .toFile(tmp);
  return replaceIfSmaller(file, tmp, before);
}

async function optimizePng(file, before) {
  const tmpA = file + '.opt.a.tmp';
  const tmpB = file + '.opt.b.tmp';

  await sharp(file, { failOn: 'none' })
    .rotate()
    .png({ compressionLevel: 9, effort: 10, adaptiveFiltering: true })
    .toFile(tmpA);
  const sizeA = fs.statSync(tmpA).size;

  let bestTmp = tmpA;
  let bestSize = sizeA;

  // Palette often helps logos / flat graphics; keep only if smaller.
  try {
    await sharp(file, { failOn: 'none' })
      .rotate()
      .png({
        compressionLevel: 9,
        effort: 10,
        palette: true,
        quality: PNG_QUALITY,
        colors: 256,
      })
      .toFile(tmpB);
    const sizeB = fs.statSync(tmpB).size;
    if (sizeB > 0 && sizeB < bestSize) {
      try {
        fs.unlinkSync(bestTmp);
      } catch (_) {}
      bestTmp = tmpB;
      bestSize = sizeB;
    } else {
      try {
        fs.unlinkSync(tmpB);
      } catch (_) {}
    }
  } catch (_) {
    try {
      fs.unlinkSync(tmpB);
    } catch (__) {}
  }

  return replaceIfSmaller(file, bestTmp, before);
}

async function optimizeWebp(file, before) {
  const tmp = file + '.opt.tmp';
  await sharp(file, { failOn: 'none' })
    .rotate()
    .webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 6 })
    .toFile(tmp);
  return replaceIfSmaller(file, tmp, before);
}

async function optimizeOne(file) {
  const before = fs.statSync(file).size;
  if (before < MIN_BYTES) {
    return { file, before, after: before, saved: 0, replaced: false, skipped: 'tiny' };
  }
  const ext = path.extname(file).toLowerCase();
  let result;
  try {
    if (ext === '.jpg' || ext === '.jpeg') result = await optimizeJpeg(file, before);
    else if (ext === '.png') result = await optimizePng(file, before);
    else if (ext === '.webp') result = await optimizeWebp(file, before);
    else return { file, before, after: before, saved: 0, replaced: false, skipped: 'type' };
  } catch (err) {
    console.warn(`fail ${path.relative(ROOT, file)}: ${err.message}`);
    return { file, before, after: before, saved: 0, replaced: false, skipped: 'error' };
  }
  return { file, ...result, skipped: null };
}

async function main() {
  const files = [];
  for (const d of SCAN_DIRS) walk(d, files);
  files.sort();

  let beforeTotal = 0;
  let afterTotal = 0;
  let touched = 0;
  let skippedTiny = 0;
  let skippedNoGain = 0;
  let failed = 0;
  const notable = [];

  console.log(`Scanning ${files.length} image files...\n`);

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const r = await optimizeOne(file);
    beforeTotal += r.before;
    afterTotal += r.replaced ? r.after : r.before;
    if (r.skipped === 'tiny') {
      skippedTiny++;
      continue;
    }
    if (r.skipped === 'error') {
      failed++;
      continue;
    }
    if (r.replaced) {
      touched++;
      const kb = (r.saved / 1024).toFixed(1);
      const pct = ((r.saved / r.before) * 100).toFixed(1);
      console.log(
        `✓ ${rel} ${(r.before / 1024).toFixed(1)}KB → ${(r.after / 1024).toFixed(1)}KB (−${kb}KB / ${pct}%)`
      );
      if (r.saved >= 50 * 1024) {
        notable.push({
          rel,
          before: r.before,
          after: r.after,
          saved: r.saved,
        });
      }
    } else {
      skippedNoGain++;
    }
  }

  notable.sort((a, b) => b.saved - a.saved);

  const saved = beforeTotal - afterTotal;
  console.log('\n========== SUMMARY ==========');
  console.log(`Files scanned:     ${files.length}`);
  console.log(`Files optimized:   ${touched}`);
  console.log(`No meaningful gain:${skippedNoGain}`);
  console.log(`Skipped tiny (<3KB):${skippedTiny}`);
  console.log(`Failed:            ${failed}`);
  console.log(
    `Before:            ${(beforeTotal / (1024 * 1024)).toFixed(2)} MB (${beforeTotal} bytes)`
  );
  console.log(
    `After:             ${(afterTotal / (1024 * 1024)).toFixed(2)} MB (${afterTotal} bytes)`
  );
  console.log(
    `Saved:             ${(saved / (1024 * 1024)).toFixed(2)} MB (${saved} bytes, ${
      beforeTotal ? ((saved / beforeTotal) * 100).toFixed(1) : 0
    }%)`
  );

  if (notable.length) {
    console.log('\nNotable (≥50KB saved):');
    for (const n of notable.slice(0, 25)) {
      console.log(
        `  ${n.rel}: ${(n.before / 1024).toFixed(0)}KB → ${(n.after / 1024).toFixed(0)}KB (−${(
          n.saved / 1024
        ).toFixed(0)}KB)`
      );
    }
  }

  // Write machine-readable report next to script
  const report = {
    scanned: files.length,
    optimized: touched,
    noGain: skippedNoGain,
    skippedTiny,
    failed,
    beforeBytes: beforeTotal,
    afterBytes: afterTotal,
    savedBytes: saved,
    jpegQuality: JPEG_QUALITY,
    webpQuality: WEBP_QUALITY,
    notable: notable.slice(0, 40),
  };
  fs.writeFileSync(
    path.join(__dirname, '_optimize_all_images.report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('\nReport: scripts/_optimize_all_images.report.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
