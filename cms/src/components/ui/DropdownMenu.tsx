import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import chevronDown from '@iconify-icons/mdi/chevron-down';
import { cn } from '../../utils/cn';

export interface DropdownMenuItemProps {
  children: ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

/** Non-interactive header row (e.g. the signed-in user). */
export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <div role="presentation" className="border-b border-border px-2.5 py-2 text-sm">
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, onSelect, destructive, disabled, icon }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
        destructive ? 'text-red-700 hover:bg-red-50' : 'text-ink hover:bg-surface-muted',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export interface DropdownMenuProps {
  /** Visual trigger content – the accessible name comes from `label`. */
  trigger: ReactNode;
  label: string;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

/** Lightweight popover menu – Escape and outside-click to close. */
export function DropdownMenu({ trigger, label, children, align = 'end', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
      >
        {trigger}
        <Icon icon={chevronDown} className={cn('h-3.5 w-3.5 text-ink-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'cms-animate-fade absolute z-40 mt-1 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
