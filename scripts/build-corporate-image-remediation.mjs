import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const generatedRoot = 'C:/Users/USER/.codex/generated_images/01a0855e-b267-70e0-9b57-80709917b26a';
const outputRoot = path.join(root, 'assets/images/delivery/corporate/remediated');
const jobs = [
  {
    id: 'aficd-gallery', source: 'assets/images/aficd/operations/aficd-hero-reach-stacker.webp', generated: 'exec-955e95f7-0826-4cef-96a6-7c246e0ba5d2.png', output: 'aficd-reach-stacker-clean.webp',
    shapes: ['<rect x="0%" y="24%" width="100%" height="49%"/>', '<rect x="35%" y="63%" width="31%" height="31%"/>'],
  },
  {
    id: 'gccp-gallery-3', source: 'assets/images/delivery/gccp/photo_3.webp', generated: 'exec-203f5132-97fb-42a5-a2df-2dc682276d9a.png', output: 'gccp-truck-lineup-clean.webp',
    shapes: ['<rect x="3%" y="27%" width="29%" height="43%"/>', '<rect x="28%" y="31%" width="27%" height="37%"/>', '<rect x="49%" y="34%" width="24%" height="34%"/>', '<rect x="68%" y="38%" width="20%" height="30%"/>'],
  },
  {
    id: 'gccp-gallery-5', source: 'assets/images/delivery/gccp/photo_5.webp', generated: 'exec-3540a391-8373-4955-bbfe-fe170892672a.png', output: 'gccp-yard-clean.webp',
    shapes: ['<rect x="0%" y="48%" width="67%" height="43%"/>'],
  },
  {
    id: 'laketrans-story', source: 'assets/images/delivery/laketrans/TA/photo_1.webp', generated: 'exec-bc5f76f0-b07e-42f1-b3b1-27683804118d.png', output: 'lake-trans-story-fleet-clean.webp',
    shapes: ['<polygon points="0%,38% 100%,40% 100%,74% 0%,77%"/>'],
  },
  {
    id: 'aviation-csr', source: 'assets/images/lake-aviation/gallery/aviation-worker-underwing.webp', generated: 'exec-31e77bcd-b7f3-4a72-9751-489d874294ea.png', output: 'aviation-worker-underwing-clean.webp',
    shapes: ['<rect x="0%" y="35%" width="48%" height="40%"/>'],
  },
];

await fs.mkdir(outputRoot, { recursive: true });
async function writeWebp(buffer, destination, width, height) {
  let quality = 86;
  let output;
  do {
    output = await sharp(buffer).resize(width, height, { fit: 'fill', withoutEnlargement: true }).webp({ quality, effort: 6 }).toBuffer();
    quality -= 4;
  } while (output.length > 500 * 1024 && quality >= 58);
  if (output.length > 500 * 1024) throw new Error(`${destination} remains above 500 KiB`);
  await fs.writeFile(destination, output);
  return { bytes: output.length, quality: quality + 4 };
}

const results = [];
for (const job of jobs) {
  const sourcePath = path.join(root, job.source);
  const metadata = await sharp(sourcePath).metadata();
  const { width, height } = metadata;
  const maskSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black"/>${job.shapes.map((shape) => shape.replace('/>', ' fill="white"/>')).join('')}</svg>`;
  const mask = await sharp(Buffer.from(maskSvg)).blur(2.2).removeAlpha().raw().toBuffer();
  const patch = await sharp(path.join(generatedRoot, job.generated)).resize(width, height, { fit: 'fill' }).removeAlpha().joinChannel(mask, { raw: { width, height, channels: 1 } }).png().toBuffer();
  const composited = await sharp(sourcePath).composite([{ input: patch }]).png().toBuffer();
  const destination = path.join(outputRoot, job.output);
  const encoded = await writeWebp(composited, destination, width, height);
  results.push({ id: job.id, source: job.source, output: path.relative(root, destination).replaceAll('\\', '/'), width, height, ...encoded });
}

await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(results, null, 2)}\n`);
const tileWidth = 360;
const tileHeight = 250;
const captionHeight = 34;
const columns = 3;
const layers = [];
for (let index = 0; index < results.length; index += 1) {
  const item = results[index];
  const left = (index % columns) * tileWidth;
  const top = Math.floor(index / columns) * (tileHeight + captionHeight);
  const preview = await sharp(path.join(root, item.output)).resize(tileWidth, tileHeight, { fit: 'contain', background: '#11161c' }).png().toBuffer();
  const caption = Buffer.from(`<svg width="${tileWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0f14"/><text x="8" y="22" fill="white" font-family="Arial" font-size="13">${item.id} · ${Math.round(item.bytes / 1024)} KiB</text></svg>`);
  layers.push({ input: preview, left, top }, { input: caption, left, top: top + tileHeight });
}
const rows = Math.ceil(results.length / columns);
const qaPath = path.join(root, 'docs/qa/sitewide-image-remediation/phase-02-corporate/corporate-remediated-assets.png');
await fs.mkdir(path.dirname(qaPath), { recursive: true });
await sharp({ create: { width: columns * tileWidth, height: rows * (tileHeight + captionHeight), channels: 4, background: '#0b0f14' } }).composite(layers).png().toFile(qaPath);
console.log(JSON.stringify(results, null, 2));
