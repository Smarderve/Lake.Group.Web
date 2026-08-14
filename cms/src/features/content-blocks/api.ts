/**
 * Content blocks API service (Phase 15). Mirrors the governed router
 * (backend/src/routes/governed.js + backend/src/lib/cms-config.js) for route
 * `content-blocks` – nothing invented:
 *
 *   GET    /admin/content-blocks        – full list (all statuses)
 *   GET    /admin/content-blocks/:id    – detail + versions
 *   POST   /admin/content-blocks        – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/content-blocks/:id    – edit → DRAFT         (EDITOR+)
 *   POST   /admin/content-blocks/:id/…  – the standard governed transitions
 *
 * The Prisma delegate for model ContentBlock is `contentBlock` – the detail
 * response nests the record under that key. List rows nest under the route
 * slug `content-blocks`. `key` is the reusable identity – immutable after
 * creation (contentBlockUpdateSchema omits it).
 */

import { api } from '../../services/api';
import { governedWorkflow } from '../../services/governed';
import type { VersionRow, WorkflowStatus } from '../../types/api';

export type ContentBlockType = 'RICHTEXT' | 'STAT_HIGHLIGHT' | 'QUOTE' | 'CALLOUT';

export const CONTENT_BLOCK_TYPES: ContentBlockType[] = [
  'RICHTEXT',
  'STAT_HIGHLIGHT',
  'QUOTE',
  'CALLOUT',
];

export interface ContentBlockRow {
  id: string;
  key: string;
  type: ContentBlockType;
  content: Record<string, unknown>;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body – mirrors contentBlockCreateSchema (validators/cms.js). */
export interface ContentBlockInput {
  key?: string;
  type: ContentBlockType;
  /** Structured block payload – a JSON object (richtext json, quote text, ...). */
  content: Record<string, unknown>;
  reason: string;
}

export const contentBlockApi = {
  list: () => api.get<{ 'content-blocks': ContentBlockRow[] }>('/admin/content-blocks'),
  get: (id: string) =>
    api.get<{ contentBlock: ContentBlockRow; versions: VersionRow[] }>(`/admin/content-blocks/${id}`),
  create: (input: ContentBlockInput) =>
    api.post<{ contentBlock: ContentBlockRow }>('/admin/content-blocks', input),
  update: (id: string, input: ContentBlockInput) =>
    api.patch<{ contentBlock: ContentBlockRow }>(`/admin/content-blocks/${id}`, input),
  ...governedWorkflow<ContentBlockRow>('content-blocks'),
};
