import { api } from '../../services/api';
import type { User } from '../../types/api';

/**
 * Auth API service (spec §36). Every shape mirrors backend/src/routes/auth.js
 * and docs/CMS-API-MAP.md §2 – nothing invented here.
 */

export interface LoginResult {
  user: User;
}

/** POST /auth/login returns either { user } or { mfaRequired: true }. */
export interface LoginResponse {
  user?: User;
  mfaRequired?: boolean;
}

export interface SessionDevice {
  ip: string | null;
  userAgent: string | null;
  since: string | null;
}

export interface SessionRow {
  sid: string;
  userId: string;
  role: string | null;
  createdAt: string;
  expiresAt: string;
  device: SessionDevice | null;
  current?: boolean;
}

export const authApi = {
  /** POST /auth/login – resolves with the user, or { mfaRequired: true }. */
  async login(email: string, password: string): Promise<LoginResponse> {
    return api.post<LoginResponse>('/auth/login', { email, password });
  },

  /** POST /auth/mfa/verify – completes a MFA-protected login (or MFA setup). */
  async verifyMfa(code: string): Promise<LoginResult> {
    return api.post<LoginResult>('/auth/mfa/verify', { code });
  },

  /** GET /auth/me – current session user. Throws 401 when unauthenticated. */
  async me(): Promise<LoginResult> {
    return api.get<LoginResult>('/auth/me');
  },

  /** POST /auth/logout – destroys the session server-side. */
  async logout(): Promise<{ ok: boolean }> {
    return api.post<{ ok: boolean }>('/auth/logout');
  },

  /** POST /auth/change-password – self-service password change. */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
    return api.post<{ ok: boolean }>('/auth/change-password', { currentPassword, newPassword });
  },

  /** GET /auth/sessions – the current user's active sessions. */
  async sessions(): Promise<{ sessions: SessionRow[] }> {
    return api.get<{ sessions: SessionRow[] }>('/auth/sessions');
  },

  /** DELETE /auth/sessions/:sid – revoke another of the user's sessions. */
  async revokeSession(sid: string): Promise<{ ok: boolean }> {
    return api.delete<{ ok: boolean }>(`/auth/sessions/${encodeURIComponent(sid)}`);
  },

  /** POST /auth/revoke-sessions – kill every session including this one. */
  async revokeAllSessions(): Promise<{ ok: boolean; revokedSessions: number }> {
    return api.post<{ ok: boolean; revokedSessions: number }>('/auth/revoke-sessions');
  },
};
