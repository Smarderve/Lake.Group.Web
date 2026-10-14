import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function rollbackHardcodedTranslationRelease({ outputDirectory, releaseId }) {
  if (!/^[a-f0-9]{24}$/.test(releaseId || '')) throw new Error('A valid immutable release ID is required.');
  const root = resolve(outputDirectory);
  const pointer = JSON.parse(await readFile(join(root, 'releases', releaseId, 'current.json'), 'utf8'));
  if (pointer.releaseId !== releaseId || pointer.schemaVersion !== 1) throw new Error('Release pointer identity mismatch.');
  for (const file of Object.values(pointer.files)) {
    if (typeof file !== 'string' || !file.startsWith(`releases/${releaseId}/`)) throw new Error('Release asset path failed validation.');
    await readFile(join(root, file), 'utf8');
  }
  const target = join(root, 'current.json');
  const temporary = join(root, `.current-rollback-${process.pid}-${Date.now()}.json`);
  await writeFile(temporary, `${JSON.stringify(pointer)}\n`, { flag: 'wx' });
  await rename(temporary, target);
  return pointer;
}

async function run() {
  const outputDirectory = resolve(process.argv[2] || '../assets/i18n-published');
  const releaseId = process.argv[3];
  const pointer = await rollbackHardcodedTranslationRelease({ outputDirectory, releaseId });
  console.log(JSON.stringify({ releaseId: pointer.releaseId, activeLanguages: pointer.activeLanguages, rollback: 'atomic-pointer' }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
