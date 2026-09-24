import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const generatedRoot = 'C:/Users/USER/.codex/generated_images/01a0855e-b267-70e0-9b57-80709917b26a';
const outputRoot = path.join(root, 'assets/images/delivery/aficd/remediated');
const jobs = [
  {
    id: 'container-handling',
    source: 'assets/images/aficd/operations/aficd-container-handling.webp',
    generated: 'exec-e92f74a5-b6f5-4a2f-87d9-bc222fddbcb1.png',
    output: 'aficd-container-handling-clean.webp',
    mask: '<rect x="0%" y="35%" width="54%" height="43%" fill="white"/><rect x="36%" y="0%" width="64%" height="88%" fill="white"/><rect x="46%" y="42%" width="18%" height="18%" fill="black"/>',
  },
  {
    id: 'reach-stacker',
    source: 'assets/images/aficd/operations/aficd-sany-reach-stacker.webp',
    generated: 'exec-4730f454-7220-4262-9e55-32e84d7ab3e0.png',
    output: 'aficd-reach-stacker-clean.webp',
    mask: '<rect x="0%" y="14%" width="100%" height="83%" fill="white"/><rect x="51%" y="62%" width="10%" height="17%" fill="black"/>',
  },
  {
    id: 'truck-loading',
    source: 'assets/images/aficd/operations/aficd-truck-loading.webp',
    generated: 'exec-2cfbc2cf-3722-418c-811e-73619abb1f0a.png',
    output: 'aficd-truck-loading-clean.webp',
    mask: '<rect x="0%" y="0%" width="100%" height="70%" fill="white"/><rect x="42%" y="38%" width="14%" height="19%" fill="black"/>',
  },
  {
    id: 'yard-lift',
    source: 'assets/images/aficd/operations/aficd-yard-lift.webp',
    generated: 'exec-37cc3ed2-496f-4613-84cc-7cfc8c4557e5.png',
    output: 'aficd-yard-lift-clean.webp',
    mask: '<rect x="0%" y="12%" width="100%" height="78%" fill="white"/><rect x="37%" y="57%" width="10%" height="15%" fill="black"/>',
  },
  {
    id: 'yard',
    source: 'assets/images/aficd/operations/aficd-yard.webp',
    generated: 'exec-1f28f8a9-d428-40c4-8dd9-331a326cd0bb.png',
    output: 'aficd-yard-clean.webp',
    mask: '<rect x="7%" y="14%" width="93%" height="72%" fill="white"/><rect x="18%" y="54%" width="10%" height="16%" fill="black"/>',
  },
];

await fs.mkdir(outputRoot, { recursive: true });

async function encode(input, destination, width, height) {
  let quality = 86;
  let output;
  do {
    output = await sharp(input).resize(width, height, { fit: 'fill', withoutEnlargement: true }).webp({ quality, effort: 6 }).toBuffer();
    quality -= 4;
  } while (output.length > 500 * 1024 && quality >= 58);
  if (output.length > 500 * 1024) throw new Error(`${destination} exceeds 500 KiB`);
  await fs.writeFile(destination, output);
  return { bytes: output.length, quality: quality + 4 };
}

const results = [];
for (const job of jobs) {
  const sourcePath = path.join(root, job.source);
  const { width, height } = await sharp(sourcePath).metadata();
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="black"/>${job.mask}</svg>`;
  const mask = await sharp(Buffer.from(svg)).blur(2).removeAlpha().raw().toBuffer();
  const patch = await sharp(path.join(generatedRoot, job.generated)).resize(width, height, { fit: 'fill' }).removeAlpha().joinChannel(mask, { raw: { width, height, channels: 1 } }).png().toBuffer();
  const composited = await sharp(sourcePath).composite([{ input: patch }]).png().toBuffer();
  const destination = path.join(outputRoot, job.output);
  results.push({ id: job.id, source: job.source, output: path.relative(root, destination).replaceAll('\\', '/'), width, height, ...await encode(composited, destination, width, height) });
}

await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(results, null, 2)}\n`);
const tileWidth = 420;
const tileHeight = 280;
const captionHeight = 34;
const columns = 2;
const layers = [];
for (let index = 0; index < results.length; index += 1) {
  const item = results[index];
  const left = (index % columns) * tileWidth;
  const top = Math.floor(index / columns) * (tileHeight + captionHeight);
  const preview = await sharp(path.join(root, item.output)).resize(tileWidth, tileHeight, { fit: 'contain', background: '#11161c' }).png().toBuffer();
  const caption = Buffer.from(`<svg width="${tileWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0f14"/><text x="9" y="22" fill="white" font-family="Arial" font-size="13">${item.id} · ${Math.round(item.bytes / 1024)} KiB</text></svg>`);
  layers.push({ input: preview, left, top }, { input: caption, left, top: top + tileHeight });
}
const qaPath = path.join(root, 'docs/qa/sitewide-image-remediation/phase-06-lake-aviation-aficd/aficd-remediated-assets.png');
await fs.mkdir(path.dirname(qaPath), { recursive: true });
await sharp({ create: { width: columns * tileWidth, height: Math.ceil(results.length / columns) * (tileHeight + captionHeight), channels: 4, background: '#0b0f14' } }).composite(layers).png().toFile(qaPath);
console.log(JSON.stringify(results, null, 2));
