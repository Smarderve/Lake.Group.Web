/**
 * Corporate metrics API service (Phase 16). Mirrors the metrics router
 * (backend/src/routes/metrics.js + backend/src/lib/metrics.js) – nothing
 * invented:
 *
 *   GET    /admin/metrics              – full list (all statuses)
 *   GET    /admin/metrics/:id          – one metric (by id or key) + versions
 *   POST   /admin/metrics              – create → DRAFT            (EDITOR+)
 *   PATCH  /admin/metrics/:id          – edit → reopens DRAFT      (EDITOR+)
 *   POST   /admin/metrics/:id/submit   – DRAFT → IN_REVIEW         (EDITOR+)
 *   POST   /admin/metrics/:id/approve  – IN_REVIEW → APPROVED      (REVIEWER+)
 *   POST   /admin/metrics/:id/publish  – APPROVED → PUBLISHED      (REVIEWER+)
 *   POST   /admin/metrics/:id/verify   – re-check, clears stale    (EDITOR+)
 *   POST   /admin/metrics/:id/rollback – restore prior published    (SUPER_ADMIN)
 *
 * Unlike the governed router there is NO archive transition and NO
 * reject/schedule – the metric's value goes live only after approve +
 * publish, and re-verification never changes the value or the workflow.
 * Detail responses nest under `metric`; versions carry value/status/
 * changedBy/reason per mutation.
 */

import { api } from '../../services/api';
import type { VersionRow, WorkflowStatus } from '../../types/api';

export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED';

export const VERIFICATION_STATUSES: VerificationStatus[] = ['UNVERIFIED', 'VERIFIED'];

/** A single governable corporate fact. */
export interface MetricRow {
  id: string;
  key: string;
  label: string;
  value: string;
  unit: string | null;
  ownerId: string | null;
  ownerEmail: string | null;
  source: string;
  verificationStatus: VerificationStatus;
  verificationDate: string | null;
  verificationNote: string | null;
  effectiveDate: string | null;
  status: WorkflowStatus;
  /** JSON array of pages/components that display this figure (Phase 0 audit). */
  consumers: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Create body – mirrors metricBaseSchema (validators/metrics.js). */
export interface MetricInput {
  key: string;
  label: string;
  value: string;
  unit?: string;
  source: string;
  reason: string;
  effectiveDate?: string;
  consumers?: string[];
}

export const metricApi = {
  list: () => api.get<{ metrics: MetricRow[] }>('/admin/metrics'),
  get: (idOrKey: string) =>
    api.get<{ metric: MetricRow; versions: VersionRow[] }>(`/admin/metrics/${idOrKey}`),
  create: (input: MetricInput) => api.post<{ metric: MetricRow }>('/admin/metrics', input),
  update: (id: string, input: Omit<MetricInput, 'key'>) =>
    api.patch<{ metric: MetricRow }>(`/admin/metrics/${id}`, input),
  submit: (id: string) => api.post<{ metric: MetricRow }>(`/admin/metrics/${id}/submit`, {}),
  approve: (id: string) => api.post<{ metric: MetricRow }>(`/admin/metrics/${id}/approve`, {}),
  publish: (id: string) => api.post<{ metric: MetricRow }>(`/admin/metrics/${id}/publish`, {}),
  /** Re-verify a fact – clears the stale flag without touching value/status. */
  verify: (id: string, input: { note?: string; verificationDate?: string }) =>
    api.post<{ metric: MetricRow }>(`/admin/metrics/${id}/verify`, input),
  /** Restore the most recent previously published value (SUPER_ADMIN only). */
  rollback: (id: string, reason?: string) =>
    api.post<{ metric: MetricRow }>(`/admin/metrics/${id}/rollback`, { reason }),
};

/**
 * Stale-data rule – the client mirror of backend isStaleMetric() using the
 * backend default window (config.js DEFAULT_METRIC_STALE_DAYS = 180). A fact
 * is stale when it was never verified, or its last verification is older than
 * the window. Used for the list's verification column + stale filter.
 */
export const STALE_WINDOW_DAYS = 180;

export function isStaleMetric(
  row: Pick<MetricRow, 'verificationStatus' | 'verificationDate'>,
): boolean {
  if (row.verificationStatus === 'VERIFIED' && row.verificationDate) {
    const cutoff = Date.now() - STALE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return new Date(row.verificationDate).getTime() < cutoff;
  }
  return true;
}
