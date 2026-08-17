import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardLayout } from '../src/layouts/DashboardLayout';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import { SettingsProvider } from '../src/features/settings/SettingsProvider';
import { PREFERENCES_DEFAULTS } from '../src/features/settings/preferences';

vi.mock('../src/components/navigation/TopBar', () => ({
  TopBar: ({ onMenuClick }: { onMenuClick: () => void }) => (
    <button type="button" onClick={onMenuClick}>
      Open navigation
    </button>
  ),
}));

vi.mock('../src/components/navigation/Sidebar', () => ({
  Sidebar: () => <a href="/app">Dashboard</a>,
}));

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
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

function renderLayout() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const method = init?.method ?? 'GET';
      if (path === '/auth/me') return json({ user: currentUser });
      if (path === '/admin/settings' && method === 'GET') {
        return json({ preferences: PREFERENCES_DEFAULTS, options: {}, defaults: PREFERENCES_DEFAULTS });
      }
      throw new Error(`Unexpected request: ${method} ${path}`);
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter initialEntries={['/app']}>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <SettingsProvider>
            <Routes>
              <Route path="/app" element={<DashboardLayout />}>
                <Route index element={<h1>Dashboard content</h1>} />
              </Route>
            </Routes>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DashboardLayout mobile navigation', () => {
  it('lets keyboard users skip repetitive navigation', async () => {
    renderLayout();

    expect(await screen.findByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('opens as a labelled modal, closes with Escape, and restores focus', async () => {
    renderLayout();

    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    await userEvent.click(trigger);

    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });
    expect(drawer).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Close navigation' })).toBeVisible();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
