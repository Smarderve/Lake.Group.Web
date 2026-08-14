/**
 * Scheduled Publishing API service (spec §24). Mirrors the backend endpoints
 * exactly – nothing invented:
 *
 *   GET  /admin/publish-schedules                – all PENDING schedules,
 *                                                  soonest first, with the
 *                                                  entity label + status
 *                                                  (any authenticated user)
 *   POST /admin/publish-schedules/:id/cancel     – cancel one (SUPER_ADMIN +
 *                                                  recent auth; entity stays
 *                                                  APPROVED)
 *   POST /admin/:route/:id/schedule {publishAt}  – schedule an APPROVED
 *                                                  record (EDITOR+ recent;
 *                                                  rescheduling replaces the
 *                                                  pending schedule) – used by
 *                                                  the review screen's
 *                                                  "Schedule" action
 */

import { api } from '../../services/api';
import type { ScheduleRow, WorkflowStatus } from '../../types/api';

export interface PublishScheduleRow extends ScheduleRow {
  label: string | null;
  entityStatus: WorkflowStatus | null;
}

export interface PublishSchedulesResponse {
  schedules: PublishScheduleRow[];
}

export const scheduledApi = {
  /** All PENDING schedules, soonest first. */
  list: () => api.get<PublishSchedulesResponse>('/admin/publish-schedules'),
  /** Cancel a PENDING schedule – the entity stays APPROVED. */
  cancel: (id: string) => api.post(`/admin/publish-schedules/${id}/cancel`),
  /** Schedule (or reschedule) an APPROVED record for a future publishAt. */
  schedule: (route: string, id: string, publishAt: string, reason?: string) =>
    api.post(`/admin/${route}/${id}/schedule`, { publishAt, reason }),
};
