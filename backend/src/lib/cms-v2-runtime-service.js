import { createCmsV2PrismaRepository } from './cms-v2-prisma-repository.js';
import { contentIntegrity, createContentReleaseService } from './cms-v2-content.js';
import { writeAudit } from './audit.js';
import { createPageSourceReader } from './cms-v2-page-source.js';

export function createCmsV2RuntimeService({ db, storage, logger, publicSiteOrigin }) {
  const repository = createCmsV2PrismaRepository(db);
  const service = createContentReleaseService({
    repository,
    readPublishedSnapshot: async () => {
      let pointer;
      try { pointer = await storage.readCurrent(); }
      catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
      if (pointer.schemaVersion !== 2) throw Object.assign(new Error('CMS V2 release storage overlaps another public snapshot namespace'), { code: 'RELEASE_NAMESPACE_CONFLICT' });
      const stored = await storage.readRelease(pointer.releaseId);
      if (stored.schemaVersion !== 1 || !stored.documents || typeof stored.documents !== 'object') throw Object.assign(new Error('Current CMS V2 release is invalid'), { code: 'INTEGRITY_MISMATCH' });
      const snapshot = { schemaVersion: stored.schemaVersion, documents: stored.documents };
      if (contentIntegrity(snapshot) !== pointer.integrity) throw Object.assign(new Error('Current release integrity verification failed'), { code: 'INTEGRITY_MISMATCH' });
      return snapshot;
    },
    writePointer: async (pointer, snapshot) => {
      const id = pointer.releaseId;
      await storage.writeRelease(id, { releaseId: id, integrity: pointer.integrity, ...snapshot });
      const written = await storage.readRelease(id);
      if (written.integrity !== pointer.integrity) throw Object.assign(new Error('Release integrity verification failed'), { code: 'INTEGRITY_MISMATCH' });
      await storage.replaceCurrent({ schemaVersion: 2, ...pointer, publishedAt: new Date().toISOString(), snapshotUrl: `releases/${id}/content.json` });
    },
  });
  return {
    ...service,
    readPageSource: createPageSourceReader({ siteOrigin: publicSiteOrigin }),
    async readDeploymentBundle() {
      const pointer = await storage.readCurrent();
      if (pointer.schemaVersion !== 2) throw Object.assign(new Error('Current CMS V2 pointer is invalid'), { code: 'INTEGRITY_MISMATCH' });
      const snapshot = await storage.readRelease(pointer.releaseId);
      const content = { schemaVersion: snapshot.schemaVersion, documents: snapshot.documents };
      if (pointer.integrity !== snapshot.integrity || contentIntegrity(content) !== pointer.integrity) throw Object.assign(new Error('Current CMS V2 release integrity verification failed'), { code: 'INTEGRITY_MISMATCH' });
      return { pointer, snapshot };
    },
    async saveDraft(input) { const revision = await service.saveDraft(input); await writeAudit(db, { actorId: input.actorId, action: 'CMS_V2_DRAFT_SAVED', resource: `admin/v2/content/${input.key}`, metadata: { revisionId: revision.id } }, logger); return revision; },
    async publish(input) { const release = await service.publish(input); await db.publicationEvent.create({ data: { entityType: 'CMS_V2_DOCUMENT', entityId: input.key, action: 'PUBLISHED', actorId: input.actorId, metadata: { cmsV2ReleaseId: release.id } } }); await writeAudit(db, { actorId: input.actorId, action: 'CMS_V2_PUBLISHED', resource: 'admin/v2/releases', metadata: { releaseId: release.id, integrity: release.integrity } }, logger); return release; },
    async restoreRevision(input) { const revision = await service.restoreRevision(input); await writeAudit(db, { actorId: input.actorId, action: 'CMS_V2_REVISION_RESTORED', resource: `admin/v2/content/${input.key}`, metadata: { revisionId: revision.id, restoredRevisionId: input.revisionId } }, logger); return revision; },
  };
}
