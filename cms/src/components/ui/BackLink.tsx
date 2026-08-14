import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import arrowLeft from '@iconify-icons/mdi/arrow-left';
import { cn } from '../../utils/cn';

export interface BackLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
}

/**
 * Standard "back to <section>" link – used at the top of editors, detail
 * pages and drawers. One treatment instead of a per-page class.
 */
export function BackLink({ to, children, className }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink',
        className,
      )}
    >
      <Icon icon={arrowLeft} className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
