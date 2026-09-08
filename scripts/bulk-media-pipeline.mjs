import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = process.cwd();
const auditPath = path.join(root, 'docs/reports/media-inventory-20260907.json');
const audit = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const protectedPage = /^(agrinova-tech|atl|assembly-tech|nextdrive-motors)\.html$/i;
const sourceExt = /\.(jpe?g|png|webp|avif|tiff?)$/i;
const codeExt = /\.(html?|css|js|mjs|json|xml|webmanifest)$/i;
const limit = 500 * 1024;
const concurrency = 8;

const manualPatterns = [
  /assets\/images\/about\/about-hero-11\./i,
  /assets\/images\/(?:acfs\/TA|aficd\/operations|aficd\/TA|ficd\/TA|ccp\/photo_)\//i,
  /assets\/images\/lake-aviation\/(?:gallery|ops)\//i,
  /assets\/images\/laketrans\/profile\//i,
  /assets\/images\/news\/(?:2|4|5|9|16|17|42)\//i,
  /assets\/images\/lake-agro\/(?:.*(?:combine|tractor|harvester|machinery|excavator)|lake-agro-new-holland)/i,
  /lake-story-assets\/scene7\./i,
];

const rel = (value) => value.replaceAll('\\', '/');
const isExcludedPage = (file) => protectedPage.test(path.basename(file));
const isManualReview = (item) => manualPatterns.some((pattern) => pattern.test(item.path));
const candidates = audit.assets.filter((item) => item.status === 'PROCESS_CANDIDATE');
const excludedAssetPaths = new Set(
  audit.assets
    .filter((item) => item.pagesOrComponents?.some(isExcludedPage))
    .map((item) => rel(item.path)),
);

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function sha256(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

function deliveryPath(item, source) {
  const ext = path.extname(source).toLowerCase();
  const normal = ext === '.webp'
    ? source
    : source.replace(sourceExt, '.webp');
  const shared = excludedAssetPaths.has(rel(item.path));
  if (shared) {
    return normal.replace(/\.webp$/i, '.delivery.webp');
  }
  return normal;
}

async function encodeUnderLimit(source, destination) {
  const metadata = await sharp(source, { failOn: 'none' }).metadata();
  const widths = [null, 2400, 2000, 1600, 1280, 1024, 840, 720];
  const qualities = [86, 82, 78, 74, 70, 66, 62, 58];
  let best = null;
  for (const width of widths) {
    for (const quality of qualities) {
      let pipeline = sharp(source, { failOn: 'none' }).rotate();
      if (width && metadata.width && metadata.width > width) {
        pipeline = pipeline.resize({ width, withoutEnlargement: true });
      }
      const buffer = await pipeline.webp({ quality, effort: 5, alphaQuality: 90 }).toBuffer();
      if (!best || buffer.length < best.buffer.length) best = { buffer, width: width || metadata.width, quality };
      if (buffer.length <= limit) {
        await fs.writeFile(destination, buffer);
        return { bytes: buffer.length, width: width || metadata.width, quality };
      }
    }
  }
  if (!best || best.buffer.length > limit) throw new Error('could not meet 500 KB limit');
  await fs.writeFile(destination, best.buffer);
  return { bytes: best.buffer.length, width: best.width, quality: best.quality };
}

async function collectSourceFiles() {
  const files = [];
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'test-results', '_qa_screens'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && codeExt.test(entry.name)) files.push(full);
    }
  };
  await walk(root);
  return files;
}

const sourceFiles = await collectSourceFiles();
const sourceTexts = new Map();
for (const file of sourceFiles) {
  try { sourceTexts.set(file, await fs.readFile(file, 'utf8')); } catch {}
}

const referenceUpdates = new Map();
const results = [];
const failures = [];
const beforeHashes = new Map();

for (const item of candidates) {
  const source = path.join(root, item.path);
  if (!await exists(source)) {
    failures.push({ path: item.path, reason: 'source missing' });
    continue;
  }
  if (excludedAssetPaths.has(rel(item.path))) beforeHashes.set(rel(item.path), await sha256(source));
}

