import { createHash } from 'node:crypto';
import { z } from 'zod';

const text = (maximum) => z.string().trim().min(1).max(maximum);
const url = text(1000);
const seo = z.object({ title: text(160), description: text(320), canonical: z.string().max(1000).optional(), socialImage: z.string().max(1000).optional(), index: z.boolean().default(true) }).strict();
const pageSchema = z.object({
  hero: z.object({ heading: text(160), description: text(1000), image: url, alt: z.string().max(250).optional() }).strict(),
  introduction: z.object({ heading: text(200), body: text(8000) }).strict(),
  cta: z.object({ label: text(80), href: url }).strict(),
  media: z.array(z.object({ src: url, alt: z.string().max(250), role: z.enum(['hero', 'gallery', 'inline']).default('inline') }).strict()).max(40).default([]),
  sections: z.array(z.object({ key: text(80), heading: text(200), body: text(8000) }).strict()).max(30).default([]),
  seo,
}).strict();
const globalSchema = z.object({
  organization: z.object({ name: text(120), description: text(1000), headquarters: text(500), email: text(250), phone: text(100) }).strict(),
  statistics: z.array(z.object({ label: text(100), value: text(100), scope: text(120) }).strict()).min(1).max(20),
  socialLinks: z.array(z.object({ label: text(80), href: url }).strict()).max(12).default([]),
}).strict();
const companiesSchema = z.object({ companies: z.array(z.object({ name: text(140), shortName: text(80), vertical: text(100), route: text(300), logo: z.string().max(1000).optional(), description: text(1000), country: z.string().max(120).optional(), active: z.boolean() }).strict()).min(1).max(60) }).strict();
const verticalsSchema = z.object({ verticals: z.array(z.object({ name: text(100), description: text(1000), companies: z.array(text(140)).max(30) }).strict()).min(1).max(12) }).strict();

const PAGE_DEFINITIONS = [
  ['home', 'index.html', 'Home'], ['about', 'about.html', 'About'], ['leadership', 'leadership.html', 'Leadership'], ['contact', 'contact.html', 'Contact'], ['careers', 'careers.html', 'Careers'], ['csr', 'csr.html', 'CSR'], ['gallery', 'gallery.html', 'Gallery'], ['history', 'history.html', 'History'], ['media-center', 'media-center.html', 'Media Center'], ['sustainability', 'sustainability.html', 'Sustainability'],
  ['lake-oil', 'lake-oil.html', 'Lake Oil'], ['lake-aviation', 'lake-aviation.html', 'Lake Aviation'], ['lake-gas', 'lake-gas.html', 'Lake Gas'], ['lake-lubes', 'lake-lubes.html', 'Lake Lubes'], ['lake-steel', 'lake-steel.html', 'Lake Steel'], ['lake-trans', 'lake-trans.html', 'Lake Trans'], ['atl', 'atl.html', 'ATL'], ['aficd', 'aficd.html', 'AFICD'], ['aill', 'aill.html', 'AILL'], ['acfs', 'acfs.html', 'ACFS'], ['assembly-tech', 'assembly-tech.html', 'Assembly Tech'], ['cross-country', 'cross-country.html', 'Cross Country'], ['gulf-aggregates', 'gulf-aggregates.html', 'Gulf Aggregates'], ['lake-agro', 'lake-agro.html', 'Lake Agro'], ['agrinova-tech', 'agrinova-tech.html', 'Agrinova Tech'], ['nextdrive-motors', 'nextdrive-motors.html', 'NextDrive Motors'], ['lake-buildings', 'lake-buildings.html', 'Lake Buildings'], ['lake-cylinders', 'lake-cylinders.html', 'Lake Cylinders'], ['lake-pipes', 'lake-pipes.html', 'Lake Pipes'], ['lake-premix-cement', 'lake-premix-cement.html', 'Lake Premix'], ['ocean-galleria', 'ocean-galleria.html', 'Ocean Galleria'], ['la-home', 'la-home.html', 'Lake Agro Home'], ['la-projects', 'la-projects.html', 'Lake Agro Projects'], ['fleet', 'fleet.html', 'Lake Trans Fleet'], ['station-locator', 'station-locator.html', 'Station Locator'],
];

