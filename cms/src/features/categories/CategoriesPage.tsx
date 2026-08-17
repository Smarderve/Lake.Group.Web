import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import archiveOutline from '@iconify-icons/mdi/archive-outline';
import eyeOutline from '@iconify-icons/mdi/eye-outline';
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
import { categoryApi, runPerRow, type CategoryRow } from './api';

/**
 * Categories collection (Phase 15 gap) – the universal DataTable pattern
 * against the real governed `categories` endpoint. The nav already pointed
 * here; only the frontend was missing (13 real rows in the database).
 */
export function CategoriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [archiveTarget, setArchiveTarget] = useState<CategoryRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const query = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoryApi.list,
    select: (data) => data.categories,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  }, [queryClient]);

  /** Single-row archive with confirmation (mirrors the bulk path). */
  const confirmArchive = useCallback(async (row: CategoryRow) => {
    setArchiving(true);
    try {
      const { ok } = await runPerRow([row], (id) => categoryApi.archive(id));
      if (ok > 0) invalidate();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }, [invalidate]);

  const columns = useMemo<Column<CategoryRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Category',
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-0">
            <Link
              to={`/app/categories/${row.id}/edit`}
              className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline underline-offset-2"
            >
              {row.name}
            </Link>
            <p className="truncate text-xs text-ink-faint">{row.description ?? 'No description'}</p>
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
          const rowActions: RowAction<CategoryRow>[] = [
            {
              id: 'view',
              label: 'View category',
              icon: eyeOutline,
              onClick: (target) => navigate(`/app/categories/${target.id}/edit`),
            },
            {
              id: 'edit',
              label: 'Edit',
              icon: pencilOutline,
              disabled: !canEdit(user?.role),
              onClick: (target) => navigate(`/app/categories/${target.id}/edit`),
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
    [user?.role, navigate],
  );

  const bulkActions = useMemo<BulkAction<CategoryRow>[]>(() => {
    const role = user?.role;
    return [
      {
        id: 'submit',
        label: 'Submit for review',
        allowed: canEdit(role),
        appliesTo: (row) => row.status === 'DRAFT',
        run: (rows) => runPerRow(rows, (id) => categoryApi.submit(id)),
      },
      {
        id: 'approve',
        label: 'Approve',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'IN_REVIEW',
        run: (rows) => runPerRow(rows, (id) => categoryApi.approve(id)),
      },
      {
        id: 'publish',
        label: 'Publish',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'APPROVED',
        run: (rows) => runPerRow(rows, (id) => categoryApi.publish(id)),
      },
      {
        id: 'archive',
        label: 'Archive',
        allowed: isSuperAdmin(role),
        variant: 'destructive',
        appliesTo: (row) => row.status !== 'ARCHIVED',
        confirmTitle: 'Archive selected categories',
        confirmDescription: (count) =>
          `This removes ${count} ${count === 1 ? 'category' : 'categories'} from the published site and closes their workflow. This cannot be undone from the CMS.`,
        run: (rows) => runPerRow(rows, (id) => categoryApi.archive(id)),
      },
    ];
  }, [user?.role]);

  return (
    <>
      <CollectionPage<CategoryRow>
        title="Categories"
        description="The content categories that organise Lake Group's published material – news, products and other sections."
        rows={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        columns={columns}
        rowKey={(row) => row.id}
        searchFields={(row) => [row.name, row.description ?? '']}
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
        ]}
        sortAccessors={{
          name: (row) => row.name,
          status: (row) => WORKFLOW_STATUSES.indexOf(row.status),
          updatedAt: (row) => new Date(row.updatedAt).getTime(),
        }}
        initialSort={{ key: 'name', dir: 'asc' }}
        emptyTitle="No categories yet"
        emptyDescription="Categories appear here once they're created – use “Add category” to start a draft."
        primaryAction={
          canEdit(user?.role) ? (
            <Link to="/app/categories/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              <Icon icon={plus} className="h-4 w-4" aria-hidden="true" />
              Add category
            </Link>
          ) : undefined
        }
        bulkActions={bulkActions}
        onBulkComplete={invalidate}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive category"
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
