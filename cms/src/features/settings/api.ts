import { api } from '../../services/api';
import type { SettingsResponse, SystemPosture, UserPreferences } from './preferences';

/**
 * Settings Center API service. Every shape mirrors backend/src/routes/settings.js
 * (mounted at /admin/settings) — nothing invented here. Account endpoints
 * (sessions, MFA) stay under /auth and are reused by the Account tab.
 */
export const settingsApi = {
  /** GET /admin/settings — the signed-in user's preferences + option values. */
  get: () => api.get<SettingsResponse>('/admin/settings'),

  /** PATCH /admin/settings — partial preference update (whitelisted keys). */
  patch: (patch: Partial<UserPreferences>) =>
    api.patch<{ preferences: UserPreferences }>('/admin/settings', patch),

  /** GET /admin/settings/system — read-only infrastructure posture. */
  system: () => api.get<SystemPosture>('/admin/settings/system'),

  /** PATCH /admin/settings/password — self-service password change. */
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ ok: true }>('/admin/settings/password', { currentPassword, newPassword }),
};
