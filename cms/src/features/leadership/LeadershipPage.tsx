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
import { leadershipApi, type LeadershipRow } from './api';

/** Run one authorized mutation per row – the backend has no bulk endpoint. */
async function runPerRow(
  rows: LeadershipRow[],
  fn: (id: string) => Promise<unknown>,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await fn(row.id);
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  return { ok, failed };
}

/**
 * Leadership collection (spec §12) – the universal DataTable pattern against
 * the real governed endpoint. Edit opens the tabbed editor (profile / timeline
 * / workflow); archive is live now.
 */
export function LeadershipPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [archiveTarget, setArchiveTarget] = useState<LeadershipRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const query = useQuery({
    queryKey: ['admin-leadership'],
    queryFn: leadershipApi.list,
    select: (data) => data.leadership,
  });

  // Company names for the Company column – the governed companies list.
  const companies = useQuery({
    queryKey: ['admin-companies'],
    queryFn: leadershipApi.companies,
    select: (data) => data.companies ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of companies.data ?? []) map.set(company.id, company.name);
    return map;
  }, [companies.data]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-leadership'] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  }, [queryClient]);

  /** Single-row archive with confirmation (mirrors the bulk path). */
  const confirmArchive = useCallback(async (row: LeadershipRow) => {
    setArchiving(true);
    try {
      const { ok } = await runPerRow([row], (id) => leadershipApi.archive(id));
      if (ok > 0) invalidate();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }, [invalidate]);

  const columns = useMemo<Column<LeadershipRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Leader',
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-0">
            <Link
              to={`/app/leadership/${row.id}/edit`}
              className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline underline-offset-2"
            >
              {row.name}
            </Link>
            <p className="truncate text-xs text-ink-faint">{row.position}</p>
          </div>
        ),
      },
      {
        key: 'company',
        header: 'Company',
        hideBelow: 'md',
        cell: (row) => (
          <span className="text-sm text-ink-muted">
            {row.companyId ? companyNameById.get(row.companyId) ?? '–' : 'Group level'}
          </span>
        ),
      },
      {
        key: 'currentStatus',
        header: 'Timeline',
        hideBelow: 'lg',
        cell: (row) => (
          <span
            className={
              row.currentStatus === 'DEPARTED'
                ? 'text-xs font-medium text-ink-faint'
                : 'text-xs font-medium text-brand-700'
            }
          >
            {row.currentStatus}
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
          const rowActions: RowAction<LeadershipRow>[] = [
            {
              id: 'edit',
              label: 'Edit',
              icon: pencilOutline,
              disabled: !canEdit(user?.role),
              onClick: (target) => navigate(`/app/leadership/${target.id}/edit`),
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
    [companyNameById, user?.role, navigate],
  );

  const bulkActions = useMemo<BulkAction<LeadershipRow>[]>(() => {
    const role = user?.role;
    return [
      {
        id: 'submit',
        label: 'Submit for review',
        allowed: canEdit(role),
        appliesTo: (row) => row.status === 'DRAFT',
        run: (rows) => runPerRow(rows, (id) => leadershipApi.submit(id)),
      },
      {
        id: 'approve',
        label: 'Approve',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'IN_REVIEW',
        run: (rows) => runPerRow(rows, (id) => leadershipApi.approve(id)),
      },
      {
        id: 'publish',
        label: 'Publish',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'APPROVED',
        run: (rows) => runPerRow(rows, (id) => leadershipApi.publish(id)),
      },
      {
        id: 'archive',
        label: 'Archive',
        allowed: isSuperAdmin(role),
        variant: 'destructive',
        appliesTo: (row) => row.status !== 'ARCHIVED',
        confirmTitle: 'Archive selected leaders',
        confirmDescription: (count) =>
          `This removes ${count} ${count === 1 ? 'leader' : 'leaders'} from the published site and closes their workflow. This cannot be undone from the CMS.`,
        run: (rows) => runPerRow(rows, (id) => leadershipApi.archive(id)),
      },
    ];
  }, [user?.role]);

  return (
    <>
      <CollectionPage<LeadershipRow>
        title="Leadership"
        description="Manage Lake Group leadership – profiles, appointment timelines and publishing."
        rows={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        columns={columns}
        rowKey={(row) => row.id}
        searchFields={(row) => [row.name, row.position, row.bio ?? '']}
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
        initialSort={{ key: 'updatedAt', dir: 'desc' }}
        emptyTitle="No leaders yet"
        emptyDescription="Leaders appear here once they're created – use “Add leader” to start a draft."
        primaryAction={
          canEdit(user?.role) ? (
            <Link to="/app/leadership/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              <Icon icon={plus} className="h-4 w-4" aria-hidden="true" />
              Add leader
            </Link>
          ) : undefined
        }
        bulkActions={bulkActions}
        onBulkComplete={invalidate}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive leader"
        description={
          archiveTarget
            ? `This removes "${archiveTarget.name}" from the published site and closes their workflow. This cannot be undone from the CMS.`
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
