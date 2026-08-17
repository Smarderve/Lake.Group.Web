import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { apiErrorMessage } from '../../services/api';
import type { PaginationMeta } from '../../types/api';
import { Pagination } from './Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { TableSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Provide to make the column header sortable. */
  sortValue?: (row: T) => string | number | null;
  className?: string;
  /** Hide on smaller screens (`hidden md:table-cell`). */
  hideBelow?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  /** Server-side sorting state (parent-owned so URL/query state stays consistent). */
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
  /** Row selection – Set of rowKeys. */
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** Pass with onPageChange to show server pagination. */
  pageMeta?: PaginationMeta;
  onPageChange?: (offset: number) => void;
  onPageSizeChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  /** Sticky bottom area (e.g. bulk action bar) rendered under the table. */
  footer?: ReactNode;
}

const hideClass: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

const alignClass: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

/**
 * The universal collection list (spec §11). Loading/empty/error states are
 * built in; sorting and pagination are server-driven via props.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  sortKey,
  sortDir,
  onSortChange,
  selectedKeys,
  onSelectionChange,
  pageMeta,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  className,
  footer,
}: DataTableProps<T>) {
  const selectable = Boolean(selectedKeys && onSelectionChange);
  const data = rows ?? [];
  const allSelected = data.length > 0 && data.every((row) => selectedKeys?.has(rowKey(row)));
  const someSelected = data.some((row) => selectedKeys?.has(rowKey(row)));

  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = !allSelected && someSelected;
    }
  }, [allSelected, someSelected]);

  function toggleAll() {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (allSelected) {
      data.forEach((row) => next.delete(rowKey(row)));
    } else {
      data.forEach((row) => next.add(rowKey(row)));
    }
    onSelectionChange(next);
  }

  function toggleRow(row: T) {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    const key = rowKey(row);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  }

  if (loading) {
    return <TableSkeleton rows={6} cols={Math.max(3, columns.length)} className="py-2" />;
  }

  if (error) {
    return <ErrorState message={apiErrorMessage(error)} onRetry={onRetry} />;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-xl border border-border bg-surface shadow-card">
        {data.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-10">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-brand-600"
                    />
                  </TableHead>
                )}
                {columns.map((column) => {
                  const sortable = Boolean(column.sortValue && onSortChange);
                  const active = sortKey === column.key;
                  return (
                    <TableHead
                      key={column.key}
                      className={cn(alignClass[column.align ?? 'left'], column.hideBelow && hideClass[column.hideBelow], column.className)}
                      sortable={sortable}
                      sortDir={active ? (sortDir ?? null) : null}
                      onSort={
                        sortable
                          ? () => {
                              const nextDir = active && sortDir === 'asc' ? 'desc' : 'asc';
                              onSortChange!(column.key, nextDir);
                            }
                          : undefined
                      }
                    >
                      {column.header}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const key = rowKey(row);
                const selected = Boolean(selectedKeys?.has(key));
                return (
                  <TableRow key={key} selected={selected}>
                    {selectable && (
                      <TableCell className="w-10">
                        <input
                          type="checkbox"
                          aria-label={`Select row ${key}`}
                          checked={selected}
                          onChange={() => toggleRow(row)}
                          className="h-4 w-4 accent-brand-600"
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(alignClass[column.align ?? 'left'], column.hideBelow && hideClass[column.hideBelow], column.className)}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {footer}
      {pageMeta && onPageChange && (
        <Pagination
          meta={pageMeta}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}
