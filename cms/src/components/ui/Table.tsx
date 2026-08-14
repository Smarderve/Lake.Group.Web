import type { ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from 'react';
import { Icon } from '@iconify/react';
import arrowDown from '@iconify-icons/mdi/arrow-down';
import arrowUp from '@iconify-icons/mdi/arrow-up';
import arrowUpDown from '@iconify-icons/mdi/arrow-up-down';
import { cn } from '../../utils/cn';

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-b border-border bg-surface-muted/60', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props}>{children}</tbody>;
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

export function TableRow({ className, selected, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-surface-muted/50',
        selected && 'bg-brand-50/60 hover:bg-brand-50/80',
        className,
      )}
      {...props}
    />
  );
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDir?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export function TableHead({ className, sortable, sortDir, onSort, children, ...props }: TableHeadProps) {
  const content = (
    <>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortable && (
          <span aria-hidden="true" className="text-ink-faint">
            {sortDir === 'asc' ? <Icon icon={arrowUp} className="h-3 w-3 text-brand-600" /> : sortDir === 'desc' ? <Icon icon={arrowDown} className="h-3 w-3 text-brand-600" /> : <Icon icon={arrowUpDown} className="h-3 w-3" />}
          </span>
        )}
      </span>
      {sortable && <span className="sr-only">{sortDir === 'asc' ? 'Sorted ascending' : sortDir === 'desc' ? 'Sorted descending' : 'Not sorted'}</span>}
    </>
  );

  if (sortable) {
    return (
      <th scope="col" className={cn('px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted', className)} {...props}>
        <button type="button" onClick={onSort} className="inline-flex items-center gap-1 transition-colors hover:text-ink">
          {content}
        </button>
      </th>
    );
  }
  return (
    <th scope="col" className={cn('px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle text-ink', className)} {...props}>
      {children}
    </td>
  );
}
