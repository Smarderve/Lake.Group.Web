/**
 * Labels for the review queue (spec §23). Entity model names come from the
 * backend as-is (`news`, `company`, `cSREntry`, ...); field names from the
 * impact diff are camelCase (`publishDate`, `relatedCompanyId`, ...).
 */

const ENTITY_LABELS: Record<string, string> = {
  news: 'News',
  company: 'Company',
  media: 'Media',
  metric: 'Metric',
  country: 'Country',
  region: 'Region',
  location: 'Location',
  facility: 'Facility',
  project: 'Project',
  category: 'Category',
  productService: 'Product / service',
  companyRelationship: 'Company relationship',
  mapCategory: 'Map category',
  page: 'Page',
  contentBlock: 'Content block',
  leadership: 'Leadership',
  contact: 'Contact',
  historyEvent: 'History event',
  careerListing: 'Career listing',
  cSREntry: 'CSR entry',
};

/** "cSREntry" → "CSR entry", "productService" → "Product / service". */
export function entityTypeLabel(entityType: string | null | undefined): string {
  if (!entityType) return 'Item';
  if (ENTITY_LABELS[entityType]) return ENTITY_LABELS[entityType];
  const normalized = entityType.replace(/cSREntry/g, 'CSR entry').replace(/([a-z])([A-Z])/g, '$1 $2');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/** "publishDate" → "Publish date", "seoTitle" → "SEO title". */
export function fieldLabel(field: string): string {
  const spaced = field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/Id$/i, ' ID')
    .replace(/Url$/i, ' URL')
    .replace(/Seo/gi, 'SEO');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Render a diff/entity value compactly (dates, strings, numbers, JSON). */
export function valueLabel(value: unknown): string {
  if (value === null || value === undefined) return '–';
  if (typeof value === 'string') {
    if (value === '') return '–';
    return value.length > 120 ? `${value.slice(0, 117)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
