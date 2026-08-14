import type { IconifyIcon } from '@iconify/react';
import type { Column } from '../../components/ui/DataTable';

/** One selectable filter in the toolbar (rendered as a Select). */
export interface CollectionFilterOption {
  value: string;
  label: string;
}

export interface CollectionFilter<T> {
  id: string;
  label: string;
  options: CollectionFilterOption[];
  /** True when the row passes with the selected value. */
  match: (row: T, value: string) => boolean;
}

/** Active server-style sort: a column key + direction. */
export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

/**
 * A bulk operation over selected rows (spec §11). The backend has no bulk
 * endpoints, so `run` executes one authorized mutation per row and reports
 * the count that succeeded/failed.
 */
export interface BulkAction<T> {
  id: string;
  label: string;
  /** Rows this action applies to (e.g. only DRAFT). */
  appliesTo: (row: T) => boolean;
  /** Role gate – the UI hides actions the signed-in user can't run. */
  allowed: boolean;
  variant?: 'secondary' | 'destructive';
  /** When set, asks for confirmation before running. */
  confirmTitle?: string;
  confirmDescription?: (count: number) => string;
  run: (rows: T[]) => Promise<{ ok: number; failed: number }>;
}

/** Row-context menu action (View / Edit / Archive …). */
export interface RowAction<T> {
  id: string;
  label: string;
  icon: IconifyIcon;
  destructive?: boolean;
  disabled?: boolean;
  onClick: (row: T) => void;
}

export type { Column };
