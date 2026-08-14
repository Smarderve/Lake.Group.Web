import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import archiveOutline from '@iconify-icons/mdi/archive-outline';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import { useAuth } from '../auth/AuthProvider';
import { companyApi } from '../companies/api';
import { CollectionPage } from '../collections/CollectionPage';
import { RowActions } from '../collections/RowActions';
import type { BulkAction, RowAction } from '../collections/types';
import { StatusBadge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Column } from '../../components/ui/DataTable';
import { relativeTime } from '../../utils/format';
import { canEdit, canReview, isSuperAdmin } from '../../utils/permissions';
import { WORKFLOW_STATUSES } from '../../types/api';
import { facilityApi, locationApi, runPerRow, type FacilityRow } from './api';

/**
 * Facilities collection (Phases 13-14) – the universal DataTable pattern
 * against the real governed endpoint. Company and location names resolve
 * client-side from the governed lists; the facility editor (with the map
 * preview) lives in the Phase 14 editor pages.
 */
export function FacilitiesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [archiveTarget, setArchiveTarget] = useState<FacilityRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const query = useQuery({
    queryKey: ['admin-facilities'],
    queryFn: facilityApi.list,
    select: (data) => data.facilities,
  });
  const companies = useQuery({
    queryKey: ['admin-companies'],
    queryFn: companyApi.list,
    select: (data) => data.companies,
    staleTime: 5 * 60 * 1000,
  });
  const locations = useQuery({
    queryKey: ['admin-locations'],
    queryFn: locationApi.list,
    select: (data) => data.locations,
    staleTime: 5 * 60 * 1000,
  });

  const companyNames = useMemo(
    () => new Map((companies.data ?? []).map((c) => [c.id, c.name])),
    [companies.data],
  );
  const locationNames = useMemo(
    () => new Map((locations.data ?? []).map((l) => [l.id, l.name])),
    [locations.data],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-facilities'] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  }, [queryClient]);

  const confirmArchive = useCallback(async (row: FacilityRow) => {
    setArchiving(true);
    try {
      const { ok } = await runPerRow([row], (id) => facilityApi.archive(id));
      if (ok > 0) invalidate();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }, [invalidate]);

  const columns = useMemo<Column<FacilityRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Facility',
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{row.name}</span>
            {row.markerLabel && <p className="truncate text-xs text-ink-faint">{row.markerLabel}</p>}
          </div>
        ),
      },
      {
        key: 'company',
        header: 'Company',
        hideBelow: 'lg',
        sortValue: (row) => companyNames.get(row.companyId) ?? '',
        cell: (row) => (
          <span className="text-sm text-ink-muted">{companyNames.get(row.companyId) ?? '–'}</span>
        ),
      },
      {
        key: 'location',
        header: 'Location',
        hideBelow: 'md',
        sortValue: (row) => locationNames.get(row.locationId) ?? '',
        cell: (row) => (
          <span className="text-sm text-ink-muted">{locationNames.get(row.locationId) ?? '–'}</span>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        hideBelow: 'md',
        sortValue: (row) => row.category ?? '',
        cell: (row) => <span className="text-sm text-ink-muted">{row.category ?? '–'}</span>,
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
          const rowActions: RowAction<FacilityRow>[] = [
            {
              id: 'edit',
              label: 'Edit',
              icon: pencilOutline,
              disabled: !canEdit(user?.role),
              onClick: (target) => navigate(`/app/facilities/${target.id}/edit`),
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
    [user?.role, companyNames, locationNames, navigate],
  );

  const bulkActions = useMemo<BulkAction<FacilityRow>[]>(() => {
    const role = user?.role;
    return [
      {
        id: 'submit',
        label: 'Submit for review',
        allowed: canEdit(role),
        appliesTo: (row) => row.status === 'DRAFT',
        run: (rows) => runPerRow(rows, (id) => facilityApi.submit(id)),
      },
      {
        id: 'approve',
        label: 'Approve',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'IN_REVIEW',
        run: (rows) => runPerRow(rows, (id) => facilityApi.approve(id)),
      },
      {
        id: 'publish',
        label: 'Publish',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'APPROVED',
        run: (rows) => runPerRow(rows, (id) => facilityApi.publish(id)),
      },
      {
        id: 'archive',
        label: 'Archive',
        allowed: isSuperAdmin(role),
        variant: 'destructive',
        appliesTo: (row) => row.status !== 'ARCHIVED',
        confirmTitle: 'Archive selected facilities',
        confirmDescription: (count) =>
          `This removes ${count} ${count === 1 ? 'facility' : 'facilities'} from the published site and closes their workflow. This cannot be undone from the CMS.`,
        run: (rows) => runPerRow(rows, (id) => facilityApi.archive(id)),
      },
    ];
  }, [user?.role]);

  return (
    <>
      <CollectionPage<FacilityRow>
        title="Facilities"
        description="The bottom of the geographic registry – Lake Group's physical sites, each tied to a location and a company."
        rows={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        columns={columns}
        rowKey={(row) => row.id}
        searchFields={(row) => [
          row.name,
          row.markerLabel ?? '',
          row.category ?? '',
          companyNames.get(row.companyId) ?? '',
          locationNames.get(row.locationId) ?? '',
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
            id: 'company',
            label: 'Company',
            options: (companies.data ?? []).map((c) => ({ value: c.id, label: c.name })),
            match: (row, value) => row.companyId === value,
          },
        ]}
        sortAccessors={{
          name: (row) => row.name,
          company: (row) => companyNames.get(row.companyId) ?? '',
          location: (row) => locationNames.get(row.locationId) ?? '',
          category: (row) => row.category ?? '',
          status: (row) => WORKFLOW_STATUSES.indexOf(row.status),
          updatedAt: (row) => new Date(row.updatedAt).getTime(),
        }}
        initialSort={{ key: 'name', dir: 'asc' }}
        emptyTitle="No facilities yet"
        emptyDescription="Facilities appear here once they're created."
        bulkActions={bulkActions}
        onBulkComplete={invalidate}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive facility"
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