async function processItem(item) {
  const source = path.join(root, item.path);
  const ext = path.extname(source).toLowerCase();
  if (!sourceExt.test(source)) return { path: item.path, status: 'not-applicable' };
  const existingBytes = (await fs.stat(source)).size;
  let destination = deliveryPath(item, source);
  if (ext === '.webp' && !excludedAssetPaths.has(rel(item.path)) && existingBytes <= limit) {
    return { path: item.path, delivery: rel(path.relative(root, source)), status: 'already-compliant', beforeBytes: existingBytes, afterBytes: existingBytes, manualReview: isManualReview(item) };
  }
  if (await exists(destination) && rel(destination) === rel(source) && existingBytes <= limit) {
    return { path: item.path, delivery: rel(path.relative(root, destination)), status: 'already-compliant', beforeBytes: existingBytes, afterBytes: existingBytes, manualReview: isManualReview(item) };
  }
  if (rel(destination) === rel(source)) destination = source.replace(/\.webp$/i, '.delivery.webp');
  const temp = `${destination}.tmp-${process.pid}`;
  const output = await encodeUnderLimit(source, temp);
  await fs.rename(temp, destination);
  const delivery = rel(path.relative(root, destination));
  return { path: item.path, delivery, status: 'created', beforeBytes: existingBytes, afterBytes: output.bytes, width: output.width, quality: output.quality, manualReview: isManualReview(item) };
}

for (let start = 0; start < candidates.length; start += concurrency * 4) {
  const batch = candidates.slice(start, start + concurrency * 4);
  const settled = await Promise.allSettled(batch.map(processItem));
  settled.forEach((entry, index) => {
    if (entry.status === 'fulfilled') results.push(entry.value);
    else failures.push({ path: batch[index].path, reason: entry.reason?.message || String(entry.reason) });
  });
  console.log(`processed ${Math.min(start + batch.length, candidates.length)}/${candidates.length}`);
}

// Patch only non-protected delivery files. Textual replacement is limited to
// the exact audited path, so unrelated filenames cannot be touched.
for (const result of results.filter((item) => item.delivery && item.delivery !== item.path)) {
  const original = rel(result.path);
  const replacement = rel(result.delivery);
  for (const [file, text] of sourceTexts) {
    if (isExcludedPage(file) || !text.includes(original)) continue;
    referenceUpdates.set(file, (referenceUpdates.get(file) || text).split(original).join(replacement));
  }
}
for (const [file, text] of referenceUpdates) await fs.writeFile(file, text);

const afterHashes = [];
for (const [asset, before] of beforeHashes) {
  const after = await sha256(path.join(root, asset));
  afterHashes.push({ asset, before, after, unchanged: before === after });
}

const created = results.filter((item) => item.status === 'created');
const already = results.filter((item) => item.status === 'already-compliant');
const manualReview = candidates.filter(isManualReview).map((item) => item.path);
const allDeliveries = results.filter((item) => item.delivery);
const oversize = [];
for (const item of allDeliveries) {
  const file = path.join(root, item.delivery);
  if (await exists(file)) {
    const size = (await fs.stat(file)).size;
    if (size > limit) oversize.push({ path: item.delivery, bytes: size });
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  audit: 'docs/reports/media-inventory-20260907.json',
  candidates: candidates.length,
  processed: results.length,
  webpCreated: created.length,
  alreadyCompliant: already.length,
  manualReviewRequired: manualReview.length,
  failures,
  oversize,
  referenceFilesUpdated: referenceUpdates.size,
  protectedHashes: afterHashes,
  results,
};
await fs.writeFile(path.join(root, 'docs/reports/bulk-media-pipeline-20260908.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ candidates: candidates.length, processed: results.length, created: created.length, already: already.length, manualReview: manualReview.length, failures: failures.length, oversize: oversize.length, references: referenceUpdates.size, protectedChanged: afterHashes.filter((x) => !x.unchanged).length }, null, 2));
