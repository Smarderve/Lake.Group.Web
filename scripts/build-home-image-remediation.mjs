import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const generatedRoot = 'C:/Users/USER/.codex/generated_images/01a0855e-b267-70e0-9b57-80709917b26a';
const outputRoot = path.join(root, 'assets/images/delivery/home/remediated');

const jobs = [
  {
    id: 'automotive', source: 'assets/images/home/verticals/automotive-truck-lineup.webp', generated: 'exec-fb02a75c-0899-47c7-bb96-a5b89a72cdda.png', output: 'automotive-truck-lineup-clean.webp',
    shapes: [
      '<rect x="3%" y="34%" width="17%" height="14%"/>', '<rect x="3%" y="58%" width="9%" height="8%"/>',
      '<rect x="36%" y="39%" width="10%" height="11%"/>', '<rect x="36%" y="58%" width="7%" height="7%"/>',
      '<polygon points="51%,40% 100%,47% 100%,61% 51%,58%"/>',
    ],
  },
  {
    id: 'aill', source: 'assets/images/aill/aill-hero.webp', generated: 'exec-a31a76b7-db00-4836-ac65-9048bc655931.png', output: 'aill-hero-clean.webp',
    shapes: [
      '<rect x="0%" y="55%" width="24%" height="23%"/>', '<rect x="22%" y="54%" width="20%" height="18%"/>',
      '<rect x="43%" y="33%" width="57%" height="48%"/>', '<rect x="16%" y="63%" width="29%" height="24%"/>',
    ],
  },
  {
    id: 'aviation', source: 'assets/images/delivery/lake-aviation/ops/lake-aviation-hero-apron.webp', generated: 'exec-975f4fcc-8a8a-4efc-8539-19dca648cf57.png', output: 'lake-aviation-hero-apron-clean.webp',
    shapes: ['<polygon points="48%,0% 100%,0% 100%,27% 52%,41% 43%,32%"/>'],
  },
  {
    id: 'laketrans', source: 'assets/images/laketrans/hero/lake-trans-fleet-hero.webp', generated: 'exec-dc1b44ac-a24c-43a5-97c4-e40dee534ea9.png', output: 'lake-trans-fleet-hero-clean.webp',
    shapes: [
      '<rect x="3%" y="29%" width="17%" height="17%"/>', '<rect x="3%" y="55%" width="10%" height="8%"/>',
      '<rect x="35%" y="34%" width="12%" height="14%"/>', '<rect x="35%" y="54%" width="8%" height="8%"/>',
      '<polygon points="50%,36% 100%,43% 100%,59% 50%,55%"/>',
    ],
  },
  {
    id: 'agrinova', source: 'assets/images/agrinova/combine.webp', generated: 'exec-78ab4da7-a7a3-4b63-a099-ee642aa082f9.png', output: 'agrinova-combine-clean.webp',
    shapes: ['<rect x="28%" y="13%" width="39%" height="25%"/>', '<rect x="65%" y="19%" width="24%" height="25%"/>'],
  },
  {
    id: 'atl', source: 'assets/images/atl/content/atl-flatbed-red.webp', generated: 'exec-07e77fcd-a457-495a-901d-bca848ee9b7c.png', output: 'atl-flatbed-red-clean.webp',
    shapes: ['<rect x="0%" y="38%" width="100%" height="12%"/>', '<rect x="0%" y="65%" width="100%" height="21%"/>'],
  },
  {
    id: 'nexdrive', source: 'assets/images/nexdrive/products/sany-heavy-commercial-truck.webp', generated: 'exec-f39351ad-ceb3-4371-b40c-cc84ef201571.png', output: 'nexdrive-heavy-commercial-truck-clean.webp',
    shapes: ['<rect x="0%" y="0%" width="100%" height="30%"/>', '<rect x="31%" y="44%" width="39%" height="24%"/>'],
  },
  {
    id: 'agro', source: 'assets/images/delivery/lake-agro/lake-agro-hero-desktop.webp', generated: 'exec-733bb2be-ad6e-4799-aa36-6fb30a7efb8f.png', output: 'lake-agro-hero-desktop-clean.webp',
    shapes: ['<rect x="48%" y="28%" width="37%" height="47%"/>'],
  },
];

await fs.mkdir(outputRoot, { recursive: true });

