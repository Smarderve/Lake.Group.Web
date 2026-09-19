import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const groups = [
  ['Home / Energies', 'assets/images/delivery/home/verticals/energies.webp'],
  ['Home / Manufacturing', 'assets/images/delivery/home/verticals/manufacturing.webp'],
  ['Home / Automotive', 'assets/images/delivery/home/remediated/automotive-truck-lineup-clean.webp'],
  ['Home / Real estate', 'assets/images/delivery/cross-country/cross-country-hero.webp'],
  ['Home / Agro', 'assets/images/delivery/home/remediated/lake-agro-hero-desktop-clean.webp'],
  ['Home / Logistics', 'assets/images/delivery/home/verticals/logistics.webp'],
];
const index = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const errors = [];
const report = [];

for (const [section, desktop] of groups) {
  const base = desktop.slice(0, -'.webp'.length);
  const variants = { desktop, tablet: `${base}-tablet.webp`, mobile: `${base}-mobile.webp` };
  const metadata = {};
  for (const [kind, file] of Object.entries(variants)) {
    const absolute = path.join(root, file);
    try {
      await fs.access(absolute);
      const [image, stat] = await Promise.all([sharp(absolute).metadata(), fs.stat(absolute)]);
      metadata[kind] = { path: file, width: image.width, height: image.height, bytes: stat.size };
    } catch { errors.push(`${section}: missing ${kind} image ${file}`); }
  }
  if (metadata.desktop && metadata.tablet && metadata.mobile) {
    const ratio = metadata.desktop.width / metadata.desktop.height;
    for (const kind of ['tablet', 'mobile']) {
      const candidate = metadata[kind];
      if (Math.abs(candidate.width / candidate.height - ratio) > 0.002) errors.push(`${section}: ${kind} changed the original aspect ratio`);
    }
    if (metadata.tablet.width < metadata.mobile.width) errors.push(`${section}: tablet must be at least as wide as mobile`);
    if (!index.includes(variants.tablet) || !index.includes(variants.mobile)) errors.push(`${section}: responsive picture sources are not registered in Home`);
  }
  report.push({ section, variants: metadata, status: Object.keys(metadata).length === 3 ? 'ready' : 'missing' });
}

await fs.writeFile(path.join(root, 'docs', 'reports', 'responsive-hero-image-audit.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), groups: report, totals: { groups: groups.length, mobileDerivatives: groups.length, tabletDerivatives: groups.length, retainedDesktopOriginals: groups.length } }, null, 2)}\n`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Responsive hero images passed: ${groups.length} full-frame groups, ${groups.length} mobile and ${groups.length} tablet derivatives.`);
