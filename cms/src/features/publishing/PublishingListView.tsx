import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import magnify from '@iconify-icons/mdi/magnify';
import closeCircle from '@iconify-icons/mdi/close-circle';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { relativeTime } from '../../utils/format';
import { PUBLISHING_ENTITIES, rowLabel, type PublishingEntity, type UnifiedRow } from './registry';
import type { PublishingListsResult } from './api';

export interface PublishingListViewProps {
  /** Which workflow stage this view surfaces. */
  status: 'PUBLISHED' | 'DRAFT';
  result?: PublishingListsResult;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
  /** Where a row's label links to (editor where built, else the section). */
  rowLink?: (entity: PublishingEntity, row: UnifiedRow) => string | null;
  /** Per-row action buttons (unpublish / submit / edit). */
  renderActions?: (entity: PublishingEntity, row: UnifiedRow) => ReactNode;
}

/**
 * Shared renderer for the unified Published Content and Drafts views
 * (spec §25). Groups every governed entity with rows in the requested status,
 * with live search over row labels, composed loading / error / empty states,
 * and a warning banner when one or more entity lists could not be fetched.
 */
export function PublishingListView({
  status,
  result,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyDescription,
  rowLink,
  renderActions,
}: PublishingListViewProps) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const lists = result?.lists ?? {};
    const q = query.trim().toLowerCase();
    return PUBLISHING_ENTITIES.map((entity) => {
      const rows = (lists[entity.route] ?? [])
        .filter((row) => row.status === status)
        .filter((row) => !q || rowLabel(entity, row).toLowerCase().includes(q));
      return { entity, rows };
    }).filter((group) => group.rows.length > 0);
  }, [result, status, query]);

  const total = useMemo(
    () =>
      result
        ? PUBLISHING_ENTITIES.reduce(
            (sum, entity) => sum + (result.lists[entity.route] ?? []).filter((row) => row.status === status).length,
            0,
          )
        : 0,
    [result, status],
  );

  const noun = status === 'PUBLISHED' ? 'published' : 'draft';
  const searching = query.trim() !== '';

  return (
    <div className="mt-6">
      <div className="max-w-md">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${noun} content…`}
          aria-label={`Search ${noun} content`}
          leftAdornment={<Icon icon={magnify} className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
          rightAdornment={
            searching ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="text-ink-faint transition-colors hover:text-ink"
              >
                <Icon icon={closeCircle} className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : undefined
          }
        />
      </div>

      {isLoading && !result ? (
        <LoadingSkeleton />
      ) : isError && !result ? (
        <ErrorState
          title={`Could not load ${noun} content`}
          message="The content lists are unreachable right now."
          onRetry={onRetry}
          className="mt-4"
        />
      ) : (
        <>
          {result && result.failed.length > 0 && (
            <Alert
              tone="warning"
              title="Some sections couldn't be loaded"
              description={result.failed.join(', ')}
              className="mt-4"
              action={
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  Retry
                </Button>
              }
            />
          )}

          {total === 0 ? (
            <EmptyState
              title={searching ? `No ${noun} content matches “${query.trim()}”` : emptyTitle}
              description={searching ? 'Try a different search term.' : emptyDescription}
              className="mt-4"
            />
          ) : (
            <>
              <p className="mt-4 text-sm text-ink-muted">
                {total} {noun} {total === 1 ? 'item' : 'items'} across {groups.length}{' '}
                {groups.length === 1 ? 'content type' : 'content types'}
              </p>
              <div className="mt-4 space-y-8">
                {groups.map(({ entity, rows }) => (
                  <GroupSection
                    key={entity.route}
                    entity={entity}
                    rows={rows}
                    rowLink={rowLink}
                    renderActions={renderActions}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function GroupSection({
  entity,
  rows,
  rowLink,
  renderActions,
}: {
  entity: PublishingEntity;
  rows: UnifiedRow[];
  rowLink?: PublishingListViewProps['rowLink'];
  renderActions?: PublishingListViewProps['renderActions'];
}) {
  return (
    <section aria-label={`${entity.label} – ${rows.length} ${rows.length === 1 ? 'item' : 'items'}`}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-ink">{entity.label}</h2>
        <Badge tone="neutral">{rows.length}</Badge>
      </div>
      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const label = rowLabel(entity, row);
            const link = rowLink?.(entity, row) ?? null;
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  {link ? (
                    <Link
                      to={link}
                      className="block max-w-md truncate text-sm font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline"
                    >
                      {label}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium text-ink">{label}</p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-faint">Updated {row.updatedAt ? relativeTime(row.updatedAt) : '–'}</p>
                </div>
                {renderActions?.(entity, row)}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Skeleton that mirrors the grouped layout (spec §37). */
function LoadingSkeleton() {
  return (
    <div className="mt-4 space-y-8" role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <Skeleton className="h-4 w-40" />
          <div className="mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-b-0"
              >
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
