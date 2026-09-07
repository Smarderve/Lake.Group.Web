import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'docs/reports/media-processing-20260907.json');
const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
const flagged = ['assets/images/news/6/photo_4.jpg'];
for (const original of flagged) {
  const webp = original.replace(/\.(jpe?g|png)$/i, '.webp');
  try { await fs.rm(path.join(root, webp), { force: true }); } catch {}
  for (const file of new Set(report.changed.map(item => item.original))) {
    const full = path.join(root, file);
    try {
      let text = await fs.readFile(full, 'utf8');
      if (text.includes(webp)) await fs.writeFile(full, text.split(webp).join(original));
    } catch {}
  }
  report.changed = report.changed.filter(item => item.original !== original);
  report.noEdit = report.noEdit.filter(item => item.original !== original);
  if (!report.manualReviewPaths.includes(original)) report.manualReviewPaths.push(original);
}
report.safeProcessed = report.changed.length + report.noEdit.length;
report.manualReviewRequired = report.manualReviewPaths.length;
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ safeProcessed: report.safeProcessed, manualReviewRequired: report.manualReviewRequired }, null, 2));
