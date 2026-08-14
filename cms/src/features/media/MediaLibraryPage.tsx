import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import eyeOutline from '@iconify-icons/mdi/eye-outline';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import archiveOutline from '@iconify-icons/mdi/archive-outline';
import imageOutline from '@iconify-icons/mdi/image-outline';
import plus from '@iconify-icons/mdi/plus';
import { useAuth } from '../auth/AuthProvider';
import { useCollection } from '../collections/useCollection';
import { SearchBar } from '../collections/SearchBar';
import { FilterBar } from '../collections/FilterBar';
import { RowActions } from '../collections/RowActions';
import type { Column } from '../../components/ui/DataTable';
import type { RowAction, CollectionFilter } from '../collections/types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { buttonVariants } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { relativeTime, formatBytes } from '../../utils/format';
import { canEdit, isSuperAdmin } from '../../utils/permissions';
import { WORKFLOW_STATUSES } from '../../types/api';
import { mediaApi, mediaPreviewUrl, isImageMedia, type MediaRow } from './api';

/** Run one authorized mutation per row – the backend has no bulk endpoint. */
async function runPerRow(
  rows: MediaRow[],
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

const SORT_COLUMNS: Column<MediaRow>[] = [
  { key: 'updatedAt', header: 'Updated', cell: () => null, sortValue: (row: MediaRow) => new Date(row.updatedAt).getTime() },
  { key: 'name', header: 'Name', cell: () => null, sortValue: (row: MediaRow) => row.altText ?? row.url },
  { key: 'status', header: 'Status', cell: () => null, sortValue: (row: MediaRow) => WORKFLOW_STATUSES.indexOf(row.status) },
];

/**
 * Media Library (spec §21) – a grid-first browse over the governed /admin/media
 * endpoint: search, folder/status filters, sort, pagination, per-card actions
 * and the full workflow. The backend returns the full table, so filtering
 * happens client-side via useCollection (same discipline as every collection).
 */
export function MediaLibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [archiveTarget, setArchiveTarget] = useState<MediaRow | null>(null);
  const [archiving, setArchiving] = useState(false);

  const query = useQuery({
    queryKey: ['admin-media'],
    queryFn: mediaApi.list,
    select: (data) => data.media,
  });

  const folders = useQuery({
    queryKey: ['admin-media-folders'],
    queryFn: mediaApi.folders,
    select: (data) => data.mediaFolders ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const folder of folders.data ?? []) map.set(folder.id, folder.name);
    return map;
  }, [folders.data]);

  const folderOptions = useMemo(
    () => (folders.data ?? []).map((folder) => ({ value: folder.id, label: folder.name })),
    [folders.data],
  );

  const filters: CollectionFilter<MediaRow>[] = [
    {
      id: 'folder',
      label: 'Folder',
      options: folderOptions,
      match: (row, value) => row.folderId === value,
    },
    {
      id: 'status',
      label: 'Status',
      options: WORKFLOW_STATUSES.map((status) => ({
        value: status,
        label: status.replace('_', ' '),
      })),
      match: (row, value) => row.status === value,
    },
  ];

  const collection = useCollection<MediaRow>({
    rows: query.data,
    searchFields: (row) => [row.altText ?? '', row.caption ?? '', row.url, row.copyright ?? '', row.license ?? '', ...(row.tags ?? [])],
    filters,
    columns: SORT_COLUMNS,
    sortAccessors: {
      updatedAt: (row: MediaRow) => new Date(row.updatedAt).getTime(),
      name: (row: MediaRow) => row.altText ?? row.url,
      status: (row: MediaRow) => WORKFLOW_STATUSES.indexOf(row.status),
    },
    initialSort: { key: 'updatedAt', dir: 'desc' },
    initialPageSize: 24,
    pageSizeOptions: [12, 24, 48, 96],
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-media'] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  }, [queryClient]);

  const confirmArchive = useCallback(async (row: MediaRow) => {
    setArchiving(true);
    try {
      const { ok } = await runPerRow([row], (id) => mediaApi.archive(id));
      if (ok > 0) invalidate();
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }, [invalidate]);

  const rowActions = useCallback(
    (row: MediaRow): RowAction<MediaRow>[] => [
      {
        id: 'view',
        label: 'View details',
        icon: eyeOutline,
        onClick: (target) => navigate(`/app/media/${target.id}`),
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: pencilOutline,
        disabled: !canEdit(user?.role),
        onClick: (target) => navigate(`/app/media/${target.id}/edit`),
      },
      {
        id: 'archive',
        label: 'Archive',
        icon: archiveOutline,
        destructive: true,
        disabled: row.status === 'ARCHIVED' || !isSuperAdmin(user?.role),
        onClick: (target) => setArchiveTarget(target),
      },
    ],
    [user?.role, navigate],
  );

  const hasQuery = collection.search.trim().length > 0 || collection.activeFilterCount > 0;

  return (
    <>
      <PageHeader
        title="Media Library"
        description="Browse, search and manage the images and documents behind Lake Group's content."
        actions={
          canEdit(user?.role) ? (
            <Link to="/app/media/new" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              <Icon icon={plus} className="h-4 w-4" aria-hidden="true" />
              Add media
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={collection.search}
          onChange={collection.onSearchChange}
          placeholder="Search media…"
          className="w-full max-w-sm"
        />
        <FilterBar
          filters={filters}
          values={collection.filterValues}
          onChange={collection.onFilterChange}
        />
        <div className="ml-auto flex items-center gap-2">
          {collection.activeFilterCount > 0 && (
            <button
              type="button"
              onClick={collection.clearFilters}
              className="text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Clear filters
            </button>
          )}
          <Link to="/app/media-folders" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            Folders
          </Link>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="Could not load media"
          message="The media library is unreachable right now."
          onRetry={() => query.refetch()}
          className="mt-4"
        />
      ) : collection.rows.length === 0 ? (
        <EmptyState
          icon={<Icon icon={imageOutline} className="h-5 w-5" aria-hidden="true" />}
          title={hasQuery ? 'No matching media' : 'No media yet'}
          description={hasQuery ? 'Try adjusting your search or filters.' : 'Media items appear here once they are added.'}
          className="mt-4"
        />
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collection.rows.map((row) => {
              const preview = mediaPreviewUrl(row);
              const image = isImageMedia(row);
              return (
                <li
                  key={row.id}
                  className="group overflow-hidden rounded-xl border border-border bg-surface shadow-card transition-shadow hover:shadow-pop"
                >
                  <Link
                    to={`/app/media/${row.id}`}
                    className="block aspect-[4/3] w-full overflow-hidden bg-surface-muted"
                    aria-label={`View ${row.altText ?? 'media item'} details`}
                  >
                    {image ? (
                      <img
                        src={preview}
                        alt={row.altText ?? ''}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-ink-faint">
                        <Icon icon={imageOutline} className="h-10 w-10" aria-hidden="true" />
                        <span className="max-w-full truncate px-2 text-xs">{row.mimeType ?? 'file'}</span>
                      </div>
                    )}
                  </Link>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {row.altText || row.caption || 'Untitled media'}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-faint">{row.url}</p>
                      </div>
                      <RowActions row={row} actions={rowActions(row)} label={`Actions for ${row.altText ?? 'media item'}`} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={row.status} />
                      {row.folderId && <Badge tone="neutral">{folderNameById.get(row.folderId) ?? 'Folder'}</Badge>}
                      {row.width && row.height ? (
                        <span className="text-xs tabular-nums text-ink-faint">
                          {row.width}×{row.height}
                        </span>
                      ) : null}
                      {row.sizeBytes ? (
                        <span className="text-xs tabular-nums text-ink-faint">{formatBytes(row.sizeBytes)}</span>
                      ) : null}
                    </div>
                    <time dateTime={row.updatedAt} className="mt-1.5 block text-xs text-ink-faint">
                      Updated {relativeTime(row.updatedAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            meta={collection.meta}
            onPageChange={collection.onPageChange}
            onPageSizeChange={collection.onPageSizeChange}
            pageSizeOptions={collection.pageSizeOptions}
            className="mt-6"
          />
        </>
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        title="Archive media item"
        description={
          archiveTarget
            ? `This removes "${archiveTarget.altText ?? 'this media item'}" from the published site and closes its workflow. This cannot be undone from the CMS.`
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
