import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCmsV2ReleaseStorage } from '../src/lib/cms-v2-release-storage.js';

const created = [];
afterEach(async () => { await Promise.all(created.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('CMS V2 release namespace', () => {
  it('refuses to replace the existing public website snapshot pointer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lake-v2-storage-'));
    created.push(root);
    const original = JSON.stringify({ schemaVersion: 1, releaseId: 'legacy-site-release' });
    await writeFile(join(root, 'current.json'), original);
    const storage = createCmsV2ReleaseStorage({ root });
    await expect(storage.replaceCurrent({ schemaVersion: 2, releaseId: 'cms-release' })).rejects.toMatchObject({ code: 'RELEASE_NAMESPACE_CONFLICT' });
    expect(await readFile(join(root, 'current.json'), 'utf8')).toBe(original);
  });
});
