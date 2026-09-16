/** Prisma adapter kept separate from CMS V2 domain/release logic. */
export function createCmsV2PrismaRepository(db) {
  if (!db) throw new TypeError('Prisma database is required');
  return {
    async getDocument(key) {
      const row = await db.contentDocument.findUnique({ where: { key }, include: { revisions: { orderBy: { createdAt: 'desc' }, take: 1 } } });
      if (!row) return null;
      const revisionById = async (id) => id ? db.contentRevision.findUnique({ where: { id } }) : null;
      return {
        ...row,
        currentDraftRevision: await revisionById(row.currentDraftRevisionId),
        currentPublishedRevision: await revisionById(row.currentPublishedRevisionId),
      };
    },
    async saveDocument(document) {
      const existing = await db.contentDocument.findUnique({ where: { key: document.key } });
      if (!existing) return db.contentDocument.create({ data: { key: document.key, schemaVersion: document.schemaVersion } });
      return db.contentDocument.update({ where: { key: document.key }, data: { currentDraftRevisionId: document.currentDraftRevisionId ?? existing.currentDraftRevisionId, currentPublishedRevisionId: document.currentPublishedRevisionId ?? existing.currentPublishedRevisionId } });
    },
    async saveRevision(revision) {
      const document = await db.contentDocument.findUnique({ where: { key: revision.key } });
      return db.contentRevision.create({ data: { id: revision.id, documentId: document.id, authorId: revision.actorId, schemaVersion: revision.schemaVersion, data: revision.data, createdAt: new Date(revision.createdAt) } });
    },
    async getRevision(id) {
      const revision = await db.contentRevision.findUnique({ where: { id }, include: { document: true } });
      return revision ? { ...revision, key: revision.document.key } : null;
    },
    async listRevisions(key) {
      const document = await db.contentDocument.findUnique({ where: { key } });
      if (!document) return [];
      return db.contentRevision.findMany({ where: { documentId: document.id }, orderBy: { createdAt: 'desc' } });
    },
    async saveRelease(release) {
      const document = await db.contentDocument.findUnique({ where: { key: release.key } });
      return db.cmsRelease.create({ data: {
        id: release.id, integrity: release.integrity, manifest: release.snapshot, publishedById: release.actorId, restoredFromReleaseId: release.restoredFromReleaseId, publishedAt: new Date(release.publishedAt),
        documents: { create: { documentId: document.id, documentRevisionId: release.revisionId } },
      } });
    },
    async listReleases() { return db.cmsRelease.findMany({ orderBy: { publishedAt: 'desc' } }); },
  };
}
