/**
 * Products & Services API service (spec §12).
 * Mirrors the governed router (backend/src/routes/governed.js) for route
 * `product-services` – nothing invented:
 *
 *   GET    /admin/product-services           – full list (all statuses)
 *   GET    /admin/product-services/:id       – detail + versions
 *   POST   /admin/product-services           – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/product-services/:id       – edit → DRAFT         (EDITOR+)
 *   POST   /admin/product-services/:id/submit    – DRAFT → IN_REVIEW    (EDITOR+)
 *   POST   /admin/product-services/:id/approve   – IN_REVIEW → APPROVED (REVIEWER+)
 *   POST   /admin/product-services/:id/reject    – IN_REVIEW → DRAFT    (REVIEWER+, reason)
 *   POST   /admin/product-services/:id/publish   – APPROVED → PUBLISHED (REVIEWER+)
 *   POST   /admin/product-services/:id/unpublish – PUBLISHED → DRAFT    (REVIEWER+)
 *   POST   /admin/product-services/:id/archive   – → ARCHIVED           (SUPER_ADMIN)
 *
 * The list endpoint nests rows under the route slug `product-services`.
 */

import { api } from '../../services/api';
import type { VersionRow, WorkflowStatus } from '../../types/api';

/** A product/service row as returned by GET /admin/product-services. */
export interface ProductServiceRow {
  id: string;
  name: string;
  description: string | null;
  companyId: string;
  categoryId: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductServiceListResponse {
  'product-services': ProductServiceRow[];
}

export interface ProductServiceDetailResponse {
  productService: ProductServiceRow;
  versions: VersionRow[];
}

/** Create/update body – backend productServiceCreateSchema/productServiceUpdateSchema. */
export interface ProductServiceInput {
  name: string;
  description?: string;
  companyId: string;
  categoryId?: string;
  reason: string;
}

/** Company option row (GET /admin/companies). */
export interface CompanyOptionRow {
  id: string;
  name: string;
  status: WorkflowStatus;
}

/** Category option row (GET /admin/categories). */
export interface CategoryOptionRow {
  id: string;
  name: string;
  status: WorkflowStatus;
}

export const productServiceApi = {
  list: () => api.get<ProductServiceListResponse>('/admin/product-services'),
  get: (id: string) => api.get<ProductServiceDetailResponse>(`/admin/product-services/${id}`),
  create: (input: ProductServiceInput) =>
    api.post<ProductServiceDetailResponse>('/admin/product-services', input),
  update: (id: string, input: ProductServiceInput) =>
    api.patch<ProductServiceDetailResponse>(`/admin/product-services/${id}`, input),
  submit: (id: string) => api.post<ProductServiceDetailResponse>(`/admin/product-services/${id}/submit`, {}),
  approve: (id: string) => api.post<ProductServiceDetailResponse>(`/admin/product-services/${id}/approve`, {}),
  reject: (id: string, reason: string) =>
    api.post<ProductServiceDetailResponse>(`/admin/product-services/${id}/reject`, { reason }),
  publish: (id: string) => api.post<ProductServiceDetailResponse>(`/admin/product-services/${id}/publish`, {}),
  unpublish: (id: string) =>
    api.post<ProductServiceDetailResponse>(`/admin/product-services/${id}/unpublish`, {}),
  archive: (id: string) =>
    api.post<ProductServiceDetailResponse>(`/admin/product-services/${id}/archive`, {}),

  // Option lists for the editor form (same governed endpoints the site uses).
  companies: () => api.get<{ companies: CompanyOptionRow[] }>('/admin/companies'),
  categories: () => api.get<{ categories: CategoryOptionRow[] }>('/admin/categories'),
};
