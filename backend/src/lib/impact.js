import { pickFields } from './governed.js';

/**
 * Phase 7 — impact analysis.
 *
 * Before publishing a change, `GET /admin/:entity/:id/impact` (and the
 * metric variant) shows:
 *   - `current`  — the last published snapshot
 *   - `pending`  — the latest in-flight (DRAFT/IN_REVIEW/APPROVED) snapshot
 *   - `diff`     — which fields will actually change (from → to)
 *   - `references` — dependent entities that consume this record (the
 *     "Employees 4,600 → 4,850 affects the homepage keyfacts" check)
 *
 * References are explicit per model (central here, so entity configs stay
 * lean): only genuine dependents, not FK targets.
 */

const dependentRow = (type, row) => ({
  type,
  id: row.id,
  label: row.slug ?? row.name ?? row.title ?? row.jobTitle ?? row.key ?? row.id,
});

/** Dependents per governed model. Entities absent from this map have none. */
const DEPENDENTS = {
  company: async (db, row) => [
    ...(await db.facility.findMany({ where: { companyId: row.id } })).map((r) => dependentRow('facility', r)),
    ...(await db.productService.findMany({ where: { companyId: row.id } })).map((r) => dependentRow('productService', r)),
    ...(await db.companyRelationship.findMany({ where: { OR: [{ companyId: row.id }, { relatedCompanyId: row.id }] } })).map((r) => dependentRow('companyRelationship', r)),
    ...(await db.news.findMany({ where: { relatedCompanyId: row.id } })).map((r) => dependentRow('news', r)),
    ...(await db.leadership.findMany({ where: { companyId: row.id } })).map((r) => dependentRow('leadership', r)),
    ...(await db.project.findMany({ where: { companyId: row.id } })).map((r) => dependentRow('project', r)),
    ...(await db.careerListing.findMany({ where: { companyId: row.id } })).map((r) => dependentRow('careerListing', r)),
    ...(await db.contact.findMany({ where: { companyId: row.id } })).map((r) => dependentRow('contact', r)),
    ...(await db.cSREntry.findMany({ where: { companyId: row.id } })).map((r) => dependentRow('csrEntry', r)),
    ...(await db.historyEventCompany.findMany({ where: { companyId: row.id } })).map((r) => dependentRow('historyEvent', { ...r, id: r.historyEventId, name: `historyEvent:${r.historyEventId}` })),
  ],
  country: async (db, row) => [
    ...(await db.region.findMany({ where: { countryId: row.id } })).map((r) => dependentRow('region', r)),
    ...(await db.location.findMany({ where: { countryId: row.id } })).map((r) => dependentRow('location', r)),
    ...(await db.company.findMany({ where: { headquartersCountryId: row.id } })).map((r) => dependentRow('company', r)),
  ],
  region: async (db, row) => [
    ...(await db.location.findMany({ where: { regionId: row.id } })).map((r) => dependentRow('location', r)),
  ],
  location: async (db, row) => [
    ...(await db.facility.findMany({ where: { locationId: row.id } })).map((r) => dependentRow('facility', r)),
    ...(await db.project.findMany({ where: { locationId: row.id } })).map((r) => dependentRow('project', r)),
    ...(await db.contact.findMany({ where: { locationId: row.id } })).map((r) => dependentRow('contact', r)),
    ...(await db.careerListing.findMany({ where: { locationId: row.id } })).map((r) => dependentRow('careerListing', r)),
  ],
  mapCategory: async (db, row) => [
    ...(await db.facility.findMany({ where: { mapCategoryId: row.id } })).map((r) => dependentRow('facility', r)),
  ],
  media: async (db, row) =>
    (await db.mediaUsage.findMany({ where: { mediaId: row.id } })).map((u) => ({
      type: u.entityType,
      id: u.entityId,
      field: u.field,
      label: `${u.entityType}#${u.field}`,
    })),
  contentBlock: async (db, row) => {
    const joins = await db.pageContentBlock.findMany({ where: { contentBlockId: row.id } });
    const pageIds = [...new Set(joins.map((j) => j.pageId))];
    const pages = pageIds.length > 0 ? await db.page.findMany({ where: { OR: pageIds.map((id) => ({ id })) } }) : [];
    return pages.map((p) => dependentRow('page', p));
  },
};

export async function referencesFor(db, config, entity) {
  const query = DEPENDENTS[config.entity];
  if (!query) return [];
  try {
    return await query(db, entity);
  } catch {
    return [];
  }
}

/** Changed fields between the published snapshot and the pending one. */
export function diffFields(current, pending) {
  const diff = {};
  for (const [key, value] of Object.entries(pending ?? {})) {
    if (JSON.stringify(current?.[key]) !== JSON.stringify(value)) {
      diff[key] = { from: current?.[key] ?? null, to: value };
    }
  }
  return diff;
}

/** Generic governed impact payload (used by the governed router). */
export async function impactFor(db, config, entity) {
  const versions = await db[config.versionEntity].findMany({
    where: { [config.fkField]: entity.id },
    orderBy: { createdAt: 'desc' },
  });
  const published = versions.find((v) => v.status === 'PUBLISHED');
  // A pending change exists ONLY while the entity itself is in flight — a
  // PUBLISHED record's old APPROVED version rows are history, not a pending
  // edit (otherwise impact would report phantom diffs after publishing).
  const inFlight = ['DRAFT', 'IN_REVIEW', 'APPROVED'].includes(entity.status);
  const pending = inFlight
    ? (versions.find((v) => ['DRAFT', 'IN_REVIEW', 'APPROVED'].includes(v.status)) ?? null)
    : null;
  const current = published?.data ?? null;
  const references = await referencesFor(db, config, entity);
  return {
    entityType: config.entity,
    route: config.route,
    status: entity.status,
    entity: pickFields(entity, config.fields),
    current,
    pending: pending
      ? { data: pending.data, status: pending.status, changedBy: pending.changedBy, createdAt: pending.createdAt, reason: pending.reason }
      : null,
    diff: diffFields(current, pending?.data),
    references,
    versionCount: versions.length,
  };
}
