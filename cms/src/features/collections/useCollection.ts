import { useEffect, useMemo, useState } from 'react';
import type { Column } from '../../components/ui/DataTable';
import type { PaginationMeta } from '../../types/api';
import { useDebounce } from '../../hooks/useDebounce';
import type { CollectionFilter, SortState } from './types';

/**
 * Client-side collection state (spec §11). Governed list endpoints return the
 * full table (backend/src/routes/governed.js – no search/filter/pagination
 * params yet), so search, filter, sort and pagination happen here over the
 * fetched rows. When the backend grows query support, this hook can swap to
 * server-driven state without touching the page.
 */
export interface UseCollectionOptions<T> {
  rows: T[] | undefined;
  /** Fields to search (e.g. row => [row.name, row.slug]). */
  searchFields: (row: T) => string[];
  filters?: CollectionFilter<T>[];
  columns: Column<T>[];
  /** Accessor per column key – used both by the sort header and the hook. */
  sortAccessors?: Record<string, (row: T) => string | number | null>;
  initialSort?: SortState;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface UseCollectionResult<T> {
  // Source rows + derived page.
  allRows: T[];
  rows: T[];
  total: number;
  meta: PaginationMeta;

  // Search.
  search: string;
  onSearchChange: (value: string) => void;

  // Filters.
  filterValues: Record<string, string>;
  onFilterChange: (id: string, value: string) => void;
  activeFilterCount: number;
  clearFilters: () => void;

  // Sort.
  sort: SortState | null;
  onSortChange: (key: string, dir: 'asc' | 'desc') => void;

  // Pagination.
  onPageChange: (offset: number) => void;
  onPageSizeChange: (limit: number) => void;
  pageSizeOptions: number[];

  // Selection.
  selectedKeys: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  clearSelection: () => void;

  // Column visibility.
  visibleColumns: Column<T>[];
  onToggleColumn: (key: string) => void;
  isColumnHidden: (key: string) => boolean;
}

export function useCollection<T>({
  rows,
  searchFields,
  filters = [],
  columns,
  sortAccessors = {},
  initialSort,
  initialPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
}: UseCollectionOptions<T>): UseCollectionResult<T> {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(initialPageSize);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // A new query restarts at page 1.
  useEffect(() => setOffset(0), [debouncedSearch, filterValues]);

  const allRows = useMemo(() => rows ?? [], [rows]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return allRows.filter((row) => {
      if (q && !searchFields(row).some((field) => field && String(field).toLowerCase().includes(q))) {
        return false;
      }
      for (const filter of filters) {
        const value = filterValues[filter.id];
        if (value && !filter.match(row, value)) return false;
      }
      return true;
    });
  }, [allRows, debouncedSearch, searchFields, filters, filterValues]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort) {
      const accessor = sortAccessors[sort.key];
      if (accessor) {
        list.sort((a, b) => {
          const av = accessor(a);
          const bv = accessor(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1; // nulls last
          if (bv == null) return -1;
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return list;
  }, [filtered, sort, sortAccessors]);

  const total = sorted.length;
  const pageRows = useMemo(() => sorted.slice(offset, offset + limit), [sorted, offset, limit]);
  const meta: PaginationMeta = { total, limit, offset };

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenColumns.has(column.key)),
    [columns, hiddenColumns],
  );

  function onSortChange(key: string, dir: 'asc' | 'desc') {
    setSort({ key, dir });
    setOffset(0);
  }

  function onPageChange(nextOffset: number) {
    const max = Math.max(0, total - 1);
    setOffset(Math.max(0, Math.min(nextOffset, max)));
  }

  function onPageSizeChange(nextLimit: number) {
    setLimit(nextLimit);
    setOffset(0);
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  function onToggleColumn(key: string) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return {
    allRows,
    rows: pageRows,
    total,
    meta,
    search,
    onSearchChange: setSearch,
    filterValues,
    onFilterChange: (id, value) => setFilterValues((prev) => ({ ...prev, [id]: value })),
    activeFilterCount: filters.filter((f) => Boolean(filterValues[f.id])).length,
    clearFilters: () => setFilterValues({}),
    sort,
    onSortChange,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions,
    selectedKeys,
    onSelectionChange: setSelectedKeys,
    clearSelection,
    visibleColumns,
    onToggleColumn,
    isColumnHidden: (key) => hiddenColumns.has(key),
  };
}
