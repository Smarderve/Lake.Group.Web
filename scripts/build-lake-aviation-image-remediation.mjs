import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const generatedRoot = 'C:/Users/USER/.codex/generated_images/01a0855e-b267-70e0-9b57-80709917b26a';
const outputRoot = path.join(root, 'assets/images/delivery/lake-aviation/remediated');
const jobs = [
  ['fueling', 'assets/images/lake-aviation/gallery/aviation-fueling-coastal.webp', 'exec-a29127ad-a66d-4bd1-92bb-13cc2262e80e.png', 'aviation-fueling-clean.webp', '<rect x="32%" y="18%" width="68%" height="52%"/>'],
  ['nyerere', 'assets/images/lake-aviation/gallery/aviation-nyerere-tanker.webp', 'exec-756b82bd-f2d0-4d90-aedb-7c7067b82942.png', 'aviation-nyerere-clean.webp', '<rect x="0%" y="18%" width="73%" height="54%"/>'],
  ['skyward', 'assets/images/lake-aviation/gallery/aviation-skyward-apron.webp', 'exec-4c3d91df-d538-4662-8443-ec2b1c9993ff.png', 'aviation-skyward-clean.webp', '<rect x="0%" y="18%" width="78%" height="53%"/>'],
  ['team-truck', 'assets/images/lake-aviation/gallery/aviation-team-truck.webp', 'exec-fc2827bf-dabc-4cab-956d-ddad2bbdb509.png', 'aviation-team-truck-clean.webp', '<rect x="18%" y="16%" width="82%" height="58%"/>'],
  ['ops-10', 'assets/images/lake-aviation/ops/aviation-10.webp', 'exec-1d6a5441-b4ba-442c-8e45-0107dcd66142.png', 'aviation-10-clean.webp', '<rect x="36%" y="24%" width="64%" height="51%"/>'],
  ['ops-11', 'assets/images/lake-aviation/ops/aviation-11.webp', 'exec-ff7192c0-3af4-464c-aeed-bbf26ff582fa.png', 'aviation-11-clean.webp', '<rect x="35%" y="20%" width="65%" height="61%"/>'],
  ['ops-12', 'assets/images/lake-aviation/ops/aviation-12.webp', 'exec-8a263ff9-8997-4253-901a-5bb181ebbee6.png', 'aviation-12-clean.webp', '<rect x="27%" y="16%" width="73%" height="64%"/>'],
  ['ops-13', 'assets/images/lake-aviation/ops/aviation-13.webp', 'exec-9b5324e3-ba1e-4d47-8db4-667c6998a6ad.png', 'aviation-13-clean.webp', '<rect x="0%" y="17%" width="79%" height="58%"/>'],
  ['ops-14', 'assets/images/lake-aviation/ops/aviation-14.webp', 'exec-26be4b39-b2ca-466c-8bc3-45116a0a2a49.png', 'aviation-14-clean.webp', '<rect x="0%" y="32%" width="52%" height="46%"/>'],
  ['ops-15', 'assets/images/lake-aviation/ops/aviation-15.webp', 'exec-0851a678-a0d0-4b32-be51-5aab45ebddc1.png', 'aviation-15-clean.webp', '<rect x="0%" y="18%" width="100%" height="57%"/>'],
  ['ops-2', 'assets/images/lake-aviation/ops/aviation-2.webp', 'exec-e59378b6-362a-4831-bcd1-f7151ebb254e.png', 'aviation-2-clean.webp', '<rect x="0%" y="18%" width="76%" height="58%"/>'],
  ['ops-4', 'assets/images/lake-aviation/ops/aviation-4.webp', 'exec-4068fb42-3a0e-4ed1-bbad-678b41a6de04.png', 'aviation-4-clean.webp', '<rect x="24%" y="16%" width="76%" height="60%"/>'],
  ['ops-6', 'assets/images/lake-aviation/ops/aviation-6.webp', 'exec-c1ec87d0-bed6-4686-975e-f12c5f7ad681.png', 'aviation-6-clean.webp', '<rect x="25%" y="17%" width="75%" height="60%"/>'],
  ['ops-8', 'assets/images/lake-aviation/ops/aviation-8.webp', 'exec-61733073-f49d-471e-bcba-da80c9efc1e3.png', 'aviation-8-clean.webp', '<rect x="0%" y="14%" width="100%" height="69%"/>'],
  ['ops-9', 'assets/images/lake-aviation/ops/aviation-9.webp', 'exec-aa01ff78-304f-4171-a058-b06f22475638.png', 'aviation-9-clean.webp', '<rect x="35%" y="16%" width="65%" height="68%"/>'],
  ['hero', 'assets/images/lake-aviation/ops/lake-aviation-hero-apron.webp', 'exec-562381fe-c06c-4611-a762-d863cbee8ca2.png', 'lake-aviation-hero-apron-clean.webp', '<polygon points="39%,0% 100%,0% 100%,31% 49%,46% 37%,35%"/>'],
];
await fs.mkdir(outputRoot, { recursive: true });

