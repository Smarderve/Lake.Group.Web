import type { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import alertCircleOutline from '@iconify-icons/mdi/alert-circle-outline';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

/** Composed error state with an inline retry (spec §37). */
export function ErrorState({ title = 'Unable to load data', message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
        <Icon icon={alertCircleOutline} className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {message && <p className="max-w-md text-sm text-ink-muted">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2.5" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
