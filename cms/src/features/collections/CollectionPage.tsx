import { useState, type ReactNode } from 'react';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { useCollection } from './useCollection';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { ColumnSelector } from './ColumnSelector';
import { BulkActionBar } from './BulkActionBar';
import type { BulkAction, CollectionFilter, SortState } from './types';

export interface CollectionPageProps<T> {
  title: string;
  description?: string;
  /** Rows for the collection (undefined while loading). */
  rows: T[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchFields: (row: T) => string[];
  filters?: CollectionFilter<T>[];
  sortAccessors?: Record<string, (row: T) => string | number | null>;
  initialSort?: SortState;
  initialPageSize?: number;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  /** Header action (e.g. "+ Add Company" – wired in the entity phase). */
  primaryAction?: ReactNode;
  /** Bulk actions over selected rows (executed one mutation per row). */
  bulkActions?: BulkAction<T>[];
  /** Extra toolbar nodes (right-aligned, after the column selector). */
  toolbarRight?: ReactNode;
  /** Called after a bulk run so the caller can refetch. */
  onBulkComplete?: () => void;
}

/**
 * Universal collection page (spec §11): search, filters, sort, pagination,
 * selection, column visibility, row actions and bulk actions over one
 * governed list. Bulk actions execute as individual authorized mutations –
 * the backend has no bulk endpoints (and must stay the permission boundary).
 */
export function CollectionPage<T>({
  title,
  description,
  rows,
  loading,
  error,
  onRetry,
  columns,
  rowKey,
  searchFields,
  filters = [],
  sortAccessors,
  initialSort,
  initialPageSize,
  emptyTitle = 'No records found',
  emptyDescription,
  primaryAction,
  bulkActions = [],
  toolbarRight,
  onBulkComplete,
}: CollectionPageProps<T>) {
  const { toast } = useToast();

  const collection = useCollection<T>({
    rows,
    searchFields,
    filters,
    columns,
    sortAccessors,
    initialSort,
    initialPageSize,
  });

  const [runningId, setRunningId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ action: BulkAction<T>; rows: T[] } | null>(null);

  const selectedRows = collection.allRows.filter((row) => collection.selectedKeys.has(rowKey(row)));
  const eligibleCounts: Record<string, number> = {};
  for (const action of bulkActions) {
    eligibleCounts[action.id] = selectedRows.filter((row) => action.appliesTo(row)).length;
  }

  async function execute(action: BulkAction<T>, rows: T[]) {
    if (rows.length === 0) return;
    setRunningId(action.id);
    try {
      const { ok, failed } = await action.run(rows);
      if (ok > 0) {
        toast({
          variant: 'success',
          title: `${action.label} – ${ok} ${ok === 1 ? 'item' : 'items'} updated`,
          description: failed > 0 ? `${failed} could not be processed` : undefined,
        });
      } else {
        toast({
          variant: 'error',
          title: 'Nothing updated',
          description: apiErrorMessage(undefined, 'The selected rows could not be processed'),
        });
      }
      collection.clearSelection();
      onBulkComplete?.();
    } catch (err) {
      toast({ variant: 'error', title: `${action.label} failed`, description: apiErrorMessage(err) });
    } finally {
      setRunningId(null);
    }
  }

  function runBulk(action: BulkAction<T>) {
    if (runningId !== null) return;
    const rows = selectedRows.filter((row) => action.appliesTo(row));
    if (rows.length === 0) return;
    if (action.confirmTitle) {
      setPending({ action, rows });
      return;
    }
    void execute(action, rows);
  }

  const activeFilters = filters.length > 0;
  const hasQuery = collection.search.trim().length > 0 || collection.activeFilterCount > 0;

  return (
    <>
      <PageHeader title={title} description={description} actions={primaryAction} />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={collection.search}
          onChange={collection.onSearchChange}
          placeholder={`Search ${title.toLowerCase()}…`}
          className="w-full max-w-sm"
        />
        <FilterBar
          filters={filters}
          values={collection.filterValues}
          onChange={collection.onFilterChange}
        />
        <div className="ml-auto flex items-center gap-2">
          {activeFilters && collection.activeFilterCount > 0 && (
            <button
              type="button"
              onClick={collection.clearFilters}
              className="text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Clear filters
            </button>
          )}
          {toolbarRight}
          <ColumnSelector
            columns={columns}
            isHidden={collection.isColumnHidden}
            onToggle={collection.onToggleColumn}
          />
        </div>
      </div>

      <DataTable<T>
        columns={collection.visibleColumns}
        rows={collection.rows}
        rowKey={rowKey}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyTitle={hasQuery ? 'No matching records' : emptyTitle}
        emptyDescription={hasQuery ? 'Try adjusting your search or filters.' : emptyDescription}
        sortKey={collection.sort?.key}
        sortDir={collection.sort?.dir}
        onSortChange={collection.onSortChange}
        selectedKeys={collection.selectedKeys}
        onSelectionChange={collection.onSelectionChange}
        pageMeta={collection.meta}
        onPageChange={collection.onPageChange}
        onPageSizeChange={collection.onPageSizeChange}
        pageSizeOptions={collection.pageSizeOptions}
        className="mt-4"
        footer={
          <BulkActionBar<T>
            selectedCount={collection.selectedKeys.size}
            actions={bulkActions}
            eligibleCounts={eligibleCounts}
            runningId={runningId}
            onRun={runBulk}
            onClear={collection.clearSelection}
          />
        }
      />

      <ConfirmDialog
        open={pending !== null}
        title={pending?.action.confirmTitle ?? ''}
        description={pending ? pending.action.confirmDescription?.(pending.rows.length) ?? `This will affect ${pending.rows.length} selected ${pending.rows.length === 1 ? 'item' : 'items'}.` : ''}
        confirmLabel="Continue"
        tone={pending?.action.variant === 'destructive' ? 'danger' : 'default'}
        loading={runningId !== null}
        onConfirm={() => {
          if (!pending) return;
          const { action, rows: pendingRows } = pending;
          setPending(null);
          void execute(action, pendingRows);
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