/** Developer-owned registry. It deliberately contains content models only; no
 * DOM selectors, CSS, markup, or visual controls are CMS editable. */
export const CMS_V2_DOCUMENTS = Object.freeze({
  ...Object.fromEntries(PAGE_DEFINITIONS.map(([key, route, label]) => [key, { schemaVersion: 1, kind: 'page', label, route, schema: pageSchema }])),
  global: { schemaVersion: 1, kind: 'global', label: 'Global Content', schema: globalSchema },
  companies: { schemaVersion: 1, kind: 'companies', label: 'Companies', schema: companiesSchema },
  'business-verticals': { schemaVersion: 1, kind: 'verticals', label: 'Business Verticals', schema: verticalsSchema },
});

export const CMS_V2_PAGE_DEFINITIONS = Object.freeze(PAGE_DEFINITIONS.map(([key, route, label]) => Object.freeze({ key, route, label })));

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

export function createContentReleaseService({ repository, writePointer, readPublishedSnapshot = async () => null, now = () => new Date(), id = (prefix) => `${prefix}_${crypto.randomUUID()}` } = {}) {
  if (!repository || !writePointer) throw new TypeError('repository and writePointer are required');

  async function saveDraft({ key, actorId, baseRevisionId = null, data }) {
    const definition = CMS_V2_DOCUMENTS[key];
    if (!definition) throw fault('INVALID_CONTENT_DOCUMENT', 'This content document is not approved for CMS V2.');
    const parsed = definition.schema.safeParse(data);
    if (!parsed.success) throw fault('INVALID_CONTENT_PAYLOAD', 'Content does not satisfy the approved document schema.');
    const document = (await repository.getDocument(key)) ?? { key, schemaVersion: definition.schemaVersion, currentDraftRevisionId: null, currentPublishedRevisionId: null };
    if ((baseRevisionId ?? null) !== (document.currentDraftRevisionId ?? null)) {
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
    const previous = await readPublishedSnapshot();
    const snapshot = { schemaVersion: definition.schemaVersion, documents: { ...(previous?.documents ?? {}), [key]: structuredClone(revision.data) } };
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
    const current = await repository.getDocument(key);
    const draft = await saveDraft({ key, actorId, baseRevisionId: current?.currentDraftRevisionId ?? null, data: prior.snapshot.documents[key] });
    return publish({ key, revisionId: draft.id, actorId, restoredFromReleaseId: releaseId });
  }

  async function restoreRevision({ key, revisionId, actorId }) {
    const definition = CMS_V2_DOCUMENTS[key];
    if (!definition) throw fault('INVALID_CONTENT_DOCUMENT', 'This content document is not approved for CMS V2.');
    const revision = await repository.getRevision(revisionId);
    if (!revision || revision.key !== key) throw fault('REVISION_NOT_FOUND', 'The selected content revision does not exist.');
    // A restore is deliberately a new draft revision. Neither the selected
    // historical revision nor any immutable public release is mutated.
    const document = await repository.getDocument(key);
    return saveDraft({ key, actorId, baseRevisionId: document?.currentDraftRevisionId ?? null, data: structuredClone(revision.data) });
  }

  async function readDocument(key) {
    if (!CMS_V2_DOCUMENTS[key]) throw fault('INVALID_CONTENT_DOCUMENT', 'This content document is not approved for CMS V2.');
    const document = await repository.getDocument(key);
    if (!document) return { key, schemaVersion: CMS_V2_DOCUMENTS[key].schemaVersion, currentDraftRevision: null, currentPublishedRevision: null };
    return document;
  }
  return { saveDraft, publish, restore, restoreRevision, readDocument, listRevisions: (key) => repository.listRevisions?.(key) ?? [], listReleases: () => repository.listReleases() };
}
