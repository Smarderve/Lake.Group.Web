import { createHash } from 'node:crypto';
import { z } from 'zod';

export const CMS_V2_DOCUMENTS = Object.freeze({
  'lake-aviation': {
    schemaVersion: 1,
    schema: z.object({
      hero: z.object({ heading: z.string().min(1).max(160), description: z.string().min(1).max(500), image: z.string().min(1).max(1000), alt: z.string().max(250).optional() }),
      introduction: z.object({ heading: z.string().min(1).max(200), body: z.string().min(1).max(4000) }),
      cta: z.object({ label: z.string().min(1).max(80), href: z.string().min(1).max(500) }),
      seo: z.object({ title: z.string().min(1).max(160), description: z.string().min(1).max(320) }),
    }).strict(),
  },
});

function fault(code, message) {
  return Object.assign(new Error(message), { code });
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

export function contentIntegrity(snapshot) {
  return `sha256-${createHash('sha256').update(JSON.stringify(canonical(snapshot))).digest('base64')}`;
}

export function createContentReleaseService({ repository, writePointer, now = () => new Date(), id = (prefix) => `${prefix}_${crypto.randomUUID()}` } = {}) {
  if (!repository || !writePointer) throw new TypeError('repository and writePointer are required');

  async function saveDraft({ key, actorId, baseRevisionId = null, data }) {
    const definition = CMS_V2_DOCUMENTS[key];
    if (!definition) throw fault('INVALID_CONTENT_DOCUMENT', 'This content document is not approved for CMS V2.');
    const parsed = definition.schema.safeParse(data);
    if (!parsed.success) throw fault('INVALID_CONTENT_PAYLOAD', 'Content does not satisfy the approved document schema.');
    const document = (await repository.getDocument(key)) ?? { key, schemaVersion: definition.schemaVersion, currentDraftRevisionId: null, currentPublishedRevisionId: null };
    if (baseRevisionId && document.currentDraftRevisionId && baseRevisionId !== document.currentDraftRevisionId) {
      throw fault('REVISION_CONFLICT', 'The content draft changed before this update.');
    }
    await repository.saveDocument(document);
    const revision = {
      id: id('revision'), key, schemaVersion: definition.schemaVersion, actorId, data: structuredClone(parsed.data),
      createdAt: now().toISOString(),
    };
    await repository.saveRevision(revision);
    await repository.saveDocument({ ...(await repository.getDocument(key)), currentDraftRevisionId: revision.id, updatedAt: revision.createdAt });
    return revision;
  }

  async function publish({ key, revisionId, actorId, restoredFromReleaseId = null }) {
    const definition = CMS_V2_DOCUMENTS[key];
    if (!definition) throw fault('INVALID_CONTENT_DOCUMENT', 'This content document is not approved for CMS V2.');
    const revision = await repository.getRevision(revisionId);
    if (!revision || revision.key !== key) throw fault('REVISION_NOT_FOUND', 'The selected content revision does not exist.');
    const snapshot = { schemaVersion: definition.schemaVersion, documents: { [key]: structuredClone(revision.data) } };
    const integrity = contentIntegrity(snapshot);
    const release = { id: id('release'), key, revisionId, actorId, restoredFromReleaseId, snapshot, integrity, publishedAt: now().toISOString() };
    await repository.saveRelease(release);
    // The pointer is written last: a reader observes either the prior complete
    // release or this complete release, never a partially assembled snapshot.
    await writePointer({ releaseId: release.id, integrity }, snapshot);
    const document = await repository.getDocument(key);
    await repository.saveDocument({ ...document, currentPublishedRevisionId: revisionId, updatedAt: release.publishedAt });
    return release;
  }

  async function restore({ releaseId, actorId }) {
    const releases = await repository.listReleases();
    const prior = releases.find((release) => release.id === releaseId);
    if (!prior) throw fault('RELEASE_NOT_FOUND', 'The selected release does not exist.');
    const key = prior.key;
    const draft = await saveDraft({ key, actorId, data: prior.snapshot.documents[key] });
    return publish({ key, revisionId: draft.id, actorId, restoredFromReleaseId: releaseId });
  }

  async function readDocument(key) {
    if (!CMS_V2_DOCUMENTS[key]) throw fault('INVALID_CONTENT_DOCUMENT', 'This content document is not approved for CMS V2.');
    const document = await repository.getDocument(key);
    if (!document) return { key, schemaVersion: CMS_V2_DOCUMENTS[key].schemaVersion, currentDraftRevision: null, currentPublishedRevision: null };
    return document;
  }
  return { saveDraft, publish, restore, readDocument, listRevisions: (key) => repository.listRevisions?.(key) ?? [], listReleases: () => repository.listReleases() };
}
