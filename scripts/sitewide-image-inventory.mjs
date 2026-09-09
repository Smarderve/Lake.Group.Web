import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = process.cwd();
const imageRoot = path.join(root, 'assets', 'images');
const reportDir = path.join(root, 'docs', 'reports');
const sheetDir = path.join(root, 'docs', 'qa', 'sitewide-image-remediation', 'phase-00-inventory');
const protectedPages = new Set(['agrinova-tech.html', 'assembly-tech.html', 'atl.html', 'nextdrive-motors.html']);
const activePages = [
  'index.html',
  'about.html', 'history.html', 'leadership.html', 'leadership-ally-edha-awadh.html',
  'csr.html', 'sustainability.html', 'careers.html', 'contact.html', 'gallery.html',
  'media-center.html', 'our-story.html',
  'lake-oil.html', 'lake-gas.html', 'lake-lubes.html', 'lake-steel.html',
  'lake-premix-cement.html', 'lake-trans.html', 'lake-aviation.html', 'aficd.html',
  'lake-pipes.html', 'lake-cylinders.html', 'lake-buildings.html', 'gulf-aggregates.html',
  'aill.html', 'cross-country.html', 'lake-agro.html', 'fleet.html', 'station-locator.html',
  'agrinova-tech.html', 'assembly-tech.html', 'atl.html', 'nextdrive-motors.html',
];
const raster = /\.(?:jpe?g|png|webp|avif|gif|tiff?|bmp)(?:$|[?#])/i;
const assetPattern = /(?:\.\/|\/)?assets\/images\/[A-Za-z0-9_@%+.,()'\-\/ ]+?\.(?:jpe?g|png|webp|avif|gif|tiff?|bmp)(?:\?[^\s"')>,}]+)?/gi;
const normalize = (value) => decodeURI(value).replace(/^\.\//, '').replace(/^\//, '').replace(/[?#].*$/, '').replaceAll('\\', '/');
const rel = (value) => path.relative(root, value).replaceAll('\\', '/');
const escapeXml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function allRasterFiles(dir) {
  const found = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await allRasterFiles(full));
    else if (raster.test(entry.name)) found.push(full);
  }
  return found;
}

