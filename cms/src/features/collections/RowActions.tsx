import { Icon } from '@iconify/react';
import dotsHorizontal from '@iconify-icons/mdi/dots-horizontal';
import { DropdownMenu, DropdownMenuItem } from '../../components/ui/DropdownMenu';
import type { RowAction } from './types';

export interface RowActionsProps<T> {
  row: T;
  actions: RowAction<T>[];
  label?: string;
}

/** Per-row context menu (View / Edit / Archive … – spec §11 RowActions). */
export function RowActions<T>({ row, actions, label = 'Row actions' }: RowActionsProps<T>) {
  return (
    <DropdownMenu
      trigger={<Icon icon={dotsHorizontal} className="h-4 w-4 text-ink-muted" aria-hidden="true" />}
      label={label}
      align="end"
    >
      {actions
        .filter((action) => !action.disabled)
        .map((action) => (
          <DropdownMenuItem
            key={action.id}
            destructive={action.destructive}
            onSelect={() => action.onClick(row)}
            icon={
              action.icon ? <Icon icon={action.icon} className="h-4 w-4" aria-hidden="true" /> : undefined
            }
          >
            {action.label}
          </DropdownMenuItem>
        ))}
    </DropdownMenu>
  );
}