async function encode(input, destination, width, height) {
  let quality = 86, output;
  do { output = await sharp(input).resize(width, height, { fit: 'fill', withoutEnlargement: true }).webp({ quality, effort: 6 }).toBuffer(); quality -= 4; }
  while (output.length > 500 * 1024 && quality >= 58);
  if (output.length > 500 * 1024) throw new Error(`${destination} exceeds 500 KiB`);
  await fs.writeFile(destination, output);
  return { bytes: output.length, quality: quality + 4 };
}

const results = [];
for (const [id, source, generated, filename, shape] of jobs) {
  const sourcePath = path.join(root, source);
  const { width, height } = await sharp(sourcePath).metadata();
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black"/>${shape.replace('/>', ' fill="white"/>')}</svg>`;
  const mask = await sharp(Buffer.from(svg)).blur(2).removeAlpha().raw().toBuffer();
  const patch = await sharp(path.join(generatedRoot, generated)).resize(width, height, { fit: 'fill' }).removeAlpha().joinChannel(mask, { raw: { width, height, channels: 1 } }).png().toBuffer();
  const composited = await sharp(sourcePath).composite([{ input: patch }]).png().toBuffer();
  const destination = path.join(outputRoot, filename);
  results.push({ id, source, output: path.relative(root, destination).replaceAll('\\', '/'), width, height, ...await encode(composited, destination, width, height) });
}

const sharedWorker = path.join(root, 'assets/images/delivery/corporate/remediated/aviation-worker-underwing-clean.webp');
const workerMeta = await sharp(sharedWorker).metadata();
const workerDest = path.join(outputRoot, 'aviation-worker-underwing-clean.webp');
results.push({ id: 'worker', source: 'assets/images/lake-aviation/gallery/aviation-worker-underwing.webp', output: path.relative(root, workerDest).replaceAll('\\', '/'), width: workerMeta.width, height: workerMeta.height, ...await encode(sharedWorker, workerDest, workerMeta.width, workerMeta.height) });

await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(results, null, 2)}\n`);
const tileWidth = 340, tileHeight = 230, captionHeight = 32, columns = 4, layers = [];
for (let index = 0; index < results.length; index += 1) {
  const item = results[index], left = (index % columns) * tileWidth, top = Math.floor(index / columns) * (tileHeight + captionHeight);
  const preview = await sharp(path.join(root, item.output)).resize(tileWidth, tileHeight, { fit: 'contain', background: '#11161c' }).png().toBuffer();
  const caption = Buffer.from(`<svg width="${tileWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0f14"/><text x="8" y="21" fill="white" font-family="Arial" font-size="12">${item.id} · ${Math.round(item.bytes / 1024)} KiB</text></svg>`);
  layers.push({ input: preview, left, top }, { input: caption, left, top: top + tileHeight });
}
const qaPath = path.join(root, 'docs/qa/sitewide-image-remediation/phase-06-lake-aviation-aficd/lake-aviation-remediated-assets.png');
await fs.mkdir(path.dirname(qaPath), { recursive: true });
await sharp({ create: { width: columns * tileWidth, height: Math.ceil(results.length / columns) * (tileHeight + captionHeight), channels: 4, background: '#0b0f14' } }).composite(layers).png().toFile(qaPath);
console.log(JSON.stringify(results, null, 2));
