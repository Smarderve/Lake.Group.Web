import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import plus from '@iconify-icons/mdi/plus';
import { Icon } from '@iconify/react';
import { useAuth } from '../auth/AuthProvider';
import { CollectionPage } from '../collections/CollectionPage';
import { RowActions } from '../collections/RowActions';
import type { BulkAction, RowAction } from '../collections/types';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { buttonVariants } from '../../components/ui/Button';
import type { Column } from '../../components/ui/DataTable';
import { relativeTime } from '../../utils/format';
import { canEdit, canReview } from '../../utils/permissions';
import { WORKFLOW_STATUSES } from '../../types/api';
import { runPerRow } from '../../services/governed';
import { metricApi, VERIFICATION_STATUSES, isStaleMetric, type MetricRow } from './api';

/**
 * Corporate metrics collection (Phase 16) – the data-truth surface: every
 * figure the public site shows, with its workflow state and verification
 * state side by side. Verification is the honest signal here – an
 * UNVERIFIED or stale figure needs a re-check, which the editor's
 * Verification tab records. Bulk actions cover submit/approve/publish only:
 * the metrics router has no archive transition.
 */
export function MetricsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: metricApi.list,
    select: (data) => data.metrics,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
  };

  const columns = useMemo<Column<MetricRow>[]>(
    () => [
      {
        key: 'value',
        header: 'Value',
        sortValue: (row) => row.value,
        cell: (row) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold tabular-nums text-ink">
              {row.value}
              {row.unit ? <span className="font-normal text-ink-muted"> {row.unit}</span> : null}
            </span>
            <p className="truncate text-xs text-ink-faint">{row.key}</p>
          </div>
        ),
      },
      {
        key: 'metric',
        header: 'Metric',
        sortValue: (row) => row.label,
        cell: (row) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{row.label}</span>
            <p className="truncate text-xs text-ink-faint">{row.source}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortValue: (row) => WORKFLOW_STATUSES.indexOf(row.status),
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'verification',
        header: 'Verification',
        hideBelow: 'md',
        sortValue: (row) => row.verificationStatus,
        cell: (row) => {
          const stale = isStaleMetric(row);
          return (
            <div className="flex flex-col items-start gap-1">
              <Badge tone={row.verificationStatus === 'VERIFIED' ? 'green' : 'neutral'}>
                {row.verificationStatus === 'VERIFIED' ? 'Verified' : 'Unverified'}
              </Badge>
              {stale && (
                <Badge tone="amber">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Needs re-check
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: 'owner',
        header: 'Owner',
        hideBelow: 'lg',
        sortValue: (row) => row.ownerEmail ?? '',
        cell: (row) => (
          <span className="text-sm text-ink-muted">{row.ownerEmail ?? '–'}</span>
        ),
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        align: 'right',
        sortValue: (row) => new Date(row.updatedAt).getTime(),
        cell: (row) => (
          <time dateTime={row.updatedAt} className="text-xs tabular-nums text-ink-muted">
            {relativeTime(row.updatedAt)}
          </time>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        className: 'w-12',
        cell: (row) => {
          const rowActions: RowAction<MetricRow>[] = [
            {
              id: 'edit',
              label: 'Edit',
              icon: pencilOutline,
              disabled: !canEdit(user?.role),
              onClick: (target) => navigate(`/app/metrics/${target.id}/edit`),
            },
          ];
          return <RowActions row={row} actions={rowActions} label={`Actions for ${row.label}`} />;
        },
      },
    ],
    [user?.role, navigate],
  );

  const bulkActions = useMemo<BulkAction<MetricRow>[]>(() => {
    const role = user?.role;
    return [
      {
        id: 'submit',
        label: 'Submit for review',
        allowed: canEdit(role),
        appliesTo: (row) => row.status === 'DRAFT',
        run: (rows) => runPerRow(rows, (id) => metricApi.submit(id)),
      },
      {
        id: 'approve',
        label: 'Approve',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'IN_REVIEW',
        run: (rows) => runPerRow(rows, (id) => metricApi.approve(id)),
      },
      {
        id: 'publish',
        label: 'Publish',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'APPROVED',
        run: (rows) => runPerRow(rows, (id) => metricApi.publish(id)),
      },
    ];
  }, [user?.role]);

  return (
    <CollectionPage<MetricRow>
      title="Corporate Metrics"
      description="The figures behind the public site – their workflow state and whether each has been re-checked recently."
      rows={query.data}
      loading={query.isLoading}
      error={query.error}
      onRetry={() => query.refetch()}
      columns={columns}
      rowKey={(row) => row.id}
      searchFields={(row) => [
        row.key,
        row.label,
        row.value,
        row.unit ?? '',
        row.source,
        row.ownerEmail ?? '',
        ...(row.consumers ?? []),
      ]}
      filters={[
        {
          id: 'status',
          label: 'Status',
          options: WORKFLOW_STATUSES.map((status) => ({
            value: status,
            label: status.replace('_', ' '),
          })),
          match: (row, value) => row.status === value,
        },
        {
          id: 'verification',
          label: 'Verification',
          options: VERIFICATION_STATUSES.map((status) => ({
            value: status,
            label: status === 'VERIFIED' ? 'Verified' : 'Unverified',
          })),
          match: (row, value) => row.verificationStatus === value,
        },
        {
          id: 'stale',
          label: 'Re-check',
          options: [
            { value: 'stale', label: 'Needs re-check' },
            { value: 'fresh', label: 'Fresh' },
          ],
          match: (row, value) =>
            value === 'stale' ? isStaleMetric(row) : !isStaleMetric(row),
        },
      ]}
      sortAccessors={{
        value: (row) => row.value,
        metric: (row) => row.label,
        status: (row) => WORKFLOW_STATUSES.indexOf(row.status),
        verification: (row) => row.verificationStatus,
        owner: (row) => row.ownerEmail ?? '',
        updatedAt: (row) => new Date(row.updatedAt).getTime(),
      }}
      initialSort={{ key: 'updatedAt', dir: 'desc' }}
      emptyTitle="No metrics yet"
      emptyDescription="Metrics appear here once they're created – use “Add metric” to record the first figure."
      primaryAction={
        canEdit(user?.role) ? (
          <Link to="/app/metrics/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            <Icon icon={plus} className="h-4 w-4" aria-hidden="true" />
            Add metric
          </Link>
        ) : undefined
      }
      bulkActions={bulkActions}
      onBulkComplete={invalidate}
    />
  );
}
