import { Icon } from '@iconify/react';
import check from '@iconify-icons/mdi/check';
import formatListChecks from '@iconify-icons/mdi/format-list-checks';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel } from '../../components/ui/DropdownMenu';
import type { Column } from '../../components/ui/DataTable';
import { cn } from '../../utils/cn';

export interface ColumnSelectorProps<T> {
  columns: Column<T>[];
  isHidden: (key: string) => boolean;
  onToggle: (key: string) => void;
}

/** Toggle which columns render (spec §11). At least one stays visible. */
export function ColumnSelector<T>({ columns, isHidden, onToggle }: ColumnSelectorProps<T>) {
  const visibleCount = columns.filter((column) => !isHidden(column.key)).length;

  return (
    <DropdownMenu
      trigger={
        <span className="inline-flex items-center gap-1.5">
          <Icon icon={formatListChecks} className="h-4 w-4" aria-hidden="true" />
          Columns
        </span>
      }
      label="Choose visible columns"
      align="end"
    >
      <DropdownMenuLabel>Columns</DropdownMenuLabel>
      {columns.map((column) => {
        const hidden = isHidden(column.key);
        const disabled = hidden && visibleCount <= 1;
        return (
          <DropdownMenuItem
            key={column.key}
            disabled={disabled}
            onSelect={() => onToggle(column.key)}
            icon={
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-sm border',
                  hidden ? 'border-border-strong' : 'border-brand-600 bg-brand-600',
                )}
              >
                {!hidden && <Icon icon={check} className="h-3 w-3 text-white" />}
              </span>
            }
          >
            <span className={cn(hidden && 'text-ink-muted')}>{String(column.header)}</span>
          </DropdownMenuItem>
        );
      })}
    </DropdownMenu>
  );
}
