import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';

function storageError(code, message) { return Object.assign(new Error(message), { code }); }
async function exists(file) { try { await access(file, constants.F_OK); return true; } catch { return false; } }

/** Filesystem implementation for the static public-content contract. */
export function createCmsV2ReleaseStorage({ root }) {
  if (!root) throw new TypeError('release storage root is required');
  const releasePath = (id) => join(root, 'releases', id, 'content.json');
  return {
    async writeRelease(releaseId, snapshot) {
      const target = releasePath(releaseId);
      if (await exists(target)) throw storageError('RELEASE_EXISTS', 'Release artifacts are immutable.');
      const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
      await mkdir(dirname(target), { recursive: true });
      try {
        await writeFile(temporary, `${JSON.stringify(snapshot)}\n`, { encoding: 'utf8', flag: 'wx' });
        await rename(temporary, target);
      } catch (error) { await rm(temporary, { force: true }); throw error; }
      return target;
    },
    async readRelease(releaseId) { return JSON.parse(await readFile(releasePath(releaseId), 'utf8')); },
    async readCurrent() { return JSON.parse(await readFile(join(root, 'current.json'), 'utf8')); },
    async replaceCurrent(pointer) {
      const target = join(root, 'current.json');
      const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
      await mkdir(root, { recursive: true });
      try {
        await writeFile(temporary, `${JSON.stringify(pointer)}\n`, { encoding: 'utf8', flag: 'wx' });
        await rename(temporary, target);
      } catch (error) { await rm(temporary, { force: true }); throw error; }
    },
  };
}
