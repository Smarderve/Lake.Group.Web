import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const manifestPath = path.join(root, 'docs/reports/media-inventory-20260907.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const excludedPage = /^(agrinova-tech|atl|assembly-tech|nextdrive-motors)\.html$/i;

// Conservative manual-review fence derived from the visual audit. These assets
// visibly contain third-party identities or need ownership/licensing judgment.
const manualPatterns = [
  /assets\/images\/about\/about-hero-11\./i,
  /assets\/images\/(?:acfs\/TA|aficd\/operations|aficd\/TA|ficd\/TA|ccp\/photo_)\//i,
  /assets\/images\/lake-aviation\/(?:gallery|ops)\//i,
  /assets\/images\/laketrans\/profile\//i,
  /assets\/images\/news\/(?:2|4|5|9|16|17|42)\//i,
  /assets\/images\/lake-agro\/(?:.*(?:combine|tractor|harvester|machinery|excavator)|lake-agro-new-holland)/i,
  /lake-story-assets\/scene7\./i
];

const isManualReview = item => manualPatterns.some(pattern => pattern.test(item.path));
const candidates = manifest.assets.filter(item => item.status === 'PROCESS_CANDIDATE');
const manualReview = candidates.filter(isManualReview);
const safe = candidates.filter(item => !isManualReview(item));
const changed = [];
const noEdit = [];
const failures = [];

async function optimizeToLimit(source, destination) {
  const input = sharp(source, { failOn: 'none' }).rotate();
  const meta = await input.metadata();
  const attempts = [];
  for (const width of [null, 2000, 1600, 1280, 960, 720]) {
    for (const quality of [84, 80, 76, 72, 68, 64]) {
      let pipeline = sharp(source, { failOn: 'none' }).rotate();
      if (width && meta.width && meta.width > width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
      const buffer = await pipeline.webp({ quality, effort: 6, alphaQuality: 90 }).toBuffer();
      attempts.push({ buffer, width: width || meta.width || null, quality });
      if (buffer.length <= 500 * 1024) {
        await fs.writeFile(destination, buffer);
        return { bytes: buffer.length, width: attempts.at(-1).width, quality };
      }
    }
  }
  throw new Error('unable to meet 500 KB limit without unsupported source');
}

function pageRefs(item) {
  return item.pagesOrComponents.filter(file => !excludedPage.test(path.basename(file)) && !/^(docs|scripts|tests)\//i.test(file));
}

async function patchReferences(item, webpPath) {
  const original = item.path.replaceAll('\\', '/');
  const replacement = webpPath.replaceAll('\\', '/');
  for (const file of pageRefs(item)) {
    const full = path.join(root, file);
    try {
      let text = await fs.readFile(full, 'utf8');
      if (!text.includes(original)) continue;
      text = text.split(original).join(replacement);
      await fs.writeFile(full, text);
    } catch {}
  }
}

for (let start = 0; start < safe.length; start += 15) {
  const batch = safe.slice(start, start + 15);
  console.log(`Batch ${Math.floor(start / 15) + 1}/${Math.ceil(safe.length / 15)} (${batch.length} images)`);
  for (const item of batch) {
    const source = path.join(root, item.path);
    const ext = path.extname(item.path).toLowerCase();
    const webpPath = ext === '.webp' ? source : source.replace(/\.(jpe?g|png|avif|tiff?)$/i, '.webp');
    try {
      const before = (await fs.stat(source)).size;
      let output = webpPath;
      let outputBytes = before;
      let generated = false;
      if (ext === '.webp') {
        if (before > 500 * 1024) {
          const tmp = `${source}.delivery.tmp`;
          const result = await optimizeToLimit(source, tmp);
          await fs.rename(tmp, source);
          outputBytes = result.bytes;
          generated = true;
        }
      } else {
        let existing = null;
        try { existing = await fs.stat(webpPath); } catch {}
        if (!existing || existing.size > 500 * 1024) {
          const tmp = `${webpPath}.delivery.tmp`;
          const result = await optimizeToLimit(source, tmp);
          await fs.rename(tmp, webpPath);
          outputBytes = result.bytes;
          generated = true;
        } else {
          outputBytes = existing.size;
        }
        await patchReferences(item, path.relative(root, webpPath));
      }
      if (generated) changed.push({ original: item.path, webp: path.relative(root, webpPath), originalBytes: before, finalBytes: outputBytes });
      else noEdit.push({ original: item.path, webp: path.relative(root, webpPath), finalBytes: outputBytes });
    } catch (error) {
      failures.push({ path: item.path, reason: error.message });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  restoreTag: 'restore-before-sitewide-media-cleanup-20260907-2026',
  manifest: 'docs/reports/media-inventory-20260907.json',
  applicable: candidates.length,
  safeProcessed: safe.length - failures.length,
  manualReviewRequired: manualReview.length,
  changed,
  noEdit,
  failures,
  manualReviewPaths: manualReview.map(item => item.path)
};
await fs.writeFile(path.join(root, 'docs/reports/media-processing-20260907.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ applicable: candidates.length, safe: safe.length, manualReview: manualReview.length, changed: changed.length, noEdit: noEdit.length, failures: failures.length }, null, 2));
