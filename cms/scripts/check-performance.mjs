import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const dist = path.resolve('dist');
const indexHtml = await readFile(path.join(dist, 'index.html'), 'utf8');
const entryMatch = indexHtml.match(/<script[^>]+src="\/(assets\/[^"]+\.js)"/);
if (!entryMatch) throw new Error('Could not find the production entry script in dist/index.html');

const entryPath = path.join(dist, entryMatch[1]);
const entry = await readFile(entryPath);
const entryRaw = entry.byteLength;
const entryGzip = gzipSync(entry).byteLength;
const assets = await readdir(path.join(dist, 'assets'));
const jsChunks = assets.filter((name) => name.endsWith('.js'));
const cssBytes = (
  await Promise.all(
    assets
      .filter((name) => name.endsWith('.css'))
      .map(async (name) => (await stat(path.join(dist, 'assets', name))).size),
  )
).reduce((sum, size) => sum + size, 0);

const failures = [];
if (entryRaw > 350 * 1024) failures.push(`entry JavaScript is ${(entryRaw / 1024).toFixed(1)} KiB raw (budget: 350 KiB)`);
if (entryGzip > 120 * 1024) failures.push(`entry JavaScript is ${(entryGzip / 1024).toFixed(1)} KiB gzip (budget: 120 KiB)`);
if (cssBytes > 100 * 1024) failures.push(`CSS is ${(cssBytes / 1024).toFixed(1)} KiB raw (budget: 100 KiB)`);
if (jsChunks.length < 10) failures.push(`found ${jsChunks.length} JavaScript chunk(s); route splitting requires at least 10`);

if (failures.length) {
  console.error(`CMS performance budget failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(
    `CMS performance budget passed: entry ${(entryRaw / 1024).toFixed(1)} KiB raw / ${(entryGzip / 1024).toFixed(1)} KiB gzip, ${jsChunks.length} JS chunks, ${(cssBytes / 1024).toFixed(1)} KiB CSS.`,
  );
}
