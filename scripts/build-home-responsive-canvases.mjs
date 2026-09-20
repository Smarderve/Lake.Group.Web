import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const sizes = {
  mobile: { maxWidth: 1600 },
  tablet: { maxWidth: 1672 },
};
const desktopImages = [
  'assets/images/delivery/home/verticals/energies.webp',
  'assets/images/delivery/home/verticals/manufacturing.webp',
  'assets/images/delivery/home/remediated/automotive-truck-lineup-clean.webp',
  'assets/images/delivery/cross-country/cross-country-hero.webp',
  'assets/images/delivery/home/remediated/lake-agro-hero-desktop-clean.webp',
  'assets/images/delivery/home/verticals/logistics.webp',
];

for (const desktopImage of desktopImages) {
  const input = path.join(root, desktopImage);
  const metadata = await sharp(input).metadata();
  for (const [kind, delivery] of Object.entries(sizes)) {
    const width = Math.min(metadata.width, delivery.maxWidth);
    const output = path.join(root, desktopImage.replace(/\.webp$/, `-${kind}.webp`));
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 90, effort: 6 })
      .toFile(output);
    console.log(`${path.relative(root, output)}: landscape ${kind} delivery from approved original`);
  }
}
