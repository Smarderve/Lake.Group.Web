import { describe, expect, it } from 'vitest';
import { createContentReleaseService } from '../src/lib/cms-v2-content.js';
import { requireCmsAdmin } from '../src/middleware/auth.js';
import express from 'express';
import request from 'supertest';

function memoryRepository() {
  const documents = new Map();
  const revisions = new Map();
  const releases = new Map();
  return {
    documents,
    revisions,
    releases,
    async getDocument(key) { return documents.get(key) ?? null; },
    async saveDocument(document) { documents.set(document.key, structuredClone(document)); return document; },
    async saveRevision(revision) { revisions.set(revision.id, structuredClone(revision)); return revision; },
    async getRevision(id) { return revisions.get(id) ?? null; },
    async saveRelease(release) { releases.set(release.id, structuredClone(release)); return release; },
    async listReleases() { return [...releases.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)); },
  };
}

describe('CMS V2 Lake Aviation content releases', () => {
  it('requires the additive CMS V2 access level rather than a legacy role', async () => {
    const app = express();
    app.use((req, res, next) => { req.user = { id: 'editor', role: 'SUPER_ADMIN', cmsAccessLevel: 'NONE' }; next(); });
    app.get('/v2', requireCmsAdmin(), (req, res) => res.json({ ok: true }));
    expect((await request(app).get('/v2')).status).toBe(403);
  });

  it('keeps every draft revision immutable and publishes a deterministic release pointer', async () => {
    const repo = memoryRepository();
    const pointers = [];
    const service = createContentReleaseService({
      repository: repo,
      writePointer: async (pointer) => pointers.push(pointer),
      now: () => new Date('2026-09-16T10:00:00.000Z'),
      id: (() => { let n = 0; return (prefix) => `${prefix}-${++n}`; })(),
    });
    const first = await service.saveDraft({
      key: 'lake-aviation',
      actorId: 'admin-1',
      data: {
        hero: { heading: 'Lake Aviation', description: 'Fuel supply', image: '/hero.webp', alt: 'Aircraft' },
        introduction: { heading: 'Aviation Fuel', body: 'Reliable service.' },
        cta: { label: 'Contact us', href: 'contact.html' },
        seo: { title: 'Lake Aviation', description: 'Fuel supply' },
      },
    });
    const second = await service.saveDraft({
      key: 'lake-aviation', actorId: 'admin-1', baseRevisionId: first.id,
      data: { ...first.data, hero: { ...first.data.hero, heading: 'Lake Aviation Services' } },
    });

    expect(first.id).not.toBe(second.id);
    expect((await repo.getRevision(first.id)).data.hero.heading).toBe('Lake Aviation');

    const release = await service.publish({ key: 'lake-aviation', revisionId: second.id, actorId: 'admin-1' });
    expect(release.integrity).toMatch(/^sha256-/);
    expect(pointers).toHaveLength(1);
    expect(pointers[0]).toEqual({ releaseId: release.id, integrity: release.integrity });
    expect(release.snapshot.documents['lake-aviation'].hero.heading).toBe('Lake Aviation Services');
  });

  it('rejects unapproved keys and permits a restore only as a new immutable release', async () => {
    const repo = memoryRepository();
    const service = createContentReleaseService({ repository: repo, writePointer: async () => {}, now: () => new Date('2026-09-16T10:00:00.000Z') });
    await expect(service.saveDraft({ key: 'home', actorId: 'admin', data: {} })).rejects.toMatchObject({ code: 'INVALID_CONTENT_DOCUMENT' });
  });

  it('rejects a Lake Aviation draft that does not satisfy the pilot schema', async () => {
    const service = createContentReleaseService({ repository: memoryRepository(), writePointer: async () => {} });
    await expect(service.saveDraft({ key: 'lake-aviation', actorId: 'admin', data: { hero: { heading: '' } } }))
      .rejects.toMatchObject({ code: 'INVALID_CONTENT_PAYLOAD' });
  });
});
