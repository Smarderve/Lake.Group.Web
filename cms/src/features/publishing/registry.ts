/**
 * Publishing registry (spec §25). The client-side mirror of the backend's
 * governed-entity config (backend/src/lib/registry-config.js, cms-config.js,
 * map-config.js) plus the metrics router. The Published Content and Drafts
 * views use it to fan out over GET /admin/:route and group rows by entity.
 * Routes, labels and label fields come from the verified API contract
 * (docs/CMS-API-MAP.md §4/§6) – nothing invented.
 *
 * List endpoints nest rows under the route slug (`{ [config.route]: rows }`),
 * so the registry is keyed by route – the same key the fan-out uses to read
 * each list and the group sections use to look rows up.
 */

export interface UnifiedRow {
  id: string;
  status?: string;
  updatedAt?: string | null;
  [key: string]: unknown;
}

export interface PublishingEntity {
  /** Admin route – GET /admin/:route and POST /admin/:route/:id/{transition}. */
  route: string;
  /** Group heading in the unified views. */
  label: string;
  /** Row label field priority (name/title/jobTitle/key/slug fallbacks). */
  labelFields: string[];
  /** Where the entity's own section lives in the CMS. */
  listPath: string;
  /** Dedicated editor route – only where a later phase has built one. */
  editPath?: (id: string) => string;
  /** Metrics has no unpublish transition (metrics router) – default true. */
  canUnpublish?: boolean;
  /** Custom row label (company-relationships read as id pairs). */
  labelFor?: (row: UnifiedRow) => string;
}

/** Company relationships have no name – show the type + id pair. */
function relationshipLabel(row: UnifiedRow): string {
  const type = String(row.relationshipType ?? 'Relationship').replace(/_/g, ' ');
  const from = String(row.companyId ?? '–').slice(0, 8);
  const to = String(row.relatedCompanyId ?? '–').slice(0, 8);
  return `${type} · ${from} ↔ ${to}`;
}

/**
 * Registry order = display order in the unified views: the content-heavy
 * collections first, then pages/projects, then the registry layers and map
 * data.
 */
export const PUBLISHING_ENTITIES: PublishingEntity[] = [
  {
    route: 'news',
    label: 'News',
    labelFields: ['title', 'slug'],
    listPath: '/app/news',
    editPath: (id) => `/app/news/${id}/edit`,
  },
  {
    route: 'companies',
    label: 'Companies',
    labelFields: ['name', 'slug'],
    listPath: '/app/companies',
  },
  {
    route: 'media',
    label: 'Media',
    labelFields: ['altText', 'caption', 'url'],
    listPath: '/app/media',
    editPath: (id) => `/app/media/${id}/edit`,
  },
  {
    route: 'metrics',
    label: 'Corporate metrics',
    labelFields: ['label', 'key'],
    listPath: '/app/metrics',
    editPath: (id) => `/app/metrics/${id}/edit`,
    canUnpublish: false,
  },
  {
    route: 'pages',
    label: 'Pages',
    labelFields: ['title', 'slug'],
    listPath: '/app/pages',
    editPath: (id) => `/app/pages/${id}/edit`,
  },
  {
    route: 'projects',
    label: 'Projects',
    labelFields: ['title'],
    listPath: '/app/projects',
    editPath: (id) => `/app/projects/${id}/edit`,
  },
  {
    route: 'leadership',
    label: 'Leadership',
    labelFields: ['name'],
    listPath: '/app/leadership',
  },
  {
    route: 'contacts',
    label: 'Contacts',
    labelFields: ['name'],
    listPath: '/app/contacts',
    editPath: (id) => `/app/contacts/${id}/edit`,
  },
  {
    route: 'history-events',
    label: 'History events',
    labelFields: ['title'],
    listPath: '/app/history-events',
  },
  {
    route: 'career-listings',
    label: 'Career listings',
    labelFields: ['jobTitle', 'title'],
    listPath: '/app/careers',
    editPath: (id) => `/app/careers/${id}/edit`,
  },
  {
    route: 'csr-entries',
    label: 'CSR entries',
    labelFields: ['title'],
    listPath: '/app/csr',
    editPath: (id) => `/app/csr/${id}/edit`,
  },
  {
    route: 'content-blocks',
    label: 'Content blocks',
    labelFields: ['key'],
    listPath: '/app/content-blocks',
    editPath: (id) => `/app/content-blocks/${id}/edit`,
  },
  {
    route: 'countries',
    label: 'Countries',
    labelFields: ['name'],
    listPath: '/app/countries',
  },
  {
    route: 'regions',
    label: 'Regions',
    labelFields: ['name'],
    listPath: '/app/regions',
  },
  {
    route: 'locations',
    label: 'Locations',
    labelFields: ['name'],
    listPath: '/app/locations',
  },
  {
    route: 'facilities',
    label: 'Facilities',
    labelFields: ['name'],
    listPath: '/app/facilities',
  },
  {
    route: 'categories',
    label: 'Categories',
    labelFields: ['name'],
    listPath: '/app/categories',
    editPath: (id) => `/app/categories/${id}/edit`,
  },
  {
    route: 'product-services',
    label: 'Products & services',
    labelFields: ['name'],
    listPath: '/app/products',
  },
  {
    route: 'company-relationships',
    label: 'Company relationships',
    labelFields: [],
    labelFor: relationshipLabel,
    listPath: '/app/company-relationships',
  },
  {
    route: 'map-categories',
    label: 'Map categories',
    labelFields: ['name', 'slug'],
    listPath: '/app/map-categories',
  },
];

/** Backend labelOf() priority – slug/name/title/jobTitle/key, then id. */
export function rowLabel(entity: PublishingEntity, row: UnifiedRow): string {
  if (entity.labelFor) return entity.labelFor(row);
  for (const field of entity.labelFields) {
    const value = row[field];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return row.id ?? 'Untitled';
}
