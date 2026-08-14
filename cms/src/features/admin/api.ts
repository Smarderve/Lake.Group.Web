import { api } from '../../services/api';
import type { AuditEntry, NotificationRow, Role } from '../../types/api';

export interface AdminUser {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  db: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}

export const adminApi = {
  users: () => api.get<{ users: AdminUser[] }>('/admin/users'),
  changeRole: (id: string, role: Role) =>
    api.patch<{ user: AdminUser }>(`/admin/users/${id}/role`, { role }),
  resetPassword: (id: string, password: string) =>
    api.patch<{ ok: true }>(`/admin/users/${id}/password`, { password }),
  revokeSessions: (id: string) =>
    api.post<{ ok: true; revokedSessions: number }>(`/admin/users/${id}/revoke-sessions`, {}),
  notifications: () =>
    api.get<{ notifications: NotificationRow[]; unreadCount: number }>('/admin/notifications'),
  markNotificationRead: (id: string) =>
    api.post<{ notification: NotificationRow }>(`/admin/notifications/${id}/read`, {}),
  markAllNotificationsRead: () =>
    api.post<{ markedRead: number }>('/admin/notifications/read-all', {}),
  auditLog: (params: { limit: number; offset: number; action?: string; actorId?: string }) =>
    api.get<AuditLogResponse>('/admin/audit-log', { params }),
  ping: () =>
    api.get<{ ok: true; message: string; user: AdminUser }>('/admin/ping'),
  health: () => api.get<HealthResponse>('/health'),
};
