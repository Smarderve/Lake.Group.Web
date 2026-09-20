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
    if (metadata.desktop.width <= metadata.desktop.height) errors.push(`${section}: desktop original must remain landscape`);
    for (const kind of ['tablet', 'mobile']) {
      const candidate = metadata[kind];
      if (candidate.width <= candidate.height) errors.push(`${section}: ${kind} delivery must retain the approved landscape photograph`);
      if (candidate.width > metadata.desktop.width || candidate.height > metadata.desktop.height) errors.push(`${section}: ${kind} delivery must not upscale the approved original`);
    }
    if (metadata.mobile.width < Math.min(1200, metadata.desktop.width)) errors.push(`${section}: mobile delivery is below the useful high-DPI width`);
    if (metadata.tablet.width < metadata.mobile.width) errors.push(`${section}: tablet delivery must be at least as wide as mobile`);
    if (!index.includes(variants.tablet) || !index.includes(variants.mobile)) errors.push(`${section}: responsive picture sources are not registered in Home`);
    if (!index.includes('(max-width: 600px) and (orientation: portrait)') || !index.includes('(min-width: 601px) and (max-width: 1024px) and (orientation: portrait)')) errors.push(`${section}: picture sources must be orientation-aware`);
  }
  report.push({ section, variants: metadata, composition: 'Landscape high-quality delivery copies from the approved original. Full-bleed framing is applied by CSS with a per-slide object position.', status: Object.keys(metadata).length === 3 ? 'ready' : 'missing' });
}

if (/object-fit:\s*contain/.test(await fs.readFile(path.join(root, 'assets', 'home-redesign.css'), 'utf8'))) errors.push('Home hero must not use object-fit: contain at responsive breakpoints');

await fs.writeFile(path.join(root, 'docs', 'reports', 'responsive-hero-image-audit.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), groups: report, totals: { groups: groups.length, mobileDerivatives: groups.length, tabletDerivatives: groups.length, retainedDesktopOriginals: groups.length } }, null, 2)}\n`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Responsive hero images passed: ${groups.length} full-bleed landscape delivery groups, ${groups.length} mobile and ${groups.length} tablet derivatives.`);
