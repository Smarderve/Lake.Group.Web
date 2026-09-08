import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = process.cwd();
const imageRoot = path.join(root, 'assets', 'images');
const audit = JSON.parse(await fs.readFile(path.join(root, 'docs', 'reports', 'media-inventory-20260907.json'), 'utf8'));
const start = Number(process.env.MEDIA_BATCH_START || 0);
const batchSize = Number(process.env.MEDIA_BATCH_SIZE || 80);
const byteLimit = 500 * 1024;
const raster = /\.(jpe?g|png|webp|avif|tiff?)$/i;
const protectedPage = /^(agrinova-tech|atl|assembly-tech|nextdrive-motors)\.html$/i;
const manualPatterns = [
  /assets\/images\/about\/about-hero-11\./i,
  /assets\/images\/(?:acfs\/TA|aficd\/operations|aficd\/TA|ficd\/TA|ccp\/photo_)\//i,
  /assets\/images\/lake-aviation\/(?:gallery|ops)\//i,
  /assets\/images\/laketrans\/profile\//i,
  /assets\/images\/news\/(?:2|4|5|9|16|17|42)\//i,
  /assets\/images\/lake-agro\/(?:.*(?:combine|tractor|harvester|machinery|excavator)|lake-agro-new-holland)/i,
];
const rel = (file) => path.relative(root, file).replaceAll('\\', '/');
const candidates = audit.assets
  .filter((item) => item.status === 'PROCESS_CANDIDATE')
  .filter((item) => raster.test(item.path))
  .filter((item) => !item.pagesOrComponents?.some((page) => protectedPage.test(path.basename(page))))
  .sort((a, b) => a.path.localeCompare(b.path));
const batch = candidates.slice(start, start + batchSize);

async function writeWebpUnderLimit(source, destination) {
  const meta = await sharp(source, { failOn: 'none' }).metadata();
  const widths = [null, 2400, 2000, 1600, 1280, 1024, 840, 720];
  const qualities = [84, 80, 76, 72, 68, 64, 60];
  for (const width of widths) {
    for (const quality of qualities) {
      let pipeline = sharp(source, { failOn: 'none' }).rotate().normalise({ lower: 1, upper: 99 }).modulate({ brightness: 1.015, saturation: 1.02 }).sharpen({ sigma: 0.55, m1: 0.25, m2: 1.1 });
      if (width && meta.width > width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
      const out = await pipeline.webp({ quality, effort: 6, alphaQuality: 90 }).toBuffer();
      if (out.length <= byteLimit) {
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, out);
        return { bytes: out.length, width: width || meta.width, quality };
      }
    }
  }
  throw new Error('unable to encode below 500 KB');
}

async function writeMaster(source, destination) {
  const meta = await sharp(source, { failOn: 'none' }).metadata();
  let pipeline = sharp(source, { failOn: 'none' }).rotate().normalise({ lower: 1, upper: 99 }).modulate({ brightness: 1.015, saturation: 1.02 }).sharpen({ sigma: 0.55, m1: 0.25, m2: 1.1 });
  if (meta.width > 3840) pipeline = pipeline.resize({ width: 3840, withoutEnlargement: true });
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const out = await pipeline.webp({ quality: 94, effort: 6, alphaQuality: 100 }).toFile(destination);
  return { bytes: out.size, width: out.width, height: out.height, fourKClass: out.width >= 3000 || out.height >= 3000 };
}

const codeFiles = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'test-results'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rootRelative = rel(full);
    if (entry.isDirectory()) {
      if (!['backend', 'cms', 'docs', 'public-content', 'scripts', 'tests'].includes(entry.name)) await walk(full);
    } else if (
      (!rootRelative.includes('/') && /\.html?$/i.test(entry.name)) ||
      /^assets\/.*\.(?:css|js|mjs)$/i.test(rootRelative)
    ) {
      codeFiles.push(full);
    }
  }
}
await walk(root);

const results = [];
for (const item of batch) {
  const source = path.join(root, item.path);
  const manualReview = manualPatterns.some((pattern) => pattern.test(item.path));
  try {
    await fs.access(source);
    const sourceStem = item.path.replace(/^assets\/images\//, '').replace(raster, '');
    const master = path.join(imageRoot, 'masters', `${sourceStem}.master.webp`);
    const delivery = path.join(imageRoot, 'delivery', `${sourceStem}.webp`);
    const masterInfo = await writeMaster(source, master);
    const deliveryInfo = await writeWebpUnderLimit(source, delivery);
    const deliveryRel = rel(delivery);
    let referencesUpdated = 0;
    if (!manualReview) {
      for (const file of codeFiles) {
        if (protectedPage.test(path.basename(file))) continue;
        const text = await fs.readFile(file, 'utf8');
        if (!text.includes(item.path)) continue;
        await fs.writeFile(file, text.split(item.path).join(deliveryRel), 'utf8');
        referencesUpdated += 1;
      }
    }
    results.push({ source: item.path, manualReview, master: rel(master), delivery: deliveryRel, masterInfo, deliveryInfo, referencesUpdated });
  } catch (error) {
    results.push({ source: item.path, manualReview, error: error.message });
  }
}

const checksum = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
for (const result of results.filter((item) => item.master && item.delivery)) {
  result.masterHash = await checksum(path.join(root, result.master));
  result.deliveryHash = await checksum(path.join(root, result.delivery));
}
const reportPath = path.join(root, 'docs', 'reports', `media-batch-${String(start).padStart(3, '0')}.json`);
await fs.writeFile(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), start, batchSize, candidates: candidates.length, results }, null, 2)}\n`);
console.log(JSON.stringify({ candidates: candidates.length, batch: batch.length, created: results.filter((item) => item.delivery).length, manualReview: results.filter((item) => item.manualReview).length, failed: results.filter((item) => item.error).length, referencesUpdated: results.reduce((total, item) => total + (item.referencesUpdated || 0), 0), report: rel(reportPath) }, null, 2));
