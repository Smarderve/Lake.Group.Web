import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../src/components/ui/toast';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import { LoginPage } from '../src/features/auth/pages/LoginPage';

function renderLogin() {
  const fetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  const result = render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
  return { ...result, fetchMock };
}

describe('LoginPage validation and accessibility', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects malformed credentials before sending a login request', async () => {
    const { fetchMock } = renderLogin();
    await screen.findByRole('heading', { name: 'Sign in' });
    await userEvent.type(screen.getByLabelText(/^Email/), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeVisible();
    expect(screen.getByText('Password is required')).toBeVisible();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('exposes the password visibility state to assistive technology', async () => {
    renderLogin();
    const toggle = await screen.findByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('has no automated accessibility violations', async () => {
    const { container } = renderLogin();
    await screen.findByRole('heading', { name: 'Sign in' });
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
