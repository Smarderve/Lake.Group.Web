import type { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import inboxOutline from '@iconify-icons/mdi/inbox-outline';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** Call-to-action that populates the collection (spec §37). */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Composed empty state – invites the next action instead of a bare "no rows". */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
        {icon ?? <Icon icon={inboxOutline} className="h-5 w-5" aria-hidden="true" />}
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}
