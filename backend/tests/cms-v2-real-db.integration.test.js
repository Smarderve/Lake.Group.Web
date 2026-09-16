import { afterAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb } from '../src/db.js';
import { createCmsV2ReleaseStorage } from '../src/lib/cms-v2-release-storage.js';
import { createCmsV2RuntimeService } from '../src/lib/cms-v2-runtime-service.js';

const db = process.env.CMS_V2_TEST_DATABASE_URL ? createDb(process.env.CMS_V2_TEST_DATABASE_URL) : null;
const payload = (heading) => ({ hero: { heading, description: 'Fuel supply', image: 'assets/images/lake-aviation/hero.webp', alt: 'Aircraft' }, introduction: { heading: 'Introduction', body: 'Aviation operations.' }, cta: { label: 'Contact us', href: 'contact.html' }, seo: { title: heading, description: 'Fuel supply' } });

describe.skipIf(!db)('CMS V2 real PostgreSQL runtime', () => {
  let root; let service;
  afterAll(async () => { await db.$disconnect(); if (root && !process.env.CMS_V2_KEEP_ARTIFACT) await rm(root, { recursive: true, force: true }); });
  it('persists immutable A/B/C revisions and publishes a real static artifact', async () => {
    root = process.env.CMS_V2_ARTIFACT_ROOT || await mkdtemp(join(tmpdir(), 'lake-cms-v2-release-'));
    const run = String(Date.now());
    const user = await db.user.create({ data: { email: `cms-v2-${Date.now()}@test.invalid`, passwordHash: 'test-only', role: 'VIEWER', cmsAccessLevel: 'IT_ADMIN' } });
    service = createCmsV2RuntimeService({ db, storage: createCmsV2ReleaseStorage({ root }) });
    const a = await service.saveDraft({ key: 'lake-aviation', actorId: user.id, data: payload(`Lake Aviation A ${run}`) });
    const b = await service.saveDraft({ key: 'lake-aviation', actorId: user.id, baseRevisionId: a.id, data: payload(`Lake Aviation B ${run}`) });
    const c = await service.saveDraft({ key: 'lake-aviation', actorId: user.id, baseRevisionId: b.id, data: payload(`Lake Aviation C ${run}`) });
    expect((await db.contentRevision.findUnique({ where: { id: a.id } })).data.hero.heading).toBe(`Lake Aviation A ${run}`);
    expect((await db.contentRevision.findUnique({ where: { id: b.id } })).data.hero.heading).toBe(`Lake Aviation B ${run}`);
    expect((await service.readDocument('lake-aviation')).currentDraftRevisionId).toBe(c.id);
    await expect(service.saveDraft({ key: 'lake-aviation', actorId: user.id, baseRevisionId: a.id, data: payload('stale') })).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    const release = await service.publish({ key: 'lake-aviation', revisionId: c.id, actorId: user.id });
    const pointer = JSON.parse(await readFile(join(root, 'current.json'), 'utf8'));
    const artifact = JSON.parse(await readFile(join(root, pointer.snapshotUrl), 'utf8'));
    expect(pointer.releaseId).toBe(release.id);
    expect(artifact.releaseId).toBe(release.id);
    expect(artifact.integrity).toBe(release.integrity);
  });
});
