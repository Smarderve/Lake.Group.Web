import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const report = JSON.parse(await fs.readFile(path.join(root, 'docs/reports/media-processing-20260907.json'), 'utf8'));
const items = report.changed.map(item => ({ path: item.webp, label: item.original, bytes: item.finalBytes }));
const outDir = path.join(root, 'docs/reports/media-processed-sheets');
await fs.mkdir(outDir, { recursive: true });
const cols = 4, rows = 5, tileW = 360, tileH = 250, batchSize = cols * rows;
for (let start = 0; start < items.length; start += batchSize) {
  const batch = items.slice(start, start + batchSize), layers = [];
  for (let i = 0; i < batch.length; i++) {
    const item = batch[i], x = (i % cols) * tileW, y = Math.floor(i / cols) * tileH;
    const image = await sharp(path.join(root, item.path)).resize(tileW - 8, tileH - 42, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    const label = item.label.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const svg = `<svg width="${tileW}" height="${tileH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><rect x="4" y="4" width="${tileW - 8}" height="${tileH - 42}" fill="#222"/><text x="8" y="${tileH - 24}" fill="#fff" font-family="Arial" font-size="11">${label}</text><text x="8" y="${tileH - 8}" fill="#aaa" font-family="Arial" font-size="11">${(item.bytes / 1024).toFixed(0)} KB · WebP</text></svg>`;
    layers.push({ input: Buffer.from(svg), left: x, top: y }, { input: image, left: x + 4, top: y + 4 });
  }
  await sharp({ create: { width: cols * tileW, height: rows * tileH, channels: 4, background: '#111' } }).composite(layers).png().toFile(path.join(outDir, `sheet-${String(Math.floor(start / batchSize) + 1).padStart(2, '0')}.png`));
}
console.log(`Created ${Math.ceil(items.length / batchSize)} processed-output sheets.`);
