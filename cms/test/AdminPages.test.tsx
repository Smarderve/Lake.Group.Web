import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../src/components/ui/toast';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import { UsersPage } from '../src/features/admin/UsersPage';
import { NotificationsPage } from '../src/features/admin/NotificationsPage';
import { AuditLogPage } from '../src/features/admin/AuditLogPage';
import { SettingsPage } from '../src/features/settings/SettingsPage';
import { SettingsProvider } from '../src/features/settings/SettingsProvider';
import { PREFERENCES_DEFAULTS } from '../src/features/settings/preferences';

const settingsResponse = {
  preferences: PREFERENCES_DEFAULTS,
  options: {
    themes: ['light', 'dark', 'system'],
    languages: ['en', 'sw', 'ar', 'fr', 'pt', 'es'],
    dateFormats: ['en-GB', 'en-US'],
    numberFormats: ['en-US', 'en-GB'],
    densities: ['comfortable', 'compact'],
  },
  defaults: PREFERENCES_DEFAULTS,
};

const systemPosture = {
  status: 'ok',
  service: 'lake-group-backend',
  db: 'up',
  uptimeSeconds: 3600,
  timestamp: '2026-08-13T12:00:00.000Z',
  posture: {
    secureSessionCookies: true,
    originProtection: true,
    serverSideAuthorization: true,
    mfaEnabled: true,
    role: 'SUPER_ADMIN',
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const currentUser = {
  id: 'admin-1',
  email: 'admin@lakegroup.test',
  role: 'SUPER_ADMIN',
  active: true,
  mfaEnabled: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};

function renderAdminPage(page: React.ReactNode) {
  const requests: Array<{ method: string; path: string; body?: unknown }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({ method, path, body });
      if (path === '/auth/me') return json({ user: currentUser });
      if (path.startsWith('/admin/users') && method === 'GET') {
        return json({
          users: [
            currentUser,
            {
              id: 'editor-1',
              email: 'editor@lakegroup.test',
              role: 'EDITOR',
              active: true,
              mfaEnabled: false,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        });
      }
      if (path === '/admin/users/editor-1/role' && method === 'PATCH') {
        return json({ user: { ...currentUser, id: 'editor-1', email: 'editor@lakegroup.test', role: body.role } });
      }
      if (path === '/admin/users/editor-1/password' && method === 'PATCH') return json({ ok: true });
      if (path === '/admin/users/editor-1/revoke-sessions' && method === 'POST') {
        return json({ ok: true, revokedSessions: 2 });
      }
      if (path === '/admin/notifications' && method === 'GET') {
        return json({
          unreadCount: 1,
          notifications: [
            {
              id: 'notification-1',
              type: 'CONTENT_APPROVED',
              message: 'Annual report was approved',
              entityType: 'news',
              entityId: 'news-1',
              read: false,
              createdAt: '2026-08-13T12:00:00.000Z',
            },
          ],
        });
      }
      if (path === '/admin/notifications/read-all' && method === 'POST') return json({ markedRead: 1 });
      if (path === '/admin/notifications/notification-1/read' && method === 'POST') {
        return json({ notification: { id: 'notification-1', read: true } });
      }
      if (path.startsWith('/admin/audit-log')) {
        return json({
          entries: [
            {
              id: 'audit-1',
              actorId: 'admin-1',
              action: 'ROLE_CHANGE',
              resource: 'admin/users/editor-1/role',
              ip: '127.0.0.1',
              metadata: { from: 'VIEWER', to: 'EDITOR' },
              createdAt: '2026-08-13T12:00:00.000Z',
            },
          ],
          total: 26,
          limit: 25,
          offset: path.includes('offset=25') ? 25 : 0,
        });
      }
      if (path === '/admin/ping') return json({ ok: true, message: 'Admin access confirmed', user: currentUser });
      if (path === '/admin/settings' && method === 'GET') return json(settingsResponse);
      if (path === '/admin/settings/system' && method === 'GET') return json(systemPosture);
      if (path === '/health') {
        return json({
          status: 'ok',
          service: 'lake-group-backend',
          db: 'up',
          uptimeSeconds: 3600,
          timestamp: '2026-08-13T12:00:00.000Z',
        });
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <AuthProvider>
            <SettingsProvider>{page}</SettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return requests;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Administration screens', () => {
  it('changes another user role only after confirmation', async () => {
    const requests = renderAdminPage(<UsersPage />);
    const table = await screen.findByRole('table', { name: 'CMS users' });
    const row = within(table).getByText('editor@lakegroup.test').closest('tr');
    expect(row).not.toBeNull();
    const mobileList = screen.getByRole('list', { name: 'CMS users mobile' });
    expect(within(mobileList).getByText('editor@lakegroup.test')).toBeVisible();
    expect(within(mobileList).getByRole('button', { name: 'Reset password for editor@lakegroup.test' })).toBeVisible();
    await userEvent.selectOptions(within(row!).getByLabelText('Role for editor@lakegroup.test'), 'REVIEWER');
    expect(screen.getByRole('dialog', { name: 'Change user role' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Change role' }));
    expect(requests).toContainEqual({
      method: 'PATCH',
      path: '/admin/users/editor-1/role',
      body: { role: 'REVIEWER' },
    });
  });

  it('marks notifications read and exposes truthful unread state', async () => {
    const requests = renderAdminPage(<NotificationsPage />);
    expect(await screen.findByText('Annual report was approved')).toBeVisible();
    expect(screen.getByText('Unread')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(requests).toContainEqual({ method: 'POST', path: '/admin/notifications/read-all', body: {} });
  });

  it('filters and paginates the audit trail', async () => {
    const requests = renderAdminPage(<AuditLogPage />);
    expect(await screen.findByText('ROLE CHANGE')).toBeVisible();
    await userEvent.type(screen.getByLabelText('Action'), 'PUBLISH');
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(requests.some((request) => request.path.includes('action=PUBLISH'))).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(requests.some((request) => request.path.includes('offset=25'))).toBe(true);
  });

  it('keeps system health under Settings → System and never exposes secrets', async () => {
    renderAdminPage(<SettingsPage />);
    // The settings center lands on Appearance; infrastructure lives under System.
    await userEvent.click(await screen.findByRole('tab', { name: 'System' }));
    expect(await screen.findByText('All systems operational')).toBeVisible();
    expect(screen.getByText('Available')).toBeVisible();
    expect(screen.getByText('Secure session cookies')).toBeVisible();
    expect(screen.getByText('Server-side authorization')).toBeVisible();
    expect(screen.queryByText(/SESSION_SECRET|DATABASE_URL/)).not.toBeInTheDocument();
  });
});
