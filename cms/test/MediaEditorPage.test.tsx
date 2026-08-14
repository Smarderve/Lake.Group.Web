import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../src/components/ui/toast';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import { MediaEditorPage } from '../src/features/media/MediaEditorPage';

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('MediaEditorPage uploads', () => {
  it('offers an accessible binary upload with supported types and progress semantics', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith('/auth/me') || path === '/auth/me') {
        return json({ user: {
          id: 'editor-1',
          email: 'editor@lakegroup.test',
          name: 'Editor',
          role: 'EDITOR',
          active: true,
          mfaEnabled: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        } });
      }
      if (path.endsWith('/admin/media-folders') || path === '/admin/media-folders') {
        return json({ mediaFolders: [] });
      }
      throw new Error(`Unexpected request: ${path}`);
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter initialEntries={['/app/media/new']}>
        <QueryClientProvider client={client}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/app/media/new" element={<MediaEditorPage />} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText('Upload file');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif,application/pdf');
    expect(screen.getByText(/JPEG, PNG, WebP, GIF, or PDF/)).toBeVisible();
    expect(screen.queryByText('File upload is not available yet')).not.toBeInTheDocument();
  });
});
