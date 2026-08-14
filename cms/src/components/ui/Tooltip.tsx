import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/** CSS-only tooltip for icon buttons – hover and keyboard focus both reveal it. */
export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 hidden max-w-56 rounded-md bg-ink px-2 py-1 text-xs font-medium text-white shadow-pop',
          'whitespace-nowrap group-hover/tooltip:block group-focus-within/tooltip:block',
          side === 'top' && 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
          side === 'bottom' && 'top-full left-1/2 mt-1.5 -translate-x-1/2',
          side === 'left' && 'right-full top-1/2 mr-1.5 -translate-y-1/2',
          side === 'right' && 'left-full top-1/2 ml-1.5 -translate-y-1/2',
        )}
      >
        {label}
      </span>
    </span>
  );
}
