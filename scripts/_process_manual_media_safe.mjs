import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const excludedPages = /^(agrinova-tech|atl|assembly-tech|nextdrive-motors)\.html$/i;
const safeNoEdit = [
  'assets/images/acfs/TA/photo_3.jpg',
  'assets/images/acfs/TA/photo_5.jpg',
  'assets/images/acfs/TA/photo_6.jpg',
  'assets/images/acfs/TA/photo_7.jpg',
  'assets/images/news/4/photo_1.jpg',
  'assets/images/news/4/photo_2.jpg',
  'assets/images/news/4/photo_3.jpg',
  'assets/images/news/6/photo_1.jpg',
  'assets/images/news/6/photo_2.jpg',
  'assets/images/news/6/photo_3.jpg'
];

const report = JSON.parse(await fs.readFile(path.join(root, 'docs/reports/media-processing-20260907.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'docs/reports/media-inventory-20260907.json'), 'utf8'));
const processed = [];

function refsFor(item) {
  return item.pagesOrComponents.filter(file => !excludedPages.test(path.basename(file)) && !/^(docs|scripts|tests)\//i.test(file));
}

for (const original of safeNoEdit) {
  const item = manifest.assets.find(candidate => candidate.path === original);
  if (!item) continue;
  const source = path.join(root, original);
  const destination = source.replace(/\.(jpe?g|png)$/i, '.webp');
  const output = path.relative(root, destination).replaceAll('\\', '/');
  const meta = await sharp(source, { failOn: 'none' }).metadata();
  const buffer = await sharp(source, { failOn: 'none' }).rotate().webp({ quality: 84, effort: 6, alphaQuality: 90 }).toBuffer();
  await fs.writeFile(destination, buffer);
  for (const file of refsFor(item)) {
    const full = path.join(root, file);
    let text;
    try { text = await fs.readFile(full, 'utf8'); } catch { continue; }
    if (text.includes(original)) await fs.writeFile(full, text.split(original).join(output));
  }
  processed.push({ original, webp: output, width: meta.width, height: meta.height, finalBytes: buffer.length, decision: 'no-edit-required-visible-third-party-mark-not-found' });
}

const decisionReport = {
  generatedAt: new Date().toISOString(),
  manifest: 'docs/reports/media-inventory-20260907.json',
  safeNoEdit: processed,
  unresolved: report.manualReviewPaths.filter(item => !safeNoEdit.includes(item)).map(item => ({ path: item, reason: 'manual review retained: visible third-party identity, licensing/ownership uncertainty, or Lake/subsidiary branding requiring preservation' }))
};
await fs.writeFile(path.join(root, 'docs/reports/media-manual-decisions-20260907.json'), `${JSON.stringify(decisionReport, null, 2)}\n`);
const safeSet = new Set(safeNoEdit);
report.manualReviewPaths = report.manualReviewPaths.filter(item => !safeSet.has(item));
report.manualReviewRequired = report.manualReviewPaths.length;
for (const item of processed) {
  report.noEdit.push({ original: item.original, webp: item.webp, finalBytes: item.finalBytes });
}
report.safeProcessed = report.changed.length + report.noEdit.length;
await fs.writeFile(path.join(root, 'docs/reports/media-processing-20260907.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ processed: processed.length, unresolved: decisionReport.unresolved.length }, null, 2));
