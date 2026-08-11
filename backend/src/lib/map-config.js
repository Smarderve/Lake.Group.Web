import { httpError } from './governed.js';
import { mediaBeforeCreate, mediaArchiveGuard } from './media-usage.js';
import {
  mediaCreateSchema, mediaUpdateSchema,
  mapCategoryCreateSchema, mapCategoryUpdateSchema,
} from '../validators/map-media.js';

/**
 * Archiving a MapCategory that Facilities still reference is blocked
 * (DEPENDENTS_EXIST) — same discipline as Country/Regions: published map
 * data must never dangle under an archived layer. Reassign or archive the
 * facilities first.
 */
async function mapCategoryArchiveGuard(db, category) {
  const facilities = await db.facility.findMany({
    where: { mapCategoryId: category.id, status: { not: 'ARCHIVED' } },
  });
  if (facilities.length > 0) {
    throw httpError(409, 'DEPENDENTS_EXIST', 'Archive or reassign facilities on this layer first');
  }
}

export const MAP_ENTITIES = {
  media: {
    entity: 'media',
    versionEntity: 'mediaVersion',
    fkField: 'mediaId',
    route: 'media',
    prefix: 'MEDIA',
    label: 'Media item',
    fields: ['url', 'altText', 'caption', 'mimeType', 'sizeBytes', 'width', 'height', 'copyright', 'license', 'tags', 'variants', 'folderId'],
    createSchema: mediaCreateSchema,
    updateSchema: mediaUpdateSchema,
    beforeCreate: mediaBeforeCreate,
    archiveGuard: mediaArchiveGuard,
  },
  'map-categories': {
    entity: 'mapCategory',
    versionEntity: 'mapCategoryVersion',
    fkField: 'mapCategoryId',
    route: 'map-categories',
    prefix: 'MAP_CATEGORY',
    label: 'Map category',
    slugField: 'slug',
    fields: ['name', 'slug', 'description', 'color', 'icon', 'sortOrder'],
    createSchema: mapCategoryCreateSchema,
    updateSchema: mapCategoryUpdateSchema,
    archiveGuard: mapCategoryArchiveGuard,
  },
};
