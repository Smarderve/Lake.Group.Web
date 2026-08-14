/**
 * CSR API service (Phase 15). Mirrors the governed router
 * (backend/src/routes/governed.js + backend/src/lib/cms-config.js) for route
 * `csr-entries` – nothing invented:
 *
 *   GET    /admin/csr-entries              – full list (all statuses)
 *   GET    /admin/csr-entries/:id          – detail + versions
 *   POST   /admin/csr-entries              – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/csr-entries/:id          – edit → DRAFT         (EDITOR+)
 *   POST   /admin/csr-entries/:id/…        – the standard governed transitions
 *
 * The Prisma delegate for model CSREntry is `cSREntry` – the detail response
 * nests the record under that key. List rows nest under the route slug
 * `csr-entries`.
 */

import { api } from '../../services/api';
import { governedWorkflow } from '../../services/governed';
import type { VersionRow, WorkflowStatus } from '../../types/api';

export interface CsrEntryRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  imageMediaId: string | null;
  companyId: string | null;
  date: string | null;
  period: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body – mirrors csrEntryCreateSchema (validators/cms.js). */
export interface CsrEntryInput {
  title: string;
  description?: string;
  category?: string;
  /** null detaches the image (media usage tracked server-side). */
  imageMediaId?: string | null;
  companyId?: string;
  date?: string;
  period?: string;
  reason: string;
}

export const csrEntryApi = {
  list: () => api.get<{ 'csr-entries': CsrEntryRow[] }>('/admin/csr-entries'),
  get: (id: string) =>
    api.get<{ cSREntry: CsrEntryRow; versions: VersionRow[] }>(`/admin/csr-entries/${id}`),
  create: (input: CsrEntryInput) =>
    api.post<{ cSREntry: CsrEntryRow }>('/admin/csr-entries', input),
  update: (id: string, input: CsrEntryInput) =>
    api.patch<{ cSREntry: CsrEntryRow }>(`/admin/csr-entries/${id}`, input),
  ...governedWorkflow<CsrEntryRow>('csr-entries'),
};
