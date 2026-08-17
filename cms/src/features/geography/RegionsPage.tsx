import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import archiveOutline from '@iconify-icons/mdi/archive-outline';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import plus from '@iconify-icons/mdi/plus';
import { Icon } from '@iconify/react';
import { useAuth } from '../auth/AuthProvider';
import { CollectionPage } from '../collections/CollectionPage';
import { RowActions } from '../collections/RowActions';
import type { BulkAction, RowAction } from '../collections/types';
import { StatusBadge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { buttonVariants } from '../../components/ui/Button';
import type { Column } from '../../components/ui/DataTable';
import { relativeTime } from '../../utils/format';
import { canEdit, canReview, isSuperAdmin } from '../../utils/permissions';
import { WORKFLOW_STATUSES } from '../../types/api';
import { countryApi, regionApi, runPerRow, type RegionRow } from './api';

/**
 * Regions collection (Phase 13) – the universal DataTable pattern against the
 * real governed endpoint. The country column resolves the region's country
 * client-side from the governed countries list; Edit opens the tabbed editor.
 */
export function RegionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [archiveTarget, setArchiveTarget] = useState<RegionRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const query = useQuery({
    queryKey: ['admin-regions'],
    queryFn: regionApi.list,
    select: (data) => data.regions,
  });
  const countries = useQuery({
    queryKey: ['admin-countries'],
    queryFn: countryApi.list,
    select: (data) => data.countries,
    staleTime: 5 * 60 * 1000,
  });

  const countryNames = useMemo(
    () => new Map((countries.data ?? []).map((c) => [c.id, c.name])),
    [countries.data],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-regions'] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  }, [queryClient]);

  const confirmArchive = useCallback(async (row: RegionRow) => {
    setArchiving(true);
    try {
      const { ok } = await runPerRow([row], (id) => regionApi.archive(id));
      if (ok > 0) invalidate();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }, [invalidate]);

  const columns = useMemo<Column<RegionRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Region',
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            to={`/app/regions/${row.id}/edit`}
            className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline underline-offset-2"
          >
            {row.name}
          </Link>
        ),
      },
      {
        key: 'country',
        header: 'Country',
        hideBelow: 'md',
        sortValue: (row) => countryNames.get(row.countryId) ?? '',
        cell: (row) => (
          <span className="text-sm text-ink-muted">{countryNames.get(row.countryId) ?? '–'}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortValue: (row) => WORKFLOW_STATUSES.indexOf(row.status),
        cell: (row) => <StatusBadge status={row.status} />,
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
          const rowActions: RowAction<RegionRow>[] = [
            {
              id: 'edit',
              label: 'Edit',
              icon: pencilOutline,
              disabled: !canEdit(user?.role),
              onClick: (target) => navigate(`/app/regions/${target.id}/edit`),
            },
            {
              id: 'archive',
              label: 'Archive',
              icon: archiveOutline,
              destructive: true,
              disabled: row.status === 'ARCHIVED' || !isSuperAdmin(user?.role),
              onClick: (target) => setArchiveTarget(target),
            },
          ];
          return <RowActions row={row} actions={rowActions} label={`Actions for ${row.name}`} />;
        },
      },
    ],
    [user?.role, navigate, countryNames],
  );

  const bulkActions = useMemo<BulkAction<RegionRow>[]>(() => {
    const role = user?.role;
    return [
      {
        id: 'submit',
        label: 'Submit for review',
        allowed: canEdit(role),
        appliesTo: (row) => row.status === 'DRAFT',
        run: (rows) => runPerRow(rows, (id) => regionApi.submit(id)),
      },
      {
        id: 'approve',
        label: 'Approve',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'IN_REVIEW',
        run: (rows) => runPerRow(rows, (id) => regionApi.approve(id)),
      },
      {
        id: 'publish',
        label: 'Publish',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'APPROVED',
        run: (rows) => runPerRow(rows, (id) => regionApi.publish(id)),
      },
      {
        id: 'archive',
        label: 'Archive',
        allowed: isSuperAdmin(role),
        variant: 'destructive',
        appliesTo: (row) => row.status !== 'ARCHIVED',
        confirmTitle: 'Archive selected regions',
        confirmDescription: (count) =>
          `This removes ${count} ${count === 1 ? 'region' : 'regions'} from the published site and closes their workflow. This cannot be undone from the CMS.`,
        run: (rows) => runPerRow(rows, (id) => regionApi.archive(id)),
      },
    ];
  }, [user?.role]);

  return (
    <>
      <CollectionPage<RegionRow>
        title="Regions"
        description="The second tier of the geographic registry – sub-national areas within a country."
        rows={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        columns={columns}
        rowKey={(row) => row.id}
        searchFields={(row) => [row.name, countryNames.get(row.countryId) ?? '']}
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
            id: 'country',
            label: 'Country',
            options: (countries.data ?? []).map((c) => ({ value: c.id, label: c.name })),
            match: (row, value) => row.countryId === value,
          },
        ]}
        sortAccessors={{
          name: (row) => row.name,
          country: (row) => countryNames.get(row.countryId) ?? '',
          status: (row) => WORKFLOW_STATUSES.indexOf(row.status),
          updatedAt: (row) => new Date(row.updatedAt).getTime(),
        }}
        initialSort={{ key: 'name', dir: 'asc' }}
        emptyTitle="No regions yet"
        emptyDescription="Regions appear here once they're created – use “Add region” to start a draft."
        primaryAction={
          canEdit(user?.role) ? (
            <Link to="/app/regions/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              <Icon icon={plus} className="h-4 w-4" aria-hidden="true" />
              Add region
            </Link>
          ) : undefined
        }
        bulkActions={bulkActions}
        onBulkComplete={invalidate}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive region"
        description={
          archiveTarget
            ? `This removes "${archiveTarget.name}" from the published site and closes its workflow. This cannot be undone from the CMS.`
            : ''
        }
        confirmLabel="Archive"
        tone="danger"
        loading={archiving}
        onConfirm={() => {
          if (archiveTarget) void confirmArchive(archiveTarget);
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </>
  );
}
