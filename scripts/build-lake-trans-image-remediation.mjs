import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const generatedRoot = 'C:/Users/USER/.codex/generated_images/01a0855e-b267-70e0-9b57-80709917b26a';
const outputRoot = path.join(root, 'assets/images/delivery/laketrans/remediated');
const jobs = [
  ['blue-lineup', 'assets/images/laketrans/profile/blue-truck-lineup.webp', 'exec-30218eb4-46b9-4d26-8170-d493ef10c8ba.png', 'blue-truck-lineup-clean.webp', '<rect x="0%" y="38%" width="100%" height="43%"/>'],
  ['fleet-lineup', 'assets/images/laketrans/profile/fleet-lineup.webp', 'exec-f36d41fb-91e1-463b-ae35-95b6b8ed5734.png', 'fleet-lineup-clean.webp', '<rect x="0%" y="36%" width="100%" height="38%"/>'],
  ['fleet-tankers', 'assets/images/laketrans/profile/fleet-tankers.webp', 'exec-88579725-7760-4542-a432-a0439ba22ca8.png', 'fleet-tankers-clean.webp', '<rect x="0%" y="36%" width="73%" height="39%"/>'],
  ['petroleum-tanker', 'assets/images/laketrans/profile/petroleum-tanker.webp', 'exec-49d601f5-1693-4560-9209-a079fb900bb0.png', 'petroleum-tanker-clean.webp', '<rect x="58%" y="24%" width="33%" height="65%"/>'],
  ['road-tanker', 'assets/images/laketrans/profile/road-fuel-tanker.webp', 'exec-bc9fce19-14b4-47b2-9e00-cc68de7ba300.png', 'road-fuel-tanker-clean.webp', '<rect x="40%" y="36%" width="28%" height="38%"/>'],
];
await fs.mkdir(outputRoot, { recursive: true });

async function encode(input, destination, width, height) {
  let quality = 86;
  let output;
  do { output = await sharp(input).resize(width, height, { fit: 'fill', withoutEnlargement: true }).webp({ quality, effort: 6 }).toBuffer(); quality -= 4; }
  while (output.length > 500 * 1024 && quality >= 58);
  if (output.length > 500 * 1024) throw new Error(`${destination} exceeds 500 KiB`);
  await fs.writeFile(destination, output);
  return { bytes: output.length, quality: quality + 4 };
}

const results = [];
const cleanHero = path.join(root, 'assets/images/delivery/home/remediated/lake-trans-fleet-hero-clean.webp');
const heroMeta = await sharp(cleanHero).metadata();
results.push({ id: 'hero', output: 'assets/images/delivery/laketrans/remediated/lake-trans-fleet-hero-clean.webp', width: heroMeta.width, height: heroMeta.height, ...await encode(cleanHero, path.join(outputRoot, 'lake-trans-fleet-hero-clean.webp'), heroMeta.width, heroMeta.height) });
results.push({ id: 'hero-800', output: 'assets/images/delivery/laketrans/remediated/lake-trans-fleet-hero-clean-800.webp', width: 800, height: 366, ...await encode(cleanHero, path.join(outputRoot, 'lake-trans-fleet-hero-clean-800.webp'), 800, 366) });

for (const [id, source, generated, filename, shape] of jobs) {
  const sourcePath = path.join(root, source);
  const { width, height } = await sharp(sourcePath).metadata();
  const maskSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black"/>${shape.replace('/>', ' fill="white"/>')}</svg>`;
  const mask = await sharp(Buffer.from(maskSvg)).blur(1.8).removeAlpha().raw().toBuffer();
  const patch = await sharp(path.join(generatedRoot, generated)).resize(width, height, { fit: 'fill' }).removeAlpha().joinChannel(mask, { raw: { width, height, channels: 1 } }).png().toBuffer();
  const composited = await sharp(sourcePath).composite([{ input: patch }]).png().toBuffer();
  const destination = path.join(outputRoot, filename);
  results.push({ id, source, output: path.relative(root, destination).replaceAll('\\', '/'), width, height, ...await encode(composited, destination, width, height) });
}

await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(results, null, 2)}\n`);
const tileWidth = 360, tileHeight = 250, captionHeight = 34, columns = 3;
const layers = [];
for (let index = 0; index < results.length; index += 1) {
  const item = results[index], left = (index % columns) * tileWidth, top = Math.floor(index / columns) * (tileHeight + captionHeight);
  const preview = await sharp(path.join(root, item.output)).resize(tileWidth, tileHeight, { fit: 'contain', background: '#11161c' }).png().toBuffer();
  const caption = Buffer.from(`<svg width="${tileWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0f14"/><text x="8" y="22" fill="white" font-family="Arial" font-size="13">${item.id} · ${Math.round(item.bytes / 1024)} KiB</text></svg>`);
  layers.push({ input: preview, left, top }, { input: caption, left, top: top + tileHeight });
}
const qaPath = path.join(root, 'docs/qa/sitewide-image-remediation/phase-05-lake-trans/lake-trans-remediated-assets.png');
await fs.mkdir(path.dirname(qaPath), { recursive: true });
await sharp({ create: { width: columns * tileWidth, height: Math.ceil(results.length / columns) * (tileHeight + captionHeight), channels: 4, background: '#0b0f14' } }).composite(layers).png().toFile(qaPath);
console.log(JSON.stringify(results, null, 2));
