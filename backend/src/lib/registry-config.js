/**
 * Phase 4 — Corporate Registry entity configurations.
 *
 * One entry per governed entity; each entry is all the shared workflow
 * (lib/governed.js) needs to know: which Prisma model + version model to
 * use, which fields to snapshot, and any domain-specific guards.
 */

import { httpError } from './governed.js';
import { mediaUsageHooks } from './media-usage.js';
import {
  countryCreateSchema, countryUpdateSchema,
  regionCreateSchema, regionUpdateSchema,
  locationCreateSchema, locationUpdateSchema,
  facilityCreateSchema, facilityUpdateSchema,
  categoryCreateSchema, categoryUpdateSchema,
  companyCreateSchema, companyUpdateSchema,
  productServiceCreateSchema, productServiceUpdateSchema,
  companyRelationshipCreateSchema, companyRelationshipUpdateSchema,
} from '../validators/registry.js';

/**
 * Reject a Company edit that would create a circular parent chain
 * (Task 4.5): walk up from the proposed parent; if the chain reaches the
 * company itself (or already contains a cycle), refuse.
 */
async function companyParentGuard(db, entity, data) {
  const proposedParentId = data.parentCompanyId;
  if (proposedParentId == null) return;
  if (proposedParentId === entity.id) {
    throw httpError(400, 'INVALID_PARENT', 'A company cannot be its own parent');
  }
  const seen = new Set();
  let cursor = proposedParentId;
  while (cursor) {
    if (cursor === entity.id) {
      throw httpError(400, 'INVALID_PARENT', 'Cannot create a circular parent chain');
    }
    if (seen.has(cursor)) {
      throw httpError(400, 'INVALID_PARENT', 'Parent chain already contains a cycle');
    }
    seen.add(cursor);
    const parent = await db.company.findFirst({ where: { id: cursor } });
    cursor = parent?.parentCompanyId ?? null;
  }
}

/** A company cannot relate to itself (Task 4.7). */
function selfRelationshipGuard(_db, data) {
  if (data.relatedCompanyId && data.relatedCompanyId === data.companyId) {
    throw httpError(400, 'SELF_RELATIONSHIP', 'A company cannot have a relationship with itself');
  }
}

/**
 * Archiving a Country with Regions still attached is blocked (chosen over
 * cascading): published data must never dangle under an archived parent —
 * archive the Regions first, then the Country. Documented in
 * backend/docs/governed-entity-pattern.md.
 */
async function countryArchiveGuard(db, country) {
  const regions = await db.region.findMany({
    where: { countryId: country.id, status: { not: 'ARCHIVED' } },
  });
  if (regions.length > 0) {
    throw httpError(409, 'DEPENDENTS_EXIST', 'Archive all regions of this country first');
  }
}

export const REGISTRY_ENTITIES = {
  countries: {
    entity: 'country',
    versionEntity: 'countryVersion',
    fkField: 'countryId',
    route: 'countries',
    prefix: 'COUNTRY',
    label: 'Country',
    fields: ['name', 'isoCode', 'regionGrouping'],
    createSchema: countryCreateSchema,
    updateSchema: countryUpdateSchema,
    archiveGuard: countryArchiveGuard,
  },
  regions: {
    entity: 'region',
    versionEntity: 'regionVersion',
    fkField: 'regionId',
    route: 'regions',
    prefix: 'REGION',
    label: 'Region',
    fields: ['name', 'countryId'],
    createSchema: regionCreateSchema,
    updateSchema: regionUpdateSchema,
  },
  locations: {
    entity: 'location',
    versionEntity: 'locationVersion',
    fkField: 'locationId',
    route: 'locations',
    prefix: 'LOCATION',
    label: 'Location',
    fields: ['name', 'regionId', 'countryId', 'latitude', 'longitude', 'type'],
    createSchema: locationCreateSchema,
    updateSchema: locationUpdateSchema,
  },
  facilities: {
    entity: 'facility',
    versionEntity: 'facilityVersion',
    fkField: 'facilityId',
    route: 'facilities',
    prefix: 'FACILITY',
    label: 'Facility',
    fields: ['name', 'locationId', 'companyId', 'category', 'coordinates', 'operationalStatus', 'mapCategoryId', 'mapVisible', 'markerLabel'],
    createSchema: facilityCreateSchema,
    updateSchema: facilityUpdateSchema,
  },
  categories: {
    entity: 'category',
    versionEntity: 'categoryVersion',
    fkField: 'categoryId',
    route: 'categories',
    prefix: 'CATEGORY',
    label: 'Category',
    fields: ['name', 'description'],
    createSchema: categoryCreateSchema,
    updateSchema: categoryUpdateSchema,
  },
  companies: {
    entity: 'company',
    versionEntity: 'companyVersion',
    fkField: 'companyId',
    route: 'companies',
    prefix: 'COMPANY',
    label: 'Company',
    slugField: 'slug',
    fields: ['name', 'slug', 'description', 'logo', 'logoMediaId', 'parentCompanyId', 'categoryId', 'headquartersCountryId', 'foundedDate', 'website'],
    createSchema: companyCreateSchema,
    updateSchema: companyUpdateSchema,
    guardUpdate: companyParentGuard,
    ...mediaUsageHooks('logoMediaId', 'company'),
  },
  'product-services': {
    entity: 'productService',
    versionEntity: 'productServiceVersion',
    fkField: 'productServiceId',
    route: 'product-services',
    prefix: 'PRODUCT_SERVICE',
    label: 'Product or service',
    fields: ['name', 'description', 'companyId', 'categoryId'],
    createSchema: productServiceCreateSchema,
    updateSchema: productServiceUpdateSchema,
  },
  'company-relationships': {
    entity: 'companyRelationship',
    versionEntity: 'companyRelationshipVersion',
    fkField: 'companyRelationshipId',
    route: 'company-relationships',
    prefix: 'COMPANY_RELATIONSHIP',
    label: 'Company relationship',
    fields: ['companyId', 'relatedCompanyId', 'relationshipType'],
    createSchema: companyRelationshipCreateSchema,
    updateSchema: companyRelationshipUpdateSchema,
    guardCreate: selfRelationshipGuard,
    guardUpdate: selfRelationshipGuard,
  },
};
