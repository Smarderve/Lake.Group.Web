/**
 * Human-readable labels for dashboard feed rows (spec §10).
 *
 * Audit actions are stored as verbatim codes (`COMPANY_PUBLISHED`,
 * `PASSWORD_RESET`, ...). The last token is the verb – mapping it to a
 * past-tense label keeps the feed readable without a full action table.
 */

const VERB_LABELS: Record<string, string> = {
  CREATED: 'Created',
  SUBMITTED: 'Submitted for review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  SCHEDULED: 'Scheduled',
  ROLLED_BACK: 'Rolled back',
  ROLLBACK: 'Rolled back',
  ARCHIVED: 'Archived',
  UNPUBLISHED: 'Unpublished',
  VERIFIED: 'Verified',
  RESET: 'Reset',
  DENIED: 'Denied',
  REVOKED: 'Revoked',
  RESOLVED: 'Resolved',
  CHANGED: 'Changed',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  LOGIN: 'Signed in',
  LOGOUT: 'Signed out',
};

/** Exact (non-entity) action codes → label. */
const EXACT_LABELS: Record<string, string> = {
  ROLE_CHANGE: 'Changed user role',
  ROLE_CHANGE_DENIED: 'Blocked a role change',
  PASSWORD_RESET: 'Reset password',
  SESSIONS_REVOKED: 'Revoked sessions',
  UNANSWERED_QUESTION_RESOLVED: 'Resolved an unanswered question',
  MFA_ENABLED: 'Enabled MFA',
  MFA_DISABLED: 'Disabled MFA',
  LOGIN_SUCCESS: 'Signed in',
  LOGIN_FAILED: 'Sign-in attempt failed',
  LOGOUT: 'Signed out',
  MFA_SETUP: 'Set up MFA',
  MFA_FAILED: 'MFA verification failed',
  AUTHORIZATION_DENIED: 'Blocked an unauthorized request',
};

/**
 * "COMPANY_PUBLISHED" → "Published", "ROLE_CHANGE" → "Changed user role".
 * Single-token actions ("LOGOUT") fall back to the verb map too.
 */
export function actionLabel(action: string): string {
  if (EXACT_LABELS[action]) return EXACT_LABELS[action];
  const parts = action.split('_');
  const verb = parts[parts.length - 1];
  if (VERB_LABELS[verb]) return VERB_LABELS[verb];
  // Fallback: lowercase the code, replace underscores.
  return action.toLowerCase().replace(/_/g, ' ');
}

const ROUTE_LABELS: Record<string, string> = {
  countries: 'Countries',
  regions: 'Regions',
  locations: 'Locations',
  facilities: 'Facilities',
  categories: 'Categories',
  companies: 'Companies',
  'product-services': 'Products & services',
  'company-relationships': 'Company relationships',
  media: 'Media',
  'map-categories': 'Map categories',
  pages: 'Pages',
  'content-blocks': 'Content blocks',
  news: 'News',
  projects: 'Projects',
  leadership: 'Leadership',
  contacts: 'Contacts',
  'history-events': 'History events',
  'career-listings': 'Career listings',
  'csr-entries': 'CSR entries',
  metrics: 'Metrics',
  users: 'Users',
  'audit-log': 'Audit log',
  'unanswered-questions': 'Unanswered questions',
  notifications: 'Notifications',
  auth: 'Authentication',
};

/**
 * "admin/news/abc123" → "News". Unknown or missing route falls back to the
 * first segment so an id is never shown as if it were a name.
 */
export function resourceLabel(resource: string | null): string {
  if (!resource) return '–';
  const segments = resource.split('/');
  const route = segments.find((s) => s !== 'admin' && s !== '');
  if (route && ROUTE_LABELS[route]) return ROUTE_LABELS[route];
  return route ?? resource;
}

/** "super-admin" → "SUPER_ADMIN"; entity type codes like "cSREntry" → "CSR entry". */
export function entityTypeLabel(entityType: string | null | undefined): string {
  if (!entityType) return 'Item';
  const normalized = entityType.replace(/cSREntry/g, 'CSR entry').replace(/([a-z])([A-Z])/g, '$1 $2');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
