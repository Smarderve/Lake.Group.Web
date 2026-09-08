import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = process.cwd();
const images = path.join(root, 'assets', 'images');
const reports = path.join(root, 'docs', 'reports');
const raster = /\.(?:jpe?g|png|webp|avif|tiff?)$/i;
const rel = (file) => path.relative(root, file).replaceAll('\\', '/');
const hash = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');

async function filesUnder(dir) {
  const results = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...await filesUnder(full));
    else if (raster.test(entry.name)) results.push(full);
  }
  return results;
}

const audit = JSON.parse(await fs.readFile(path.join(reports, 'media-inventory-20260907.json'), 'utf8'));
const candidates = new Set(audit.assets.filter((item) => item.status === 'PROCESS_CANDIDATE').map((item) => item.path));
const all = await filesUnder(images);
const sourceFiles = all.filter((file) => !rel(file).startsWith('assets/images/masters/') && !rel(file).startsWith('assets/images/delivery/'));
const deliveryFiles = all.filter((file) => rel(file).startsWith('assets/images/delivery/'));
const masterFiles = all.filter((file) => rel(file).startsWith('assets/images/masters/'));

const deliveries = [];
for (const file of deliveryFiles) {
  const stat = await fs.stat(file);
  const meta = await sharp(file, { failOn: 'none' }).metadata();
  deliveries.push({ path: rel(file), bytes: stat.size, format: meta.format, width: meta.width, height: meta.height, sha256: await hash(file), valid: meta.format === 'webp' && stat.size <= 500 * 1024 });
}
const masters = [];
for (const file of masterFiles) {
  const stat = await fs.stat(file);
  const meta = await sharp(file, { failOn: 'none' }).metadata();
  masters.push({ path: rel(file), bytes: stat.size, format: meta.format, width: meta.width, height: meta.height, sha256: await hash(file), fourKClass: meta.width >= 3000 || meta.height >= 3000 });
}

const batches = [];
for (const file of (await fs.readdir(reports)).filter((name) => /^media-batch-\d+\.json$/.test(name)).sort()) {
  const report = JSON.parse(await fs.readFile(path.join(reports, file), 'utf8'));
  batches.push({ file: `docs/reports/${file}`, start: report.start, results: report.results.length, created: report.results.filter((item) => item.delivery).length, manualReview: report.results.filter((item) => item.manualReview).length, failures: report.results.filter((item) => item.error).length, referenceUpdates: report.results.reduce((total, item) => total + (item.referencesUpdated || 0), 0) });
}

const output = {
  generatedAt: new Date().toISOString(),
  sourceRoot: 'assets/images',
  sourceFiles: sourceFiles.length,
  auditCandidatesPresent: sourceFiles.filter((file) => candidates.has(rel(file))).length,
  delivery: { count: deliveries.length, valid: deliveries.filter((item) => item.valid).length, invalid: deliveries.filter((item) => !item.valid).length, items: deliveries },
  masters: { count: masters.length, fourKClass: masters.filter((item) => item.fourKClass).length, items: masters },
  batches,
};
await fs.writeFile(path.join(reports, 'full-media-filesystem-audit-20260908.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ sourceFiles: output.sourceFiles, auditCandidatesPresent: output.auditCandidatesPresent, deliveryFiles: deliveries.length, validDeliveries: output.delivery.valid, invalidDeliveries: output.delivery.invalid, masterFiles: masters.length, fourKMasters: output.masters.fourKClass, batches }, null, 2));
