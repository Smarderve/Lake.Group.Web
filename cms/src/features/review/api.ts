/**
 * Review queue API service (spec §23). Mirrors the backend endpoints the
 * review screens consume – nothing invented:
 *
 *   GET  /admin/review-queue                    – queue (REVIEWER+)
 *   GET  /admin/:route/:id                      – record + version history
 *   GET  /admin/:route/:id/impact               – pending-vs-current diff
 *   POST /admin/:route/:id/approve  { reason? } – IN_REVIEW → APPROVED
 *   POST /admin/:route/:id/reject   { reason }  – IN_REVIEW → DRAFT
 *   POST /admin/:route/:id/publish  { reason? } – APPROVED → PUBLISHED
 */

import { api } from '../../services/api';
import type { ReviewQueueItem, ScheduleRow, VersionRow, WorkflowStatus } from '../../types/api';

export interface ReviewQueueResponse {
  inReview: ReviewQueueItem[];
  approvedAwaitingPublish: { entityType: string; route: string; id: string; label: string }[];
  scheduled: ScheduleRow[];
}

/** GET /admin/:route/:id – key is the entity model name (news, company, …). */
export interface GovernedDetailResponse {
  versions: VersionRow[];
  [entity: string]: unknown;
}

/** GET /admin/:route/:id/impact – pending vs current diff + dependents. */
export interface ImpactResponse {
  entityType: string;
  route: string;
  status: WorkflowStatus;
  entity: Record<string, unknown>;
  current: Record<string, unknown> | null;
  pending: {
    data: Record<string, unknown>;
    status: WorkflowStatus;
    changedBy: string | null;
    createdAt: string | null;
    reason: string | null;
  } | null;
  diff: Record<string, { from: unknown; to: unknown }>;
  references: { type: string; id: string; label: string; field?: string }[];
  versionCount: number;
}

export const reviewApi = {
  queue: () => api.get<ReviewQueueResponse>('/admin/review-queue'),
  detail: (route: string, id: string) => api.get<GovernedDetailResponse>(`/admin/${route}/${id}`),
  impact: (route: string, id: string) => api.get<ImpactResponse>(`/admin/${route}/${id}/impact`),
  approve: (route: string, id: string, reason?: string) =>
    api.post(`/admin/${route}/${id}/approve`, { reason }),
  reject: (route: string, id: string, reason: string) =>
    api.post(`/admin/${route}/${id}/reject`, { reason }),
  publish: (route: string, id: string, reason?: string) =>
    api.post(`/admin/${route}/${id}/publish`, { reason }),
};
