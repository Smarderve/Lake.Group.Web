import { Icon } from '@iconify/react';
import chevronLeft from '@iconify-icons/mdi/chevron-left';
import chevronRight from '@iconify-icons/mdi/chevron-right';
import { cn } from '../../utils/cn';
import type { PaginationMeta } from '../../types/api';
import { Button } from './Button';
import { Select } from './Select';

export interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (offset: number) => void;
  /** Show a page-size picker when provided. */
  onPageSizeChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/** Page numbers around the current page (1 … n-1 n n+1 … last). */
function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

/** Server-driven pagination matching the backend { total, limit, offset } meta. */
export function Pagination({ meta, onPageChange, onPageSizeChange, pageSizeOptions, className }: PaginationProps) {
  const { total, limit, offset } = meta;
  if (total <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const current = Math.floor(offset / Math.max(1, limit)) + 1;
  const first = total === 0 ? 0 : offset + 1;
  const last = Math.min(total, offset + limit);

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-xs text-ink-muted">
        Showing <span className="font-medium text-ink">{first}–{last}</span> of{' '}
        <span className="font-medium text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        {onPageSizeChange && pageSizeOptions && (
          <Select
            value={String(limit)}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Rows per page"
            className="mr-2 h-8 w-auto min-w-0 [&>select]:py-0"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </Select>
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={current <= 1}
          onClick={() => onPageChange(offset - limit)}
        >
          <Icon icon={chevronLeft} className="h-4 w-4" />
        </Button>
        {pageWindow(current, totalPages).map((page, index) =>
          page === '…' ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-xs text-ink-faint">
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={page === current ? 'primary' : 'outline'}
              size="icon"
              aria-label={`Page ${page}`}
              aria-current={page === current ? 'page' : undefined}
              onClick={() => onPageChange((page - 1) * limit)}
              className="hidden sm:inline-flex"
            >
              {page}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={current >= totalPages}
          onClick={() => onPageChange(offset + limit)}
        >
          <Icon icon={chevronRight} className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
