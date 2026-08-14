import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import archiveOutline from '@iconify-icons/mdi/archive-outline';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import plus from '@iconify-icons/mdi/plus';
import { Icon } from '@iconify/react';
import { useAuth } from '../auth/AuthProvider';
import { companyApi } from '../companies/api';
import { locationApi } from '../geography/api';
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
import { runPerRow } from '../../services/governed';
import { contactApi, CONTACT_TYPES, type ContactRow } from './api';

/**
 * Contacts collection (Phase 15) – the universal DataTable pattern against the
 * real governed endpoint. Company/location names resolve client-side.
 */
export function ContactsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [archiveTarget, setArchiveTarget] = useState<ContactRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const query = useQuery({
    queryKey: ['admin-contacts'],
    queryFn: contactApi.list,
    select: (data) => data.contacts,
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
    void queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  }, [queryClient]);

  const confirmArchive = useCallback(async (row: ContactRow) => {
    setArchiving(true);
    try {
      const { ok } = await runPerRow([row], (id) => contactApi.archive(id));
      if (ok > 0) invalidate();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }, [invalidate]);

  const columns = useMemo<Column<ContactRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{row.name}</span>
            <p className="truncate text-xs text-ink-faint">{row.email || '–'}</p>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Type',
        hideBelow: 'md',
        sortValue: (row) => row.type,
        cell: (row) => (
          <span className="text-sm text-ink-muted">{row.type.replace('_', ' ')}</span>
        ),
      },
      {
        key: 'company',
        header: 'Company',
        hideBelow: 'lg',
        sortValue: (row) => companyNames.get(row.companyId ?? '') ?? '',
        cell: (row) => (
          <span className="text-sm text-ink-muted">
            {row.companyId ? companyNames.get(row.companyId) ?? '–' : '–'}
          </span>
        ),
      },
      {
        key: 'location',
        header: 'Location',
        hideBelow: 'lg',
        sortValue: (row) => locationNames.get(row.locationId ?? '') ?? '',
        cell: (row) => (
          <span className="text-sm text-ink-muted">
            {row.locationId ? locationNames.get(row.locationId) ?? '–' : '–'}
          </span>
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
          const rowActions: RowAction<ContactRow>[] = [
            {
              id: 'edit',
              label: 'Edit',
              icon: pencilOutline,
              disabled: !canEdit(user?.role),
              onClick: (target) => navigate(`/app/contacts/${target.id}/edit`),
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

  const bulkActions = useMemo<BulkAction<ContactRow>[]>(() => {
    const role = user?.role;
    return [
      {
        id: 'submit',
        label: 'Submit for review',
        allowed: canEdit(role),
        appliesTo: (row) => row.status === 'DRAFT',
        run: (rows) => runPerRow(rows, (id) => contactApi.submit(id)),
      },
      {
        id: 'approve',
        label: 'Approve',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'IN_REVIEW',
        run: (rows) => runPerRow(rows, (id) => contactApi.approve(id)),
      },
      {
        id: 'publish',
        label: 'Publish',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'APPROVED',
        run: (rows) => runPerRow(rows, (id) => contactApi.publish(id)),
      },
      {
        id: 'archive',
        label: 'Archive',
        allowed: isSuperAdmin(role),
        variant: 'destructive',
        appliesTo: (row) => row.status !== 'ARCHIVED',
        confirmTitle: 'Archive selected contacts',
        confirmDescription: (count) =>
          `This removes ${count} ${count === 1 ? 'contact' : 'contacts'} from the published site and closes their workflow. This cannot be undone from the CMS.`,
        run: (rows) => runPerRow(rows, (id) => contactApi.archive(id)),
      },
    ];
  }, [user?.role]);

  return (
    <>
      <CollectionPage<ContactRow>
        title="Contacts"
        description="Manage the public contact directory and who it is shown to."
        rows={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        columns={columns}
        rowKey={(row) => row.id}
        searchFields={(row) => [
          row.name,
          row.email ?? '',
          row.phone ?? '',
          row.type,
          companyNames.get(row.companyId ?? '') ?? '',
          locationNames.get(row.locationId ?? '') ?? '',
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
            id: 'type',
            label: 'Type',
            options: CONTACT_TYPES.map((type) => ({
              value: type,
              label: type.replace('_', ' '),
            })),
            match: (row, value) => row.type === value,
          },
        ]}
        sortAccessors={{
          name: (row) => row.name,
          type: (row) => row.type,
          company: (row) => companyNames.get(row.companyId ?? '') ?? '',
          location: (row) => locationNames.get(row.locationId ?? '') ?? '',
          status: (row) => WORKFLOW_STATUSES.indexOf(row.status),
          updatedAt: (row) => new Date(row.updatedAt).getTime(),
        }}
        initialSort={{ key: 'updatedAt', dir: 'desc' }}
        emptyTitle="No contacts yet"
        emptyDescription="Contacts appear here once they're created – use “Add contact” to start a draft."
        primaryAction={
          canEdit(user?.role) ? (
            <Link to="/app/contacts/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              <Icon icon={plus} className="h-4 w-4" aria-hidden="true" />
              Add contact
            </Link>
          ) : undefined
        }
        bulkActions={bulkActions}
        onBulkComplete={invalidate}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive contact"
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
