/**
 * Phase 5 — CMS Core entity configurations.
 *
 * Same shape as registry-config.js (Phase 4): one entry per governed
 * entity is all lib/governed.js needs. Phase 5 adds two optional hooks
 * the registry did not need:
 *
 *   - beforeCreate/afterCreate + beforeUpdate/afterUpdate — for entities
 *     with side tables (Page ↔ ContentBlock join, HistoryEvent ↔ Company
 *     join). before* validates + resolves the join payload and returns
 *     `{ data, extra }`; after* writes the join rows with the new row id.
 *   - publicVisible(db, row) — per-entity visibility beyond PUBLISHED
 *     (News scheduling, Contact.publicDisplay, CareerListing OPEN only).
 *
 * See backend/docs/governed-entity-pattern.md for the full recipe.
 */

import { httpError } from './governed.js';
import { mediaUsageHooks, composeHooks } from './media-usage.js';
import {
  contentBlockCreateSchema, contentBlockUpdateSchema,
  pageCreateSchema, pageUpdateSchema,
  newsCreateSchema, newsUpdateSchema,
  projectCreateSchema, projectUpdateSchema,
  leadershipCreateSchema, leadershipUpdateSchema,
  contactCreateSchema, contactUpdateSchema,
  historyEventCreateSchema, historyEventUpdateSchema,
  careerListingCreateSchema, careerListingUpdateSchema,
  csrEntryCreateSchema, csrEntryUpdateSchema,
} from '../validators/cms.js';

// ---------------------------------------------------------------------------
// Page ↔ ContentBlock join helpers (Task 5.2)
// ---------------------------------------------------------------------------
/** Validate block keys exist and return their ids (id-order = position). */
async function resolveBlockIds(db, keys) {
  const ids = [];
  for (const key of keys ?? []) {
    const block = await db.contentBlock.findFirst({ where: { key } });
    if (!block) throw httpError(400, 'INVALID_BLOCK', `Unknown content block key: ${key}`);
    ids.push(block.id);
  }
  return ids;
}

async function writePageBlocks(db, pageId, blockIds) {
  await db.pageContentBlock.deleteMany({ where: { pageId } });
  for (const [position, blockId] of blockIds.entries()) {
    await db.pageContentBlock.create({ data: { pageId, contentBlockId: blockId, position } });
  }
}

async function pageBeforeCreate(db, data) {
  const { contentBlocks, ...rest } = data;
  const ids = await resolveBlockIds(db, contentBlocks);
  return { data: rest, extra: ids };
}

async function pageAfterCreate(db, row, blockIds) {
  await writePageBlocks(db, row.id, blockIds);
}

async function pageBeforeUpdate(db, _entity, data) {
  const { contentBlocks, ...rest } = data;
  const ids = await resolveBlockIds(db, contentBlocks);
  return { data: rest, extra: ids };
}

async function pageAfterUpdate(db, row, blockIds) {
  await writePageBlocks(db, row.id, blockIds);
}

async function pageSnapshotExtra(db, row) {
  const joins = await db.pageContentBlock.findMany({
    where: { pageId: row.id },
    orderBy: { position: 'asc' },
  });
  return { contentBlocks: joins.map((j) => j.contentBlockId) };
}

// ---------------------------------------------------------------------------
// HistoryEvent ↔ Company join helpers (Task 5.7)
// ---------------------------------------------------------------------------
async function writeHistoryCompanies(db, eventId, companyIds) {
  await db.historyEventCompany.deleteMany({ where: { historyEventId: eventId } });
  for (const companyId of companyIds ?? []) {
    await db.historyEventCompany.create({ data: { historyEventId: eventId, companyId } });
  }
}

async function historyBeforeCreate(db, data) {
  const { companyIds, ...rest } = data;
  return { data: rest, extra: companyIds ?? [] };
}

async function historyBeforeUpdate(db, _entity, data) {
  const { companyIds, ...rest } = data;
  return { data: rest, extra: companyIds ?? [] };
}

async function historySnapshotExtra(db, row) {
  const joins = await db.historyEventCompany.findMany({ where: { historyEventId: row.id } });
  return { companyIds: joins.map((j) => j.companyId) };
}

// ---------------------------------------------------------------------------
// News author defaults to the session user (Task 5.3)
// ---------------------------------------------------------------------------
async function newsBeforeCreate(db, data, ctx) {
  if (!data.authorId && ctx?.user?.id) {
    return { data: { ...data, authorId: ctx.user.id }, extra: null };
  }
  return { data, extra: null };
}

// ---------------------------------------------------------------------------
// Public-visibility hooks — beyond the PUBLISHED filter in the public router.
// ---------------------------------------------------------------------------
function newsVisible(_db, row) {
  // Scheduled: PUBLISHED in workflow but not publicly served until the
  // publication date arrives (on-demand check — no cron needed).
  if (!row.publicationDate) return true;
  return new Date(row.publicationDate) <= new Date();
}

function contactVisible(_db, row) {
  // publicDisplay is enforced server-side, never trusted from a client.
  return row.publicDisplay === true;
}

function careerVisible(_db, row) {
  // Only OPEN listings are served publicly; CLOSED ones stay in the CMS.
  return row.listingStatus === 'OPEN';
}

