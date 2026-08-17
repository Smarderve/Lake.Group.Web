import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../src/components/ui/toast';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import { isStaleMetric, type MetricRow } from '../src/features/metrics/api';
import { MetricsPage } from '../src/features/metrics/MetricsPage';
import type { Role } from '../src/types/api';

const staleMetric: MetricRow = {
  id: 'metric-1',
  key: 'employees.total',
  label: 'Total employees',
  value: '1,200',
  unit: 'people',
  ownerId: null,
  ownerEmail: 'owner@lakegroup.test',
  source: 'FY2024 audited report',
  verificationStatus: 'VERIFIED',
  verificationDate: '2024-01-01T00:00:00.000Z',
  verificationNote: 'Checked against report',
  effectiveDate: '2024-12-31T00:00:00.000Z',
  status: 'PUBLISHED',
  consumers: ['About page'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderMetrics(role: Role) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith('/auth/me') || path === '/auth/me') {
        return json({
          user: {
            id: `user-${role}`,
            email: `${role.toLowerCase()}@lakegroup.test`,
            name: role,
            role,
            active: true,
            mfaEnabled: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        });
      }
      if (path.endsWith('/admin/metrics') || path === '/admin/metrics') {
        return json({ metrics: [staleMetric] });
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <AuthProvider>
            <MetricsPage />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Metrics data-truth surface', () => {
  it('identifies verified figures that are older than the stale window', () => {
    expect(isStaleMetric(staleMetric)).toBe(true);
    expect(
      isStaleMetric({
        verificationStatus: 'VERIFIED',
        verificationDate: new Date().toISOString(),
      }),
    ).toBe(false);
    expect(isStaleMetric({ verificationStatus: 'UNVERIFIED', verificationDate: null })).toBe(true);
  });

  it('shows source, verification, workflow, and re-check state to editors', async () => {
    renderMetrics('EDITOR');
    expect(await screen.findByText('Total employees')).toBeVisible();
    expect(screen.getByText('FY2024 audited report')).toBeVisible();
    expect(screen.getAllByText('Verified').some((element) => element.tagName === 'SPAN')).toBe(true);
    expect(screen.getAllByText('Needs re-check').some((element) => element.tagName === 'SPAN')).toBe(true);
    expect(screen.getAllByText('PUBLISHED').some((element) => element.tagName === 'SPAN')).toBe(true);
    expect(screen.getByRole('link', { name: 'Add metric' })).toBeVisible();
  });

  it('keeps metric mutation controls hidden from viewers', async () => {
    renderMetrics('VIEWER');
    expect(await screen.findByText('Total employees')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Add metric' })).not.toBeInTheDocument();
  });
});
