import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { api } from '../src/services/api';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../src/components/ui/toast';
import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';

const currentUser = {
  id: 'admin-1',
  email: 'admin@lakegroup.test',
  role: 'SUPER_ADMIN',
  active: true,
  mfaEnabled: false,
  createdAt: '2025-01-01T00:00:00.000Z',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Exposes a logout button so tests can drive the session lifecycle. */
function SessionHarness() {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={() => void logout()}>
      Sign out
    </button>
  );
}

/** Makes a real data API call so a 401 can propagate through the api layer. */
function DataProbe() {
  const [state, setState] = React.useState<'idle' | 'failed'>('idle');
  React.useEffect(() => {
    void api
      .get('/admin/news')
      .then(() => setState('idle'))
      .catch(() => setState('failed'));
  }, []);
  return <div>probe:{state}</div>;
}

function renderApp(fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal('fetch', fetchMock);
  const result = render(
    <MemoryRouter initialEntries={['/app/news']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/app/news"
              element={
                <ProtectedRoute>
                  <div>Protected news page</div>
                  <SessionHarness />
                  <DataProbe />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Sign in</div>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
  return { ...result, fetchMock };
}

describe('auth guard: logout, expiry, and restore redirect protected routes to login', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to /login when session restore fails (401 on /auth/me)', async () => {
    renderApp(async (input) => {
      const path = String(input);
      if (path === '/auth/me') {
        return json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, 401);
      }
      return json({});
    });

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('Protected news page')).not.toBeInTheDocument();
  });

  it('renders protected content once authenticated, then redirects to /login after logout', async () => {
    const user = userEvent.setup();
    renderApp(async (input) => {
      const path = String(input);
      if (path === '/auth/me') return json({ user: currentUser });
      if (path === '/auth/logout') return json({ ok: true });
      return json({});
    });

    expect(await screen.findByText('Protected news page')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    // Logout clears client auth state; the protected route must redirect.
    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('Protected news page')).not.toBeInTheDocument();
  });

  it('redirects to /login when any API call reports session loss (UNAUTHENTICATED)', async () => {
    const { fetchMock } = renderApp(async (input) => {
      const path = String(input);
      if (path === '/auth/me') return json({ user: currentUser });
      // A data endpoint returning 401 mid-session simulates expiry / revoke
      // (e.g. logout in another tab). The auth layer must flip state.
      return json({ error: { code: 'UNAUTHENTICATED', message: 'Session expired' } }, 401);
    });

    // The api layer's session-expired handler must flip auth state and
    // redirect the protected route — even though restore succeeded.
    await waitFor(() => expect(screen.getByText('Sign in')).toBeInTheDocument());
    expect(screen.queryByText('Protected news page')).not.toBeInTheDocument();
    // The 401 data call was actually made (the propagation path was real).
    expect(fetchMock.mock.calls.some(([input]) => String(input) === '/admin/news')).toBe(true);
  });
});
