/**
 * Leadership API service (spec §12 – Phase 12).
 * Mirrors the governed router (backend/src/routes/governed.js) for route
 * `leadership` plus the child timeline router (backend/src/routes/children.js)
 * – nothing invented:
 *
 *   GET    /admin/leadership                    – full list (all statuses)
 *   GET    /admin/leadership/:id                – detail + versions
 *   POST   /admin/leadership                    – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/leadership/:id                – edit → DRAFT         (EDITOR+)
 *   POST   /admin/leadership/:id/submit         – DRAFT → IN_REVIEW    (EDITOR+)
 *   POST   /admin/leadership/:id/approve        – IN_REVIEW → APPROVED (REVIEWER+)
 *   POST   /admin/leadership/:id/reject         – IN_REVIEW → DRAFT    (REVIEWER+, reason)
 *   POST   /admin/leadership/:id/publish        – APPROVED → PUBLISHED (REVIEWER+)
 *   POST   /admin/leadership/:id/unpublish      – PUBLISHED → DRAFT    (REVIEWER+)
 *   POST   /admin/leadership/:id/archive        – → ARCHIVED           (SUPER_ADMIN)
 *
 *   GET    /admin/leadership/:id/events         – timeline (child router)
 *   POST   /admin/leadership/:id/events         – create event          (EDITOR+)
 *   PATCH  /admin/leadership/:id/events/:eventId – update event         (EDITOR+)
 *   DELETE /admin/leadership/:id/events/:eventId – delete event         (EDITOR+)
 *
 * The list endpoint nests rows under the route slug `leadership`; each event
 * write recomputes the leader's derived `currentStatus` server-side.
 */

import { api } from '../../services/api';
import type { VersionRow, WorkflowStatus } from '../../types/api';

/** A leadership row as returned by GET /admin/leadership. */
export interface LeadershipRow {
  id: string;
  name: string;
  position: string;
  bio: string | null;
  photo: string | null;
  photoMediaId: string | null;
  order: number;
  companyId: string | null;
  currentStatus: string; // derived from the timeline – ACTIVE | DEPARTED
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadershipListResponse {
  leadership: LeadershipRow[];
}

export interface LeadershipDetailResponse {
  leadership: LeadershipRow;
  versions: VersionRow[];
}

/** Create/update body – backend leadershipCreateSchema/leadershipUpdateSchema. */
export interface LeadershipInput {
  name: string;
  position: string;
  bio?: string;
  photo?: string;
  photoMediaId?: string | null;
  order?: number;
  companyId?: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Timeline (LeadershipEvent child router) – the leader's appointment history.
// ---------------------------------------------------------------------------

export const LEADERSHIP_EVENT_TYPES = ['APPOINTED', 'PROMOTED', 'REPLACED', 'DEPARTED'] as const;
export type LeadershipEventType = (typeof LEADERSHIP_EVENT_TYPES)[number];

export const LEADERSHIP_EVENT_LABELS: Record<LeadershipEventType, string> = {
  APPOINTED: 'Appointed',
  PROMOTED: 'Promoted',
  REPLACED: 'Replaced',
  DEPARTED: 'Departed',
};

export interface LeadershipEventRow {
  id: string;
  leadershipId: string;
  eventType: LeadershipEventType;
  date: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadershipEventInput {
  eventType: LeadershipEventType;
  date: string; // ISO timestamp
  notes?: string;
}

// ---------------------------------------------------------------------------
// Option rows for the editor form (same governed endpoints the site uses).
// ---------------------------------------------------------------------------

/** Company option row (GET /admin/companies). */
export interface CompanyOptionRow {
  id: string;
  name: string;
  status: WorkflowStatus;
}

/** Media row subset for the photo picker (GET /admin/media). */
export interface MediaOptionRow {
  id: string;
  url: string;
  altText: string | null;
  caption: string | null;
  variants: Record<string, string> | null;
  status: WorkflowStatus;
}

export const leadershipApi = {
  list: () => api.get<LeadershipListResponse>('/admin/leadership'),
  get: (id: string) => api.get<LeadershipDetailResponse>(`/admin/leadership/${id}`),
  create: (input: LeadershipInput) =>
    api.post<LeadershipDetailResponse>('/admin/leadership', input),
  update: (id: string, input: LeadershipInput) =>
    api.patch<LeadershipDetailResponse>(`/admin/leadership/${id}`, input),
  submit: (id: string) => api.post<LeadershipDetailResponse>(`/admin/leadership/${id}/submit`, {}),
  approve: (id: string) => api.post<LeadershipDetailResponse>(`/admin/leadership/${id}/approve`, {}),
  reject: (id: string, reason: string) =>
    api.post<LeadershipDetailResponse>(`/admin/leadership/${id}/reject`, { reason }),
  publish: (id: string) => api.post<LeadershipDetailResponse>(`/admin/leadership/${id}/publish`, {}),
  unpublish: (id: string) =>
    api.post<LeadershipDetailResponse>(`/admin/leadership/${id}/unpublish`, {}),
  archive: (id: string) =>
    api.post<LeadershipDetailResponse>(`/admin/leadership/${id}/archive`, {}),

  // Timeline events (child router – mounted under /admin/leadership).
  events: (id: string) => api.get<{ events: LeadershipEventRow[] }>(`/admin/leadership/${id}/events`),
  createEvent: (id: string, input: LeadershipEventInput) =>
    api.post<{ leadershipEvent: LeadershipEventRow }>(`/admin/leadership/${id}/events`, input),
  updateEvent: (id: string, eventId: string, input: LeadershipEventInput) =>
    api.patch<{ leadershipEvent: LeadershipEventRow }>(
      `/admin/leadership/${id}/events/${eventId}`,
      input,
    ),
  deleteEvent: (id: string, eventId: string) =>
    api.delete(`/admin/leadership/${id}/events/${eventId}`),

  // Option lists for the editor form.
  companies: () => api.get<{ companies: CompanyOptionRow[] }>('/admin/companies'),
  media: () => api.get<{ media: MediaOptionRow[] }>('/admin/media'),
};
