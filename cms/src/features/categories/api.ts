/**
 * Categories API service – mirrors the governed `categories` route
 * (backend/src/lib/registry-config.js + validators/registry.js), nothing
 * invented:
 *
 *   GET    /admin/categories             – full list (all statuses)
 *   GET    /admin/categories/:id         – detail + versions
 *   POST   /admin/categories             – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/categories/:id         – edit → DRAFT         (EDITOR+)
 *   POST   /admin/categories/:id/submit  – DRAFT → IN_REVIEW    (EDITOR+)
 *   POST   /admin/categories/:id/approve – IN_REVIEW → APPROVED (REVIEWER+)
 *   POST   /admin/categories/:id/reject  – IN_REVIEW → DRAFT    (REVIEWER+, reason)
 *   POST   /admin/categories/:id/publish – APPROVED → PUBLISHED (REVIEWER+)
 *   POST   /admin/categories/:id/unpublish – PUBLISHED → DRAFT  (REVIEWER+)
 *   POST   /admin/categories/:id/archive – → ARCHIVED           (SUPER_ADMIN)
 */

import { api } from '../../services/api';
import { governedWorkflow } from '../../services/governed';
import type { VersionRow, WorkflowStatus } from '../../types/api';

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body – backend categoryCreateSchema/categoryUpdateSchema. */
export interface CategoryInput {
  name: string;
  description?: string;
  reason: string;
}

export const categoryApi = {
  list: () => api.get<{ categories: CategoryRow[] }>('/admin/categories'),
  get: (id: string) =>
    api.get<{ category: CategoryRow; versions: VersionRow[] }>(`/admin/categories/${id}`),
  create: (input: CategoryInput) => api.post<{ category: CategoryRow }>('/admin/categories', input),
  update: (id: string, input: CategoryInput) =>
    api.patch<{ category: CategoryRow }>(`/admin/categories/${id}`, input),
  ...governedWorkflow<CategoryRow>('categories'),
};

export { runPerRow } from '../../services/governed';
