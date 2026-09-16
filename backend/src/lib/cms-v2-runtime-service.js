import { createCmsV2PrismaRepository } from './cms-v2-prisma-repository.js';
import { createContentReleaseService } from './cms-v2-content.js';
import { writeAudit } from './audit.js';

export function createCmsV2RuntimeService({ db, storage, logger }) {
  const repository = createCmsV2PrismaRepository(db);
  const service = createContentReleaseService({
    repository,
    writePointer: async (pointer, snapshot) => {
      const id = pointer.releaseId;
      // Preserve the existing static public snapshot when present: CMS V2
      // adds its approved document rather than erasing legacy public data.
      let previous = {};
      try { const current = await storage.readCurrent(); previous = await storage.readRelease(current.releaseId); } catch { /* first V2 artifact */ }
      await storage.writeRelease(id, { ...previous, releaseId: id, integrity: pointer.integrity, ...snapshot, documents: snapshot.documents });
      const written = await storage.readRelease(id);
      if (written.integrity !== pointer.integrity) throw Object.assign(new Error('Release integrity verification failed'), { code: 'INTEGRITY_MISMATCH' });
      await storage.replaceCurrent({ schemaVersion: 2, ...pointer, publishedAt: new Date().toISOString(), snapshotUrl: `releases/${id}/content.json` });
    },
  });
  return {
    ...service,
    async saveDraft(input) { const revision = await service.saveDraft(input); await writeAudit(db, { actorId: input.actorId, action: 'CMS_V2_DRAFT_SAVED', resource: `admin/v2/content/${input.key}`, metadata: { revisionId: revision.id } }, logger); return revision; },
    async publish(input) { const release = await service.publish(input); await writeAudit(db, { actorId: input.actorId, action: 'CMS_V2_PUBLISHED', resource: 'admin/v2/releases', metadata: { releaseId: release.id, integrity: release.integrity } }, logger); return release; },
  };
}
