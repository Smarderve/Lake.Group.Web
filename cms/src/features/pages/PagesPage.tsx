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
import { pageApi, runPerRow, type PageRow } from './api';

/**
 * Pages collection (Phase 15 gap) – the universal DataTable pattern against
 * the real governed `pages` endpoint. The backend has served 47 page records
 * all along; the CMS had no frontend for them. View opens the editor.
 */
export function PagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [archiveTarget, setArchiveTarget] = useState<PageRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const query = useQuery({
    queryKey: ['admin-pages'],
    queryFn: pageApi.list,
    select: (data) => data.pages,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  }, [queryClient]);

  /** Single-row archive with confirmation (mirrors the bulk path). */
  const confirmArchive = useCallback(async (row: PageRow) => {
    setArchiving(true);
    try {
      const { ok } = await runPerRow([row], (id) => pageApi.archive(id));
      if (ok > 0) invalidate();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }, [invalidate]);

  const columns = useMemo<Column<PageRow>[]>(
    () => [
      {
        key: 'title',
        header: 'Page',
        sortValue: (row) => row.title,
        cell: (row) => (
          <div className="min-w-0">
            <Link
              to={`/app/pages/${row.id}/edit`}
              className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline underline-offset-2"
            >
              {row.title}
            </Link>
            <p className="truncate font-mono text-xs text-ink-faint">/{row.slug}</p>
          </div>
        ),
      },
      {
        key: 'layoutType',
        header: 'Layout',
        hideBelow: 'md',
        sortValue: (row) => row.layoutType ?? '',
        cell: (row) => <span className="text-sm text-ink-muted">{row.layoutType ?? '–'}</span>,
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
          const rowActions: RowAction<PageRow>[] = [
            {
              id: 'view',
              label: 'View page',
              icon: eyeOutline,
              onClick: (target) => navigate(`/app/pages/${target.id}/edit`),
            },
            {
              id: 'edit',
              label: 'Edit',
              icon: pencilOutline,
              disabled: !canEdit(user?.role),
              onClick: (target) => navigate(`/app/pages/${target.id}/edit`),
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
    [user?.role, navigate],
  );

  const bulkActions = useMemo<BulkAction<PageRow>[]>(() => {
    const role = user?.role;
    return [
      {
        id: 'submit',
        label: 'Submit for review',
        allowed: canEdit(role),
        appliesTo: (row) => row.status === 'DRAFT',
        run: (rows) => runPerRow(rows, (id) => pageApi.submit(id)),
      },
      {
        id: 'approve',
        label: 'Approve',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'IN_REVIEW',
        run: (rows) => runPerRow(rows, (id) => pageApi.approve(id)),
      },
      {
        id: 'publish',
        label: 'Publish',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'APPROVED',
        run: (rows) => runPerRow(rows, (id) => pageApi.publish(id)),
      },
      {
        id: 'archive',
        label: 'Archive',
        allowed: isSuperAdmin(role),
        variant: 'destructive',
        appliesTo: (row) => row.status !== 'ARCHIVED',
        confirmTitle: 'Archive selected pages',
        confirmDescription: (count) =>
          `This removes ${count} ${count === 1 ? 'page' : 'pages'} from the published site and closes their workflow. This cannot be undone from the CMS.`,
        run: (rows) => runPerRow(rows, (id) => pageApi.archive(id)),
      },
    ];
  }, [user?.role]);

  return (
    <>
      <CollectionPage<PageRow>
        title="Pages"
        description="The pages of the corporate site, assembled from content blocks. Edit opens the tabbed editor."
        rows={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        columns={columns}
        rowKey={(row) => row.id}
        searchFields={(row) => [row.title, row.slug, row.layoutType ?? '']}
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
          title: (row) => row.title,
          layoutType: (row) => row.layoutType ?? '',
          status: (row) => WORKFLOW_STATUSES.indexOf(row.status),
          updatedAt: (row) => new Date(row.updatedAt).getTime(),
        }}
        initialSort={{ key: 'title', dir: 'asc' }}
        emptyTitle="No pages yet"
        emptyDescription="Pages appear here once they're created – use “Add page” to start a draft."
        primaryAction={
          canEdit(user?.role) ? (
            <Link to="/app/pages/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              <Icon icon={plus} className="h-4 w-4" aria-hidden="true" />
              Add page
            </Link>
          ) : undefined
        }
        bulkActions={bulkActions}
        onBulkComplete={invalidate}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive page"
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
