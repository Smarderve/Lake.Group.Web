import { describe, expect, it } from 'vitest';
import { createHardcodedTranslationRepository } from '../src/lib/hardcoded-translation-repository.js';

function fakeDatabase() {
  const rows = new Map();
  const memory = new Map();
  const jobs = {
    findMany: async ({ where }) => [...rows.values()].filter((row) => where.id?.in?.includes(row.id)).map(({ id, sourceHash, status }) => ({ id, sourceHash, status })),
    createMany: async ({ data }) => { let count = 0; for (const row of data) if (!rows.has(row.id)) { rows.set(row.id, structuredClone(row)); count += 1; } return { count }; },
    update: async ({ where, data }) => { const row = { ...rows.get(where.id), ...data }; rows.set(where.id, row); return row; },
    updateMany: async ({ where, data }) => { let count = 0; for (const row of rows.values()) if (where.id?.in?.includes(row.id) || where.manifestVersion?.not && row.manifestVersion !== where.manifestVersion.not) { Object.assign(row, data); count += 1; } return { count }; },
  };
  return {
    rows, memory,
    $transaction: async (work) => work({ hardcodedTranslationJob: jobs, hardcodedTranslationMemoryEntry: { findMany: async ({ where }) => [...memory.values()].filter((entry) => where.OR.some((candidate) => candidate.targetLanguage === entry.targetLanguage && candidate.sourceHash === entry.sourceHash && candidate.contextKey === entry.contextKey)) } }),
  };
}

const manifest = (source = 'Welcome') => ({
  schemaVersion: 1,
  manifestType: 'lake-group-hardcoded-translation-jobs',
  targetLanguages: ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'],
  entries: [{ id: 'welcome', file: 'index.html', page: 'index.html', applicablePages: ['index.html'], context: 'HTML h2', source, sourceHash: `hash-${source}`, classification: 'public-visitor-copy', targetSelector: 'h2:nth-of-type(1)', renderMode: 'text' }],
});

describe('hardcoded manifest durable queue sync', () => {
  it('deduplicates unchanged builds and replaces only source-changed work', async () => {
    const db = fakeDatabase();
    const repository = createHardcodedTranslationRepository(db);
    expect(await repository.syncHardcodedTranslationManifest(manifest())).toMatchObject({ created: 7, changed: 0, unchanged: 0 });
    expect(await repository.syncHardcodedTranslationManifest(manifest())).toMatchObject({ created: 0, changed: 0, unchanged: 7 });
    expect(await repository.syncHardcodedTranslationManifest(manifest('Welcome to Lake Group'))).toMatchObject({ created: 0, changed: 7, unchanged: 0 });
    expect([...db.rows.values()].every((row) => row.sourceText === 'Welcome to Lake Group' && row.status === 'WAITING_FOR_ENGINE')).toBe(true);
  });

  it('reuses approved exact-source/context memory and rejects unsupported locale manifests', async () => {
    const db = fakeDatabase();
    const repository = createHardcodedTranslationRepository(db);
    const first = manifest();
    await repository.syncHardcodedTranslationManifest(first);
    const job = [...db.rows.values()].find((row) => row.targetLanguage === 'fr');
    db.rows.set(job.id, { ...job, status: 'FAILED' });
    const memory = { ...job, translation: 'Bienvenue', modelVersion: 'approved-provider-version' };
    db.memory.set('memory', memory);
    await repository.syncHardcodedTranslationManifest({ ...first, generatedAt: 'later' });
    expect(db.rows.get(job.id)).toMatchObject({ translation: 'Bienvenue', modelVersion: 'approved-provider-version', status: 'APPROVED' });
    await expect(repository.syncHardcodedTranslationManifest({ ...first, targetLanguages: ['sw'] })).rejects.toMatchObject({ code: 'INVALID_TRANSLATION_MANIFEST' });
  });
});
