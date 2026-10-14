import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createHardcodedTranslationRelease } from '../scripts/publish-hardcoded-translations.js';
import { rollbackHardcodedTranslationRelease } from '../scripts/rollback-hardcoded-translations.js';

const source = 'Welcome to Lake Group';
const manifest = {
  schemaVersion: 1,
  manifestType: 'lake-group-hardcoded-translation-jobs',
  entries: [{ id: 'auto.welcome', context: 'heading', source, sourceHash: 'source-v1', classification: 'public-visitor-copy', page: 'index.html', renderMode: 'text', targetSelector: 'h1:nth-of-type(1)' }],
};
const manifestVersion = createHash('sha256').update(JSON.stringify(manifest.entries.map(({ id, sourceHash }) => [id, sourceHash]))).digest('hex');
const job = (translation, modelVersion = 'fixture-test-only') => ({
  contextKey: 'auto.welcome:heading', targetLanguage: 'fr', status: 'APPROVED', manifestVersion,
  sourceHash: 'source-v1', sourceText: source, translation, modelVersion,
});
let root;

afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); root = null; });

describe('hardcoded translation release publication', () => {
  it('keeps fixture output unpublished unless the test-only switch is explicit', async () => {
    root = await mkdtemp(join(tmpdir(), 'lake-i18n-release-'));
    const pointer = await createHardcodedTranslationRelease({ manifest, jobs: [job('Bienvenue Lake Group')], outputDirectory: root });
    expect(pointer.activeLanguages).toEqual(['en']);
    expect(pointer.files).toEqual({});
  });

  it('publishes validated approved content atomically and can restore a previous release', async () => {
    root = await mkdtemp(join(tmpdir(), 'lake-i18n-release-'));
    const first = await createHardcodedTranslationRelease({ manifest, jobs: [job('Bienvenue Lake Group')], outputDirectory: root, allowFixturesForTests: true });
    expect(first.activeLanguages).toEqual(['en', 'fr']);
    const asset = JSON.parse(await readFile(join(root, first.files.fr), 'utf8'));
    expect(asset.pages['index.html'][0]).toMatchObject({ source, translation: 'Bienvenue Lake Group', mode: 'text' });
    const second = await createHardcodedTranslationRelease({ manifest: { ...manifest, generatedAt: 'next' }, jobs: [], outputDirectory: root });
    expect(second.activeLanguages).toEqual(['en']);
    const restored = await rollbackHardcodedTranslationRelease({ outputDirectory: root, releaseId: first.releaseId });
    expect(restored).toMatchObject(first);
    expect(JSON.parse(await readFile(join(root, 'current.json'), 'utf8')).releaseId).toBe(first.releaseId);
  });

  it('does not activate a locale for a translation that changes a protected company name', async () => {
    root = await mkdtemp(join(tmpdir(), 'lake-i18n-release-'));
    const pointer = await createHardcodedTranslationRelease({ manifest, jobs: [job('Bienvenue au groupe')], outputDirectory: root, allowFixturesForTests: true });
    expect(pointer.activeLanguages).toEqual(['en']);
  });
});
