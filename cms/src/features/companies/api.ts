/**
 * Companies API service (spec §11 reference entity + Phase 10 editor).
 * Mirrors the governed router (backend/src/routes/governed.js) for route
 * `companies` – nothing invented:
 *
 *   GET    /admin/companies               – full list (all statuses)
 *   GET    /admin/companies/:id           – detail + versions
 *   POST   /admin/companies               – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/companies/:id           – edit → DRAFT         (EDITOR+)
 *   POST   /admin/companies/:id/submit    – DRAFT → IN_REVIEW    (EDITOR+)
 *   POST   /admin/companies/:id/approve   – IN_REVIEW → APPROVED (REVIEWER+)
 *   POST   /admin/companies/:id/reject    – IN_REVIEW → DRAFT    (REVIEWER+, reason)
 *   POST   /admin/companies/:id/publish   – APPROVED → PUBLISHED (REVIEWER+)
 *   POST   /admin/companies/:id/unpublish – PUBLISHED → DRAFT    (REVIEWER+)
 *   POST   /admin/companies/:id/archive   – → ARCHIVED           (SUPER_ADMIN)
 *
 * The editor's Relationships tab reads the other governed lists and filters
 * them client-side by the company's id – the governed router has no
 * query params yet, and its list endpoints nest rows under the route slug.
 */

import { api } from '../../services/api';
import type { VersionRow, WorkflowStatus } from '../../types/api';

/** A company row as returned by GET /admin/companies (registry fields). */
export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  logoMediaId: string | null;
  parentCompanyId: string | null;
  categoryId: string | null;
  headquartersCountryId: string | null;
  foundedDate: string | null;
  website: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyListResponse {
  companies: CompanyRow[];
}

export interface CompanyDetailResponse {
  company: CompanyRow;
  versions: VersionRow[];
}

/** Create/update body – backend companyCreateSchema/companyUpdateSchema. */
export interface CompanyInput {
  name: string;
  slug?: string; // create only; the update schema omits slug
  description?: string;
  logo?: string;
  logoMediaId?: string | null;
  parentCompanyId?: string;
  categoryId?: string;
  headquartersCountryId?: string;
  foundedDate?: string | null;
  website?: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Option / relationship rows (governed lists the editor reads)
// ---------------------------------------------------------------------------

/** Category row (GET /admin/categories). */
export interface CategoryRow {
  id: string;
  name: string;
}

/** Country row (GET /admin/countries). */
export interface CountryRow {
  id: string;
  name: string;
  isoCode: string;
}

/** Media row subset for the logo picker (GET /admin/media). */
export interface MediaOptionRow {
  id: string;
  url: string;
  altText: string | null;
  caption: string | null;
  variants: Record<string, string> | null;
  status: WorkflowStatus;
}

/** Common shape of every governed relationship list. */
export interface RelatedRow {
  id: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ProductServiceRow extends RelatedRow {
  name: string;
  description: string | null;
  companyId: string;
}

export interface ProjectRow extends RelatedRow {
  title: string;
  companyId: string;
  sector: string | null;
}

export interface LeadershipRow extends RelatedRow {
  name: string;
  position: string | null;
  companyId: string;
}

export interface ContactRow extends RelatedRow {
  name: string;
  type: string | null;
  companyId: string;
  email: string | null;
  phone: string | null;
}

export interface FacilityRow extends RelatedRow {
  name: string;
  companyId: string;
  locationId: string | null;
  category: string | null;
  operationalStatus: string | null;
}

export interface CompanyRelationshipRow extends RelatedRow {
  companyId: string;
  relatedCompanyId: string;
  relationshipType: string;
}

export interface NewsRow {
  id: string;
  title: string;
  slug: string;
  relatedCompanyId: string | null;
  status: WorkflowStatus;
  updatedAt: string;
}

export interface CareerListingRow extends RelatedRow {
  jobTitle: string;
  department: string | null;
  companyId: string;
  listingStatus: string | null;
}

export interface CsrEntryRow extends RelatedRow {
  title: string;
  category: string | null;
  companyId: string;
}

/** Relationship type labels – backend RELATIONSHIP_TYPES (validators/registry.js). */
export const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  SUBSIDIARY_OF: 'Subsidiary of',
  PARTNER_OF: 'Partner of',
  JOINT_VENTURE_WITH: 'Joint venture with',
  OTHER: 'Other',
};

export const companyApi = {
  list: () => api.get<CompanyListResponse>('/admin/companies'),
  get: (id: string) => api.get<CompanyDetailResponse>(`/admin/companies/${id}`),
  create: (input: CompanyInput) => api.post<CompanyDetailResponse>('/admin/companies', input),
  update: (id: string, input: CompanyInput) =>
    api.patch<CompanyDetailResponse>(`/admin/companies/${id}`, input),
  submit: (id: string) => api.post<CompanyDetailResponse>(`/admin/companies/${id}/submit`, {}),
  approve: (id: string) => api.post<CompanyDetailResponse>(`/admin/companies/${id}/approve`, {}),
  reject: (id: string, reason: string) =>
    api.post<CompanyDetailResponse>(`/admin/companies/${id}/reject`, { reason }),
  publish: (id: string) => api.post<CompanyDetailResponse>(`/admin/companies/${id}/publish`, {}),
  unpublish: (id: string) => api.post<CompanyDetailResponse>(`/admin/companies/${id}/unpublish`, {}),
  archive: (id: string) => api.post<CompanyDetailResponse>(`/admin/companies/${id}/archive`, {}),

  // Option lists for the editor form (same governed endpoints the site uses).
  categories: () => api.get<{ categories: CategoryRow[] }>('/admin/categories'),
  countries: () => api.get<{ countries: CountryRow[] }>('/admin/countries'),
  media: () => api.get<{ media: MediaOptionRow[] }>('/admin/media'),

  // Relationship lists for the editor's Relationships tab.
  productServices: () => api.get<{ 'product-services': ProductServiceRow[] }>('/admin/product-services'),
  projects: () => api.get<{ projects: ProjectRow[] }>('/admin/projects'),
  leadership: () => api.get<{ leadership: LeadershipRow[] }>('/admin/leadership'),
  contacts: () => api.get<{ contacts: ContactRow[] }>('/admin/contacts'),
  facilities: () => api.get<{ facilities: FacilityRow[] }>('/admin/facilities'),
  companyRelationships: () =>
    api.get<{ 'company-relationships': CompanyRelationshipRow[] }>('/admin/company-relationships'),
  news: () => api.get<{ news: NewsRow[] }>('/admin/news'),
  careerListings: () =>
    api.get<{ 'career-listings': CareerListingRow[] }>('/admin/career-listings'),
  csrEntries: () => api.get<{ 'csr-entries': CsrEntryRow[] }>('/admin/csr-entries'),
};