async function writeWebp(buffer, destination, width, height, fit = 'fill') {
  let quality = 86;
  let output;
  do {
    output = await sharp(buffer).resize(width, height, { fit, position: 'centre', withoutEnlargement: fit !== 'cover' }).webp({ quality, effort: 6 }).toBuffer();
    quality -= 4;
  } while (output.length > 500 * 1024 && quality >= 58);
  if (output.length > 500 * 1024) throw new Error(`${destination} remains above 500 KiB`);
  await fs.writeFile(destination, output);
  return { bytes: output.length, quality: quality + 4 };
}

const results = [];
for (const job of jobs) {
  const sourcePath = path.join(root, job.source);
  const generatedPath = path.join(generatedRoot, job.generated);
  const metadata = await sharp(sourcePath).metadata();
  const width = metadata.width;
  const height = metadata.height;
  const maskSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black"/>${job.shapes.map((shape) => shape.replace('/>', ' fill="white"/>')).join('')}</svg>`;
  const mask = await sharp(Buffer.from(maskSvg)).blur(2.2).removeAlpha().raw().toBuffer();
  const patch = await sharp(generatedPath).resize(width, height, { fit: 'fill' }).removeAlpha().joinChannel(mask, { raw: { width, height, channels: 1 } }).png().toBuffer();
  const composited = await sharp(sourcePath).composite([{ input: patch }]).png().toBuffer();
  const destination = path.join(outputRoot, job.output);
  const result = await writeWebp(composited, destination, width, height);
  results.push({ id: job.id, source: job.source, output: path.relative(root, destination).replaceAll('\\', '/'), width, height, ...result });

  if (job.id === 'automotive') {
    results.push({ id: 'automotive-960', output: 'assets/images/delivery/home/remediated/automotive-truck-lineup-clean-960.webp', width: 960, height: 537, ...await writeWebp(composited, path.join(outputRoot, 'automotive-truck-lineup-clean-960.webp'), 960, 537) });
    results.push({ id: 'automotive-thumb', output: 'assets/images/delivery/home/remediated/automotive-truck-lineup-clean-thumb.webp', width: 240, height: 140, ...await writeWebp(composited, path.join(outputRoot, 'automotive-truck-lineup-clean-thumb.webp'), 240, 140, 'cover') });
  }
  if (job.id === 'agro') {
    results.push({ id: 'agro-thumb', output: 'assets/images/delivery/home/remediated/lake-agro-hero-clean-thumb.webp', width: 240, height: 140, ...await writeWebp(composited, path.join(outputRoot, 'lake-agro-hero-clean-thumb.webp'), 240, 140, 'cover') });
  }
}

const tanksSource = path.join(root, 'assets/images/lake-pipes/new/tanks.webp');
const tanksMeta = await sharp(tanksSource).metadata();
const tanksDestination = path.join(outputRoot, 'lake-tanks-clean.webp');
results.push({ id: 'tanks', source: 'assets/images/lake-pipes/new/tanks.webp', output: 'assets/images/delivery/home/remediated/lake-tanks-clean.webp', width: tanksMeta.width, height: tanksMeta.height, ...await writeWebp(await fs.readFile(tanksSource), tanksDestination, tanksMeta.width, tanksMeta.height) });

await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(results, null, 2)}\n`);
const qaItems = results.filter((item) => !item.id.endsWith('-960') && !item.id.endsWith('-thumb'));
const tileWidth = 360;
const tileHeight = 250;
const captionHeight = 34;
const columns = 3;
const layers = [];
for (let index = 0; index < qaItems.length; index += 1) {
  const item = qaItems[index];
  const left = (index % columns) * tileWidth;
  const top = Math.floor(index / columns) * (tileHeight + captionHeight);
  const preview = await sharp(path.join(root, item.output)).resize(tileWidth, tileHeight, { fit: 'contain', background: '#11161c' }).png().toBuffer();
  const caption = Buffer.from(`<svg width="${tileWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0f14"/><text x="8" y="22" fill="white" font-family="Arial" font-size="13">${item.id} · ${Math.round(item.bytes / 1024)} KiB</text></svg>`);
  layers.push({ input: preview, left, top }, { input: caption, left, top: top + tileHeight });
}
const qaRows = Math.ceil(qaItems.length / columns);
const qaPath = path.join(root, 'docs/qa/sitewide-image-remediation/phase-01-home/home-remediated-assets.png');
await fs.mkdir(path.dirname(qaPath), { recursive: true });
await sharp({ create: { width: columns * tileWidth, height: qaRows * (tileHeight + captionHeight), channels: 4, background: '#0b0f14' } }).composite(layers).png().toFile(qaPath);
console.log(JSON.stringify(results, null, 2));
