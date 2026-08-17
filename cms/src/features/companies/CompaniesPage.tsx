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
import { companyApi, type CompanyRow } from './api';

/** Run one authorized mutation per row – the backend has no bulk endpoint. */
async function runPerRow(
  rows: CompanyRow[],
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
 * Companies collection (spec §11 reference implementation) – the universal
 * DataTable pattern against the real governed endpoint. View/Edit row actions
 * arrive with the entity detail/form phases; archive is live now.
 */
export function CompaniesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [archiveTarget, setArchiveTarget] = useState<CompanyRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const query = useQuery({
    queryKey: ['admin-companies'],
    queryFn: companyApi.list,
    select: (data) => data.companies,
  });

  const parentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of query.data ?? []) map.set(company.id, company.name);
    return map;
  }, [query.data]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  }, [queryClient]);

  /** Single-row archive with confirmation (mirrors the bulk path). */
  const confirmArchive = useCallback(async (row: CompanyRow) => {
    setArchiving(true);
    try {
      const { ok } = await runPerRow([row], (id) => companyApi.archive(id));
      if (ok > 0) invalidate();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }, [invalidate]);

  const columns = useMemo<Column<CompanyRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Company',
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-0">
            <Link
              to={`/app/companies/${row.id}/edit`}
              className="block truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline underline-offset-2"
            >
              {row.name}
            </Link>
            <p className="truncate text-xs text-ink-faint">{row.slug}</p>
          </div>
        ),
      },
      {
        key: 'parent',
        header: 'Parent company',
        hideBelow: 'md',
        cell: (row) => {
          const parent = row.parentCompanyId ? parentNameById.get(row.parentCompanyId) : null;
          return <span className="text-sm text-ink-muted">{parent ?? '–'}</span>;
        },
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
          const rowActions: RowAction<CompanyRow>[] = [
            {
              id: 'edit',
              label: 'Edit',
              icon: pencilOutline,
              disabled: !canEdit(user?.role),
              onClick: (target) => navigate(`/app/companies/${target.id}/edit`),
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
    [parentNameById, user?.role, navigate],
  );

  const bulkActions = useMemo<BulkAction<CompanyRow>[]>(() => {
    const role = user?.role;
    return [
      {
        id: 'submit',
        label: 'Submit for review',
        allowed: canEdit(role),
        appliesTo: (row) => row.status === 'DRAFT',
        run: (rows) => runPerRow(rows, (id) => companyApi.submit(id)),
      },
      {
        id: 'approve',
        label: 'Approve',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'IN_REVIEW',
        run: (rows) => runPerRow(rows, (id) => companyApi.approve(id)),
      },
      {
        id: 'publish',
        label: 'Publish',
        allowed: canReview(role),
        appliesTo: (row) => row.status === 'APPROVED',
        run: (rows) => runPerRow(rows, (id) => companyApi.publish(id)),
      },
      {
        id: 'archive',
        label: 'Archive',
        allowed: isSuperAdmin(role),
        variant: 'destructive',
        appliesTo: (row) => row.status !== 'ARCHIVED',
        confirmTitle: 'Archive selected companies',
        confirmDescription: (count) =>
          `This removes ${count} ${count === 1 ? 'company' : 'companies'} from the published site and closes their workflow. This cannot be undone from the CMS.`,
        run: (rows) => runPerRow(rows, (id) => companyApi.archive(id)),
      },
    ];
  }, [user?.role]);

  return (
    <>
      <CollectionPage<CompanyRow>
        title="Companies"
        description="Manage Lake Group companies and subsidiaries."
        rows={query.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        columns={columns}
        rowKey={(row) => row.id}
        searchFields={(row) => [row.name, row.slug, row.description ?? '', row.website ?? '']}
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
        emptyTitle="No companies yet"
        emptyDescription="Companies appear here once they're created – use “Add company” to start a draft."
        primaryAction={
          canEdit(user?.role) ? (
            <Link to="/app/companies/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              <Icon icon={plus} className="h-4 w-4" aria-hidden="true" />
              Add company
            </Link>
          ) : undefined
        }
        bulkActions={bulkActions}
        onBulkComplete={invalidate}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive company"
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
