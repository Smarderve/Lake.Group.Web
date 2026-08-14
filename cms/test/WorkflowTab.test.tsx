import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../src/components/ui/toast';
import { WorkflowTab, type WorkflowActions } from '../src/components/workflow/WorkflowTab';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import type { Role, WorkflowStatus } from '../src/types/api';

const actions: WorkflowActions = {
  submit: async () => undefined,
  approve: async () => undefined,
  publish: async () => undefined,
  archive: async () => undefined,
};

function renderWorkflow(role: Role, status: WorkflowStatus) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          user: {
            id: `user-${role}`,
            email: `${role.toLowerCase()}@lakegroup.test`,
            name: role,
            role,
            active: true,
            mfaEnabled: false,
            createdAt: '2026-08-13T12:00:00.000Z',
            updatedAt: '2026-08-13T12:00:00.000Z',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <WorkflowTab
              route="news"
              id="news-1"
              label="News article"
              entityKey="news"
              titleField="title"
              getDetail={async () => ({
                news: { id: 'news-1', title: 'Test article', status },
                versions: [],
              })}
              entityApi={actions}
            />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('WorkflowTab role and state controls', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows draft submission to editors without review or archive controls', async () => {
    renderWorkflow('EDITOR', 'DRAFT');
    expect(await screen.findByRole('button', { name: 'Submit for review' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('shows approval only to reviewers while content is in review', async () => {
    renderWorkflow('REVIEWER', 'IN_REVIEW');
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('shows publishing and archive controls to super administrators for approved content', async () => {
    renderWorkflow('SUPER_ADMIN', 'APPROVED');
    expect(await screen.findByRole('button', { name: 'Publish' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeVisible();
    expect(screen.getByText('APPROVED')).toBeVisible();
  });

  it('shows no mutating controls to viewers', async () => {
    renderWorkflow('VIEWER', 'DRAFT');
    expect(await screen.findByText('DRAFT')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Preview' })).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