export const CMS_ENTITIES = {
  pages: {
    entity: 'page',
    versionEntity: 'pageVersion',
    fkField: 'pageId',
    route: 'pages',
    prefix: 'PAGE',
    label: 'Page',
    slugField: 'slug',
    fields: ['slug', 'title', 'layoutType', 'metaTitle', 'metaDescription'],
    createSchema: pageCreateSchema,
    updateSchema: pageUpdateSchema,
    beforeCreate: pageBeforeCreate,
    afterCreate: pageAfterCreate,
    beforeUpdate: pageBeforeUpdate,
    afterUpdate: pageAfterUpdate,
    snapshotExtra: pageSnapshotExtra,
    afterRollback: (db, row, prev) => writePageBlocks(db, row.id, prev.contentBlocks ?? []),
  },
  'content-blocks': {
    entity: 'contentBlock',
    versionEntity: 'contentBlockVersion',
    fkField: 'contentBlockId',
    route: 'content-blocks',
    prefix: 'CONTENT_BLOCK',
    label: 'Content block',
    fields: ['key', 'type', 'content'],
    createSchema: contentBlockCreateSchema,
    updateSchema: contentBlockUpdateSchema,
  },
  news: {
    entity: 'news',
    versionEntity: 'newsVersion',
    fkField: 'newsId',
    route: 'news',
    prefix: 'NEWS',
    label: 'News item',
    slugField: 'slug',
    fields: ['title', 'slug', 'body', 'authorId', 'categoryId', 'relatedCompanyId', 'relatedProjectId', 'publicationDate', 'heroMediaId', 'metaTitle', 'metaDescription'],
    createSchema: newsCreateSchema,
    updateSchema: newsUpdateSchema,
    beforeCreate: composeHooks(newsBeforeCreate, mediaUsageHooks('heroMediaId', 'news').beforeCreate),
    afterCreate: mediaUsageHooks('heroMediaId', 'news').afterCreate,
    afterUpdate: mediaUsageHooks('heroMediaId', 'news').afterUpdate,
    afterRollback: mediaUsageHooks('heroMediaId', 'news').afterRollback,
    publicVisible: newsVisible,
  },
  projects: {
    entity: 'project',
    versionEntity: 'projectVersion',
    fkField: 'projectId',
    route: 'projects',
    prefix: 'PROJECT',
    label: 'Project',
    fields: ['title', 'companyId', 'locationId', 'sector', 'startDate', 'endDate', 'description', 'impact', 'coverMediaId'],
    createSchema: projectCreateSchema,
    updateSchema: projectUpdateSchema,
    ...mediaUsageHooks('coverMediaId', 'project'),
  },
  leadership: {
    entity: 'leadership',
    versionEntity: 'leadershipVersion',
    fkField: 'leadershipId',
    route: 'leadership',
    prefix: 'LEADERSHIP',
    label: 'Leader',
    fields: ['name', 'position', 'bio', 'photo', 'photoMediaId', 'order', 'companyId'],
    createSchema: leadershipCreateSchema,
    updateSchema: leadershipUpdateSchema,
    ...mediaUsageHooks('photoMediaId', 'leadership'),
  },
  contacts: {
    entity: 'contact',
    versionEntity: 'contactVersion',
    fkField: 'contactId',
    route: 'contacts',
    prefix: 'CONTACT',
    label: 'Contact',
    fields: ['name', 'type', 'companyId', 'locationId', 'phone', 'email', 'publicDisplay', 'order', 'verificationStatus', 'verificationDate'],
    createSchema: contactCreateSchema,
    updateSchema: contactUpdateSchema,
    publicVisible: contactVisible,
  },
  'history-events': {
    entity: 'historyEvent',
    versionEntity: 'historyEventVersion',
    fkField: 'historyEventId',
    route: 'history-events',
    prefix: 'HISTORY_EVENT',
    label: 'History event',
    fields: ['title', 'date', 'endDate', 'description', 'imageMediaId', 'order'],
    createSchema: historyEventCreateSchema,
    updateSchema: historyEventUpdateSchema,
    beforeCreate: composeHooks(historyBeforeCreate, mediaUsageHooks('imageMediaId', 'historyEvent').beforeCreate),
    beforeUpdate: composeHooks(historyBeforeUpdate, mediaUsageHooks('imageMediaId', 'historyEvent').beforeUpdate),
    afterCreate: async (db, row, extra) => {
      await writeHistoryCompanies(db, row.id, extra);
      await mediaUsageHooks('imageMediaId', 'historyEvent').afterCreate(db, row);
    },
    afterUpdate: async (db, row, extra) => {
      await writeHistoryCompanies(db, row.id, extra);
      await mediaUsageHooks('imageMediaId', 'historyEvent').afterUpdate(db, row);
    },
    snapshotExtra: historySnapshotExtra,
    afterRollback: async (db, row, prev) => {
      await writeHistoryCompanies(db, row.id, prev.companyIds ?? []);
      await mediaUsageHooks('imageMediaId', 'historyEvent').afterRollback(db, row, prev);
    },
  },
  'career-listings': {
    entity: 'careerListing',
    versionEntity: 'careerListingVersion',
    fkField: 'careerListingId',
    route: 'career-listings',
    prefix: 'CAREER_LISTING',
    label: 'Career listing',
    fields: ['jobTitle', 'department', 'companyId', 'locationId', 'description', 'requirements', 'employmentType', 'postedDate', 'closingDate', 'listingStatus'],
    createSchema: careerListingCreateSchema,
    updateSchema: careerListingUpdateSchema,
    publicVisible: careerVisible,
  },
  'csr-entries': {
    // Prisma delegate name: model CSREntry → client exposes cSREntry.
    entity: 'cSREntry',
    versionEntity: 'cSREntryVersion',
    fkField: 'csrEntryId',
    route: 'csr-entries',
    prefix: 'CSR_ENTRY',
    label: 'CSR entry',
    fields: ['title', 'description', 'category', 'imageMediaId', 'companyId', 'date', 'period'],
    createSchema: csrEntryCreateSchema,
    updateSchema: csrEntryUpdateSchema,
    ...mediaUsageHooks('imageMediaId', 'cSREntry'),
  },
};
