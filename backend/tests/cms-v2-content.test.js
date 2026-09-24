import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CMS_V2_DOCUMENTS, CMS_V2_PAGE_DEFINITIONS, contentIntegrity, createContentReleaseService } from '../src/lib/cms-v2-content.js';

const content = (heading = 'Lake Aviation') => ({
  hero: { heading, description: 'Fuel supply', image: '/hero.webp', alt: 'Aircraft' },
  introduction: { heading: 'Introduction', body: 'Aviation operations.' },
  cta: { label: 'Contact us', href: '/contact.html' },
  seo: { title: heading, description: 'Aviation fuel.' },
});

function memoryRepository() {
  const documents = new Map(); const revisions = new Map(); const releases = [];
  return {
    getDocument: async (key) => documents.get(key) ?? null,
    saveDocument: async (document) => { const next = { ...(documents.get(document.key) ?? {}), ...document }; documents.set(document.key, next); return next; },
    saveRevision: async (revision) => { revisions.set(revision.id, revision); return revision; },
    getRevision: async (id) => revisions.get(id) ?? null,
    listRevisions: async (key) => [...revisions.values()].filter((revision) => revision.key === key).reverse(),
    saveRelease: async (release) => { releases.push(release); return release; },
    listReleases: async () => [...releases].reverse(),
  };
}

describe('CMS V2 Lake Aviation pilot service', () => {
  it('registers the active public page inventory plus shared content documents', () => {
    const sitemap = readFileSync(new URL('../../sitemap.xml', import.meta.url), 'utf8');
    const activeRoutes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname.replace(/^\/$/, '/index.html').slice(1));
    expect(CMS_V2_PAGE_DEFINITIONS.map((page) => page.route)).toEqual(expect.arrayContaining(activeRoutes));
    expect(CMS_V2_DOCUMENTS.home.kind).toBe('page');
    expect(CMS_V2_DOCUMENTS['lake-agro'].kind).toBe('page');
    expect(CMS_V2_DOCUMENTS.global.kind).toBe('global');
    expect(CMS_V2_DOCUMENTS.companies.kind).toBe('companies');
    expect(CMS_V2_DOCUMENTS['business-verticals'].kind).toBe('verticals');
  });
  it('creates immutable drafts and rejects a stale save', async () => {
    const service = createContentReleaseService({ repository: memoryRepository(), writePointer: async () => {}, id: (() => { let i = 0; return (prefix) => `${prefix}-${++i}`; })() });
    const first = await service.saveDraft({ key: 'lake-aviation', actorId: 'it', data: content('First') });
    const second = await service.saveDraft({ key: 'lake-aviation', actorId: 'it', baseRevisionId: first.id, data: content('Second') });
    expect(second.id).not.toBe(first.id);
    await expect(service.saveDraft({ key: 'lake-aviation', actorId: 'it', baseRevisionId: first.id, data: content('Stale') })).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  });

  it('keeps the prior public pointer when publication fails', async () => {
    let pointer = { releaseId: 'known-good' };
    const service = createContentReleaseService({ repository: memoryRepository(), writePointer: async () => { throw Object.assign(new Error('storage unavailable'), { code: 'STORAGE_FAILED' }); } });
    const draft = await service.saveDraft({ key: 'lake-aviation', actorId: 'it', data: content() });
    await expect(service.publish({ key: 'lake-aviation', revisionId: draft.id, actorId: 'it' })).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
    expect(pointer.releaseId).toBe('known-good');
  });

  it('restores historical content by creating a new draft without publishing', async () => {
    let writes = 0;
    const service = createContentReleaseService({ repository: memoryRepository(), writePointer: async () => { writes += 1; }, id: (() => { let i = 0; return (prefix) => `${prefix}-${++i}`; })() });
    const first = await service.saveDraft({ key: 'lake-aviation', actorId: 'it', data: content('Original') });
    await service.saveDraft({ key: 'lake-aviation', actorId: 'it', baseRevisionId: first.id, data: content('Changed') });
    const restored = await service.restoreRevision({ key: 'lake-aviation', revisionId: first.id, actorId: 'it' });
    expect(restored.id).not.toBe(first.id); expect(restored.data.hero.heading).toBe('Original'); expect(writes).toBe(0);
  });

  it('preserves other published pages and restores an older release over an existing draft', async () => {
    const repository = memoryRepository();
    let published = null;
    let pointer = null;
    const service = createContentReleaseService({
      repository,
      readPublishedSnapshot: async () => published,
      writePointer: async (next, snapshot) => { pointer = next; published = structuredClone(snapshot); },
      id: (() => { let i = 0; return (prefix) => `${prefix}-${++i}`; })(),
    });
    const aviation = await service.saveDraft({ key: 'lake-aviation', actorId: 'it', data: content('Aviation first') });
    const firstRelease = await service.publish({ key: 'lake-aviation', revisionId: aviation.id, actorId: 'it' });
    const home = await service.saveDraft({ key: 'home', actorId: 'it', data: content('Home first') });
    await service.publish({ key: 'home', revisionId: home.id, actorId: 'it' });
    expect(Object.keys(published.documents).sort()).toEqual(['home', 'lake-aviation']);
    expect(contentIntegrity(published)).toBe(pointer.integrity);
    const newerDraft = await service.saveDraft({ key: 'lake-aviation', actorId: 'it', baseRevisionId: aviation.id, data: content('Aviation draft') });
    const restored = await service.restore({ releaseId: firstRelease.id, actorId: 'it' });
    expect(restored.restoredFromReleaseId).toBe(firstRelease.id);
    expect((await service.readDocument('lake-aviation')).currentDraftRevisionId).not.toBe(newerDraft.id);
    expect(published.documents['lake-aviation'].hero.heading).toBe('Aviation first');
    expect(published.documents.home.hero.heading).toBe('Home first');
    expect(contentIntegrity(published)).toBe(pointer.integrity);
  });

  it('blocks a release with an unsafe public destination', async () => {
    let writes = 0;
    const service = createContentReleaseService({ repository: memoryRepository(), writePointer: async () => { writes += 1; } });
    const unsafe = content('Unsafe'); unsafe.cta.href = 'javascript:alert(1)';
    const draft = await service.saveDraft({ key: 'lake-aviation', actorId: 'it', data: unsafe });
    await expect(service.publish({ key: 'lake-aviation', revisionId: draft.id, actorId: 'it' })).rejects.toMatchObject({ code: 'PREPUBLISH_VALIDATION_FAILED' });
    expect(writes).toBe(0);
  });
});
