import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import archiveOutline from '@iconify-icons/mdi/archive-outline';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import plus from '@iconify-icons/mdi/plus';
import { Icon } from '@iconify/react';
import { useAuth } from '../auth/AuthProvider';
import { companyApi } from '../companies/api';
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
import { csrEntryApi, type CsrEntryRow } from './api';

/**
 * CSR collection (Phase 15) – the universal DataTable pattern against the real
 * governed endpoint. Company names resolve client-side.
 */
export function CsrPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [archiveTarget, setArchiveTarget] = useState<CsrEntryRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const query = useQuery({
    queryKey: ['admin-csr-entries'],
    queryFn: csrEntryApi.list,
    select: (data) => data['csr-entries'],
  });
  const companies = useQuery({
    queryKey: ['admin-companies'],
    queryFn: companyApi.list,
    select: (data) => data.companies,
    staleTime: 5 * 60 * 1000,
  });

  const companyNames = useMemo(
    () => new Map((companies.data ?? []).map((c) => [c.id, c.name])),
    [companies.data],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-csr-entries'] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  }, [queryClient]);

  const confirmArchive = useCallback(async (row: CsrEntryRow) => {
    setArchiving(true);
    try {
      const { ok } = await runPerRow([row], (id) => csrEntryApi.archive(id));
      if (ok > 0) invalidate();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }, [invalidate]);

  const columns = useMemo<Column<CsrEntryRow>[]>(
    () => [
      {
        key: 'title',
        header: 'Title',
        sortValue: (row) => row.title,
        cell: (row) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{row.title}</span>
            <p className="truncate text-xs text-ink-faint">{row.period || row.category || '–'}</p>
          </div>
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
          const rowActions: RowAction<CsrEntryRow>[] = [
            {
              id: 'edit',
              label: 'Edit',
              icon: pencilOutline,
              disabled: !canEdit(user?.role),
              onClick: (target) => navigate(`/app/csr/${target.id}/edit`),
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
          return <RowActions row={row} actions={rowActions} label={`Actions for ${row.title}`} />;
        },
      },
    ],
    [user?.role, companyNames, navigate],
  );

  const bulkActions = useMemo<BulkAction<CsrEntryRow>[]>(() => {
    const role = user?.role;
    return [
      {
        id: 'submit',
        label: 'Submit for review',
        allowed: canEdit(role),
        appliesTo: (row) => row.status === 'DRAFT',
        run: (rows) => runPerRow(rows, (id) => csrEntryApi.submit(id)),
      },
      {
        id: 'approve',
        label: 'Approve',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'IN_REVIEW',
        run: (rows) => runPerRow(rows, (id) => csrEntryApi.approve(id)),
      },
      {
        id: 'publish',
        label: 'Publish',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'APPROVED',
        run: (rows) => runPerRow(rows, (id) => csrEntryApi.publish(id)),
      },
      {
        id: 'archive',
        label: 'Archive',
        allowed: isSuperAdmin(role),
        variant: 'destructive',
        appliesTo: (row) => row.status !== 'ARCHIVED',
        confirmTitle: 'Archive selected CSR entries',
        confirmDescription: (count) =>
          `This removes ${count} ${count === 1 ? 'entry' : 'entries'} from the published site and closes their workflow. This cannot be undone from the CMS.`,
        run: (rows) => runPerRow(rows, (id) => csrEntryApi.archive(id)),
      },
    ];
  }, [user?.role]);

  return (
    <>
      <CollectionPage<CsrEntryRow>
        title="CSR"
        description="Manage Lake Group corporate social responsibility entries."
        rows={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        columns={columns}
        rowKey={(row) => row.id}
        searchFields={(row) => [
          row.title,
          row.category ?? '',
          row.period ?? '',
          row.description ?? '',
          companyNames.get(row.companyId ?? '') ?? '',
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
          title: (row) => row.title,
          category: (row) => row.category ?? '',
          company: (row) => companyNames.get(row.companyId ?? '') ?? '',
          status: (row) => WORKFLOW_STATUSES.indexOf(row.status),
          updatedAt: (row) => new Date(row.updatedAt).getTime(),
        }}
        initialSort={{ key: 'updatedAt', dir: 'desc' }}
        emptyTitle="No CSR entries yet"
        emptyDescription="CSR entries appear here once they're created – use “Add entry” to start a draft."
        primaryAction={
          canEdit(user?.role) ? (
            <Link to="/app/csr/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              <Icon icon={plus} className="h-4 w-4" aria-hidden="true" />
              Add entry
            </Link>
          ) : undefined
        }
        bulkActions={bulkActions}
        onBulkComplete={invalidate}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive CSR entry"
        description={
          archiveTarget
            ? `This removes "${archiveTarget.title}" from the published site and closes its workflow. This cannot be undone from the CMS.`
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
