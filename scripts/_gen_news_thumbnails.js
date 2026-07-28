/**
 * _gen_news_thumbnails.js
 *
 * Pre-generates 20px‑wide blurred thumbnail data URIs for every unique image
 * referenced in assets/news-data.js (bannerImage + images[]).
 *
 * Usage:  node scripts/_gen_news_thumbnails.js
 * Output: assets/news-thumbnails.js  (window.NEWS_THUMBNAILS lookup table)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const NEWS_DATA = path.resolve('assets/news-data.js');
const OUTPUT = path.resolve('assets/news-thumbnails.js');

/* ------------------------------------------------------------------ */
/*  1. Parse all unique image paths from news-data.js                 */
/* ------------------------------------------------------------------ */

function parseImagePaths() {
  const src = fs.readFileSync(NEWS_DATA, 'utf8');

  /* naive but robust: match anything inside bannerImage: "..." or images: ["..."] */
  const urlPattern = /["']([^"']+\.(?:jpg|jpeg|png|webp|gif))(?:\?[^"']*)?["']/gi;
  const rawPaths = new Set();
  let m;
  while ((m = urlPattern.exec(src)) !== null) {
    /* strip cache-busting query params and normalize */
    let p = m[1].replace(/\?.*$/, '').replace(/\\/g, '/').trim();
    if (p) rawPaths.add(p);
  }

  /* Resolve relative to project root (assets/…) */
  const resolved = [];
  for (const rp of rawPaths) {
    const abs = path.resolve(rp);
    if (fs.existsSync(abs)) {
      resolved.push({ rel: rp, abs });
    } else {
      console.warn('  ⚠  SKIP (not found):', rp);
    }
  }
  return resolved.sort((a, b) => a.rel.localeCompare(b.rel));
}

/* ------------------------------------------------------------------ */
/*  2. Generate 20px-wide thumbnail data URIs                         */
/* ------------------------------------------------------------------ */

async function generateThumbnails(images) {
  const map = {};
  let totalBytes = 0;

  for (const { rel, abs } of images) {
    try {
      const metadata = await sharp(abs).metadata();
      const thumbW = 20;
      const thumbH = metadata.height
        ? Math.round((thumbW / metadata.width) * metadata.height)
        : 15;

      const buffer = await sharp(abs)
        .resize(thumbW, thumbH, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 60 })        /* small file + slight blur helps the effect */
        .toBuffer();

      const b64 = buffer.toString('base64');
      const dataUri = `data:image/jpeg;base64,${b64}`;
      map[rel] = dataUri;
      totalBytes += buffer.length;

      const relPadded = rel.padEnd(60);
      console.log(`  ✓ ${relPadded}  ${(buffer.length / 1024).toFixed(1)} kB`);
    } catch (err) {
      console.warn(`  ✗  ERROR  ${rel}  —  ${err.message}`);
    }
  }

  console.log(`\n  ─── Total ${Object.keys(map).length} thumbnails, ${(totalBytes / 1024).toFixed(0)} kB raw (before base64 overhead)`);
  return map;
}

/* ------------------------------------------------------------------ */
/*  3. Write output JS file                                           */
/* ------------------------------------------------------------------ */

function writeOutput(map) {
  const pairs = Object.entries(map).map(([key, uri]) => {
    const escapedKey = key.replace(/\\/g, '/').replace(/'/g, "\\'");
    return `  '${escapedKey}': '${uri}'`;
  });

  const code = `/**
 * news-thumbnails.js
 *
 * Auto‑generated 20 px blurred thumbnail data URIs for news images.
 * Run  \`node scripts/_gen_news_thumbnails.js\`  to rebuild.
 */
window.NEWS_THUMBNAILS = {\n${pairs.join(',\n')}\n};\n`;

  fs.writeFileSync(OUTPUT, code, 'utf8');
  const sizeKb = (Buffer.byteLength(code, 'utf8') / 1024).toFixed(0);
  console.log(`\n  ✦  Written  ${OUTPUT}  (${sizeKb} kB, ${Object.keys(map).length} entries)`);
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

(async function main() {
  console.log('── Scanning news images ────────────────────────');
  const images = parseImagePaths();

  if (images.length === 0) {
    console.log('  No images found — nothing to do.');
    process.exit(0);
  }
  console.log(`  Found ${images.length} unique image paths\n`);

  console.log('── Generating thumbnails ────────────────────────');
  const map = await generateThumbnails(images);

  console.log('\n── Writing output ──────────────────────────────');
  writeOutput(map);

  console.log('\n✔  Done.');
})();
