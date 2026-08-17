/**
 * Dashboard API service (spec §10). Mirrors the backend admin endpoints the
 * dashboard consumes – nothing invented:
 *
 *   GET /admin/companies|news|media|metrics   – KPI counts (any role)
 *   GET /admin/review-queue                   – needs attention (REVIEWER+)
 *   GET /admin/audit-log                      – recent activity (SUPER_ADMIN)
 *   GET /admin/users                          – actor email map for the feed
 *   GET /admin/notifications                  – fallback feed (any role)
 */

import { api } from '../../services/api';
import type { AuditEntry, NotificationRow, ReviewQueueItem, ScheduleRow, User } from '../../types/api';

export interface ReviewQueueResponse {
  inReview: ReviewQueueItem[];
  approvedAwaitingPublish: { entityType: string; route: string; id: string; label: string }[];
  scheduled: ScheduleRow[];
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface NotificationsResponse {
  notifications: NotificationRow[];
  unreadCount: number;
}

export interface UsersResponse {
  users: User[];
}

/** A governed list row – every entity exposes at least id + status. */
export interface GovernedRow {
  id: string;
  status: string;
  [key: string]: unknown;
}

/** GET /admin/:route → { [route]: rows[] }. */
export interface GovernedListResponse {
  [route: string]: GovernedRow[];
}

export const dashboardApi = {
  reviewQueue: () => api.get<ReviewQueueResponse>('/admin/review-queue'),
  auditLog: (limit = 8) => api.get<AuditLogResponse>('/admin/audit-log', { params: { limit } }),
  users: () => api.get<UsersResponse>('/admin/users'),
  notifications: () => api.get<NotificationsResponse>('/admin/notifications'),
  governed: (route: string) => api.get<GovernedListResponse>(`/admin/${route}`),
};
