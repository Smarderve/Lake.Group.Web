/**
 * Pages API service – mirrors the governed `pages` route
 * (backend/src/lib/cms-config.js + validators/cms.js), nothing invented:
 *
 *   GET    /admin/pages                – full list (all statuses)
 *   GET    /admin/pages/:id            – detail + versions
 *   POST   /admin/pages                – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/pages/:id            – edit → DRAFT         (EDITOR+)
 *   POST   /admin/pages/:id/submit     – DRAFT → IN_REVIEW    (EDITOR+)
 *   POST   /admin/pages/:id/approve    – IN_REVIEW → APPROVED (REVIEWER+)
 *   POST   /admin/pages/:id/reject     – IN_REVIEW → DRAFT    (REVIEWER+, reason)
 *   POST   /admin/pages/:id/publish    – APPROVED → PUBLISHED (REVIEWER+)
 *   POST   /admin/pages/:id/unpublish  – PUBLISHED → DRAFT    (REVIEWER+)
 *   POST   /admin/pages/:id/archive    – → ARCHIVED           (SUPER_ADMIN)
 *
 * The Prisma delegate for model Page is `page` – the detail response nests the
 * record under that key. List rows nest under the route slug `pages`. `slug`
 * is immutable after creation (pageUpdateSchema omits it). `contentBlocks`
 * carries the ids of the ContentBlocks assembled on the page (snapshotExtra).
 */

import { api } from '../../services/api';
import { governedWorkflow } from '../../services/governed';
import type { VersionRow, WorkflowStatus } from '../../types/api';

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  layoutType: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  /** ContentBlock ids assembled on this page (detail only). */
  contentBlocks?: string[];
}

/** Create/update body – mirrors pageCreateSchema/pageUpdateSchema. */
export interface PageInput {
  slug?: string;
  title: string;
  layoutType?: string;
  contentBlocks?: string[];
  metaTitle?: string;
  metaDescription?: string;
  reason: string;
}

/** The layout types the backend accepts as free text (Page.layoutType). */
export const PAGE_LAYOUT_TYPES = ['home', 'standard', 'landing'] as const;

export const pageApi = {
  list: () => api.get<{ pages: PageRow[] }>('/admin/pages'),
  get: (id: string) =>
    api.get<{ page: PageRow; versions: VersionRow[] }>(`/admin/pages/${id}`),
  create: (input: PageInput) => api.post<{ page: PageRow }>('/admin/pages', input),
  update: (id: string, input: PageInput) =>
    api.patch<{ page: PageRow }>(`/admin/pages/${id}`, input),
  ...governedWorkflow<PageRow>('pages'),
};

export { runPerRow } from '../../services/governed';
