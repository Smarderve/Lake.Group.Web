import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const background = '#012f49';
const sizes = {
  mobile: { width: 1080, height: 1920 },
  tablet: { width: 1440, height: 1800 },
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
  for (const [kind, canvas] of Object.entries(sizes)) {
    const scale = Math.min(canvas.width / metadata.width, canvas.height / metadata.height);
    const width = Math.round(metadata.width * scale);
    const height = Math.round(metadata.height * scale);
    const output = path.join(root, desktopImage.replace(/\.webp$/, `-${kind}.webp`));
    await sharp({ create: { width: canvas.width, height: canvas.height, channels: 3, background } })
      .composite([{ input: await sharp(input).resize(width, height, { fit: 'fill' }).webp({ quality: 88 }).toBuffer(), left: Math.round((canvas.width - width) / 2), top: Math.round((canvas.height - height) / 2) }])
      .webp({ quality: 88, effort: 6 })
      .toFile(output);
    console.log(`${path.relative(root, output)}: ${width}x${height} photo on ${canvas.width}x${canvas.height} ${kind} canvas`);
  }
}
