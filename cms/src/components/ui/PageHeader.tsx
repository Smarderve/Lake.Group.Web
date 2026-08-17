import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Primary action cluster (spec §61 hierarchy: title -> description -> action). */
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, actions, className, children }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      {children}
    </header>
  );
}
