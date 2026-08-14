/**
 * Projects API service (Phase 14). Mirrors the governed router
 * (backend/src/routes/governed.js + backend/src/lib/cms-config.js) for route
 * `projects` – nothing invented:
 *
 *   GET    /admin/projects             – full list (all statuses)
 *   GET    /admin/projects/:id         – detail + versions
 *   POST   /admin/projects             – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/projects/:id         – edit → DRAFT         (EDITOR+)
 *   POST   /admin/projects/:id/…       – the standard governed transitions
 *
 * List endpoints nest rows under the route slug (`{ projects: [...] }`); the
 * names of related records (company, location) resolve client-side from the
 * other governed lists, exactly like CompaniesPage does.
 */

import { api } from '../../services/api';
import { governedWorkflow } from '../../services/governed';
import type { VersionRow, WorkflowStatus } from '../../types/api';

export interface ProjectRow {
  id: string;
  title: string;
  companyId: string | null;
  locationId: string | null;
  sector: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  impact: string | null;
  coverMediaId: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body – mirrors projectCreateSchema (validators/cms.js). */
export interface ProjectInput {
  title: string;
  companyId?: string;
  locationId?: string;
  sector?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  impact?: string;
  coverMediaId?: string | null;
  reason: string;
}

export const projectApi = {
  list: () => api.get<{ projects: ProjectRow[] }>('/admin/projects'),
  get: (id: string) =>
    api.get<{ project: ProjectRow; versions: VersionRow[] }>(`/admin/projects/${id}`),
  create: (input: ProjectInput) => api.post<{ project: ProjectRow }>('/admin/projects', input),
  update: (id: string, input: ProjectInput) =>
    api.patch<{ project: ProjectRow }>(`/admin/projects/${id}`, input),
  ...governedWorkflow<ProjectRow>('projects'),
};

// Re-exported for the collection page (it imports runPerRow from './api').
export { runPerRow } from '../../services/governed';
