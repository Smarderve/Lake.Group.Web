import { forwardRef, type SelectHTMLAttributes } from 'react';
import { Icon } from '@iconify/react';
import chevronDown from '@iconify-icons/mdi/chevron-down';
import { cn } from '../../utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * Native select styled to the CMS control system. Native keeps keyboard,
 * screen-reader and mobile behavior free. A rich combobox arrives with the
 * filter UI (Phase 3 collection screens) if the data model needs it.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <span className="relative inline-flex w-full">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-9 w-full appearance-none rounded-lg border bg-surface pl-3 pr-9 text-sm text-ink',
          'shadow-card transition-[border-color,box-shadow] duration-150',
          'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20',
          invalid
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
            : 'border-border-strong',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        icon={chevronDown}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
      />
    </span>
  );
});
