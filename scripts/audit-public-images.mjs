import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const imageRoot = path.join(root, 'assets', 'images');
const output = path.join(root, 'docs', 'reports', 'static-launch-image-inventory.json');
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const sourceExtensions = new Set(['.html', '.css', '.js']);
const imageFiles = [];
const sourceFiles = [];

async function walk(directory, collection, extensions) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, collection, extensions);
    else if (extensions.has(path.extname(entry.name).toLowerCase())) collection.push(absolute);
  }
}

await walk(imageRoot, imageFiles, imageExtensions);
for (const entry of await fs.readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.html')) sourceFiles.push(path.join(root, entry.name));
}
await walk(path.join(root, 'assets'), sourceFiles, sourceExtensions);

const usage = new Map();
const referencePattern = /assets\/images\/[A-Za-z0-9_./%+ ()-]+?\.(?:avif|gif|jpe?g|png|svg|webp)/gi;
for (const source of sourceFiles) {
  const text = await fs.readFile(source, 'utf8').catch(() => '');
  for (const match of text.matchAll(referencePattern)) {
    const asset = decodeURI(match[0]).replaceAll('\\', '/');
    if (!usage.has(asset)) usage.set(asset, new Set());
    usage.get(asset).add(path.relative(root, source).replaceAll('\\', '/'));
  }
}

const images = [];
for (const absolute of imageFiles) {
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  const stat = await fs.stat(absolute);
  let metadata = {};
  try { metadata = await sharp(absolute, { failOn: 'none', animated: false }).metadata(); } catch {}
  const usedBy = [...(usage.get(relative) || [])].sort();
  if (relative.startsWith('assets/images/flags/') && usedBy.length === 0) usedBy.push('dynamic:globe-lab.bundle.js');
  images.push({
    path: relative,
    width: metadata.width || null,
    height: metadata.height || null,
    format: metadata.format || path.extname(relative).slice(1).toLowerCase(),
    bytes: stat.size,
    usedBy,
    active: usedBy.length > 0,
    threshold: stat.size > 4 * 1024 * 1024 ? '>4MB' : stat.size > 2 * 1024 * 1024 ? '>2MB' : stat.size > 1024 * 1024 ? '>1MB' : stat.size > 500 * 1024 ? '>500KB' : null,
  });
}
images.sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
const active = images.filter((image) => image.active);
const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    images: images.length,
    bytes: images.reduce((sum, image) => sum + image.bytes, 0),
    activeImages: active.length,
    activeBytes: active.reduce((sum, image) => sum + image.bytes, 0),
    activeOver500KB: active.filter((image) => image.bytes > 500 * 1024).length,
    activeOver1MB: active.filter((image) => image.bytes > 1024 * 1024).length,
    activeOver2MB: active.filter((image) => image.bytes > 2 * 1024 * 1024).length,
    activeOver4MB: active.filter((image) => image.bytes > 4 * 1024 * 1024).length,
  },
  images,
};
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals, null, 2));