function sectionFor(text, index) {
  const before = text.slice(0, index);
  const start = before.lastIndexOf('<section');
  if (start < 0) return 'document';
  const tagEnd = text.indexOf('>', start);
  if (tagEnd < 0 || tagEnd > index) return 'document';
  const open = text.slice(start, tagEnd + 1);
  const id = open.match(/\bid=["']([^"']+)/i)?.[1];
  const aria = open.match(/\baria-label=["']([^"']+)/i)?.[1];
  const headingText = text.slice(tagEnd + 1, index).match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)?.at(-1);
  const heading = headingText?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return id || aria || heading || 'section';
}

const pageRecords = [];
const usage = new Map();
for (const page of activePages) {
  const file = path.join(root, page);
  if (!await exists(file)) continue;
  const text = await fs.readFile(file, 'utf8');
  const references = [];
  for (const match of text.matchAll(assetPattern)) {
    const asset = normalize(match[0]);
    if (!asset.startsWith('assets/images/')) continue;
    references.push({ asset, section: sectionFor(text, match.index), sourceOffset: match.index });
    if (!usage.has(asset)) usage.set(asset, new Set());
    usage.get(asset).add(page);
  }
  const unique = [...new Map(references.map((item) => [item.asset, item])).values()];
  pageRecords.push({ page, protected: protectedPages.has(page), imageReferences: unique });
}

const files = await allRasterFiles(imageRoot);
const assets = [];
for (const file of files) {
  const assetPath = rel(file);
  const stat = await fs.stat(file);
  let metadata = {};
  let decodeOk = true;
  try { metadata = await sharp(file, { failOn: 'error', animated: false }).metadata(); } catch { decodeOk = false; }
  const pages = [...(usage.get(assetPath) || [])].sort();
  const protectedUsage = pages.filter((page) => protectedPages.has(page));
  const includedUsage = pages.filter((page) => !protectedPages.has(page));
  const sha256 = crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
  const isDeliveryArea = !assetPath.startsWith('assets/images/masters/');
  const genuineWebp = metadata.format === 'webp';
  const withinLimit = stat.size <= 500 * 1024;
  assets.push({
    path: assetPath,
    filename: path.basename(assetPath),
    sourceDimensions: metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : 'unknown',
    width: metadata.width || null,
    height: metadata.height || null,
    format: metadata.format || path.extname(file).slice(1).toLowerCase(),
    bytes: stat.size,
    decodeOk,
    sha256,
    pages,
    sharedByOtherPages: pages.length > 1,
    includedUsage,
    protectedUsage,
    sharedWithProtectedPage: includedUsage.length > 0 && protectedUsage.length > 0,
    genuineWebp,
    within500KiB: withinLimit,
    sourceLimited: Boolean(metadata.width && metadata.height && Math.max(metadata.width, metadata.height) < 1600),
    inventoryStatus: pages.length ? (includedUsage.length ? 'ACTIVE_INCLUDED' : 'ACTIVE_PROTECTED') : 'UNREFERENCED',
    processingRequired: isDeliveryArea && includedUsage.length > 0 && (!genuineWebp || !withinLimit),
    visibleThirdPartyBranding: includedUsage.length ? 'PENDING_VISUAL_REVIEW' : 'NOT_APPLICABLE',
    lakeOwnedBranding: includedUsage.length ? 'PENDING_VISUAL_REVIEW' : 'NOT_APPLICABLE',
    qualityIssue: includedUsage.length ? 'PENDING_VISUAL_REVIEW' : 'NOT_APPLICABLE',
    excludedProtected: includedUsage.length === 0 && protectedUsage.length > 0,
  });
}

const missing = [];
for (const [asset, pages] of usage) if (!assets.some((item) => item.path === asset)) missing.push({ asset, pages: [...pages].sort() });

await fs.rm(sheetDir, { recursive: true, force: true });
await fs.mkdir(sheetDir, { recursive: true });
const assetByPath = new Map(assets.map((item) => [item.path, item]));
const sheetIndex = [];
for (const page of pageRecords) {
  const items = page.imageReferences.map((ref) => ({ ...ref, metadata: assetByPath.get(ref.asset) })).filter((item) => item.metadata?.decodeOk);
  const cols = 4;
  const rows = 4;
  const tileW = 340;
  const tileH = 245;
  const perSheet = cols * rows;
  for (let start = 0; start < items.length; start += perSheet) {
    const batch = items.slice(start, start + perSheet);
    const layers = [];
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const x = (i % cols) * tileW;
      const y = Math.floor(i / cols) * tileH;
      const preview = await sharp(path.join(root, item.asset), { failOn: 'none', animated: false })
        .rotate().resize(tileW - 12, tileH - 64, { fit: 'contain', withoutEnlargement: true, background: '#171b20' }).png().toBuffer();
      const label = `${path.basename(item.asset)} | ${item.metadata.sourceDimensions} | ${Math.round(item.metadata.bytes / 1024)} KiB`;
      const section = `Section: ${item.section}`;
      const svg = `<svg width="${tileW}" height="${tileH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0f14"/><text x="8" y="${tileH - 39}" fill="#fff" font-family="Arial" font-size="11">${escapeXml(label).slice(0, 82)}</text><text x="8" y="${tileH - 21}" fill="#9fb0c0" font-family="Arial" font-size="10">${escapeXml(section).slice(0, 94)}</text><text x="8" y="${tileH - 6}" fill="#6f8090" font-family="Arial" font-size="9">${escapeXml(item.asset).slice(0, 110)}</text></svg>`;
      layers.push({ input: Buffer.from(svg), left: x, top: y }, { input: preview, left: x + 6, top: y + 6 });
    }
    const filename = `${page.page.replace(/\.html$/i, '')}-sheet-${String(start / perSheet + 1).padStart(2, '0')}.png`;
    await sharp({ create: { width: cols * tileW, height: rows * tileH, channels: 4, background: '#0b0f14' } }).composite(layers).png().toFile(path.join(sheetDir, filename));
    sheetIndex.push({ page: page.page, protected: page.protected, file: rel(path.join(sheetDir, filename)), assets: batch.map((item) => item.asset) });
  }
}

const uniqueIncludedForReview = assets.filter((item) => item.includedUsage.length > 0 && item.decodeOk).sort((a, b) => a.path.localeCompare(b.path));
const uniqueReviewSheets = [];
for (let start = 0; start < uniqueIncludedForReview.length; start += 16) {
  const batch = uniqueIncludedForReview.slice(start, start + 16);
  const tileW = 340;
  const tileH = 245;
  const layers = [];
  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const x = (i % 4) * tileW;
    const y = Math.floor(i / 4) * tileH;
    const preview = await sharp(path.join(root, item.path), { failOn: 'none', animated: false })
      .rotate().resize(tileW - 12, tileH - 64, { fit: 'contain', withoutEnlargement: true, background: '#171b20' }).png().toBuffer();
    const label = `${path.basename(item.path)} | ${item.sourceDimensions} | ${Math.round(item.bytes / 1024)} KiB`;
    const pages = `Pages: ${item.includedUsage.join(', ')}`;
    const svg = `<svg width="${tileW}" height="${tileH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0f14"/><text x="8" y="${tileH - 39}" fill="#fff" font-family="Arial" font-size="11">${escapeXml(label).slice(0, 82)}</text><text x="8" y="${tileH - 21}" fill="#9fb0c0" font-family="Arial" font-size="9">${escapeXml(pages).slice(0, 112)}</text><text x="8" y="${tileH - 6}" fill="#6f8090" font-family="Arial" font-size="9">${escapeXml(item.path).slice(0, 110)}</text></svg>`;
    layers.push({ input: Buffer.from(svg), left: x, top: y }, { input: preview, left: x + 6, top: y + 6 });
  }
  const filename = `unique-included-sheet-${String(start / 16 + 1).padStart(2, '0')}.png`;
  await sharp({ create: { width: 4 * tileW, height: 4 * tileH, channels: 4, background: '#0b0f14' } }).composite(layers).png().toFile(path.join(sheetDir, filename));
  uniqueReviewSheets.push({ file: rel(path.join(sheetDir, filename)), assets: batch.map((item) => item.path) });
}

const activeIncluded = assets.filter((item) => item.inventoryStatus === 'ACTIVE_INCLUDED');
const activeProtected = assets.filter((item) => item.inventoryStatus === 'ACTIVE_PROTECTED');
const report = {
  generatedAt: new Date().toISOString(),
  repositoryHead: (await fs.readFile(path.join(root, '.git', 'HEAD'), 'utf8')).trim(),
  restoreTag: process.env.RESTORE_TAG || 'pre-sitewide-image-remediation-20260909-213124',
  activePages: pageRecords.length,
  includedPages: pageRecords.filter((item) => !item.protected).length,
  protectedPages: pageRecords.filter((item) => item.protected).map((item) => item.page),
  totalRasterAssets: assets.length,
  activeReferencedAssets: assets.filter((item) => item.pages.length).length,
  activeIncludedAssets: activeIncluded.length,
  activeProtectedOnlyAssets: activeProtected.length,
  sharedAssets: assets.filter((item) => item.sharedByOtherPages).length,
  sharedWithProtectedAssets: assets.filter((item) => item.sharedWithProtectedPage).length,
  genuineWebpIncluded: activeIncluded.filter((item) => item.genuineWebp).length,
  within500KiBIncluded: activeIncluded.filter((item) => item.within500KiB).length,
  sourceLimitedIncluded: activeIncluded.filter((item) => item.sourceLimited).length,
  machineProcessingRequired: activeIncluded.filter((item) => item.processingRequired).length,
  missingReferences: missing,
  pages: pageRecords,
  assets,
  visualReviewSheets: sheetIndex,
  uniqueIncludedReviewSheets: uniqueReviewSheets,
};
await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(path.join(reportDir, 'sitewide-image-inventory-20260909.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  activePages: report.activePages,
  includedPages: report.includedPages,
  totalRasterAssets: report.totalRasterAssets,
  activeReferencedAssets: report.activeReferencedAssets,
  activeIncludedAssets: report.activeIncludedAssets,
  activeProtectedOnlyAssets: report.activeProtectedOnlyAssets,
  sharedWithProtectedAssets: report.sharedWithProtectedAssets,
  genuineWebpIncluded: report.genuineWebpIncluded,
  within500KiBIncluded: report.within500KiBIncluded,
  sourceLimitedIncluded: report.sourceLimitedIncluded,
  machineProcessingRequired: report.machineProcessingRequired,
  missingReferences: missing.length,
  sheets: sheetIndex.length,
}, null, 2));
