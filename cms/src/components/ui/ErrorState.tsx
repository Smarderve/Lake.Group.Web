import type { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import type { IconifyIcon } from '@iconify/react';
import alertCircleOutline from '@iconify-icons/mdi/alert-circle-outline';
import fileQuestionOutline from '@iconify-icons/mdi/file-question-outline';
import lockOutline from '@iconify-icons/mdi/lock-outline';
import shieldAlertOutline from '@iconify-icons/mdi/shield-alert-outline';
import wifiOffOutline from '@iconify-icons/mdi/wifi-off';
import wrenchOutline from '@iconify-icons/mdi/wrench-outline';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export type ErrorStateVariant =
  | 'default'
  | 'network'
  | 'permission'
  | 'not-found'
  | 'session'
  | 'server'
  | 'maintenance';

export interface ErrorStateProps {
  /** Which failure class this represents – picks icon + default copy. */
  variant?: ErrorStateVariant;
  title?: string;
  message?: ReactNode;
  onRetry?: () => void;
  /** Extra actions, e.g. a "Go to Dashboard" link beside Retry. */
  action?: ReactNode;
  className?: string;
}

const variantDefaults: Record<ErrorStateVariant, { title: string; message: string; icon: IconifyIcon }> = {
  default: { title: 'Unable to load data', message: '', icon: alertCircleOutline },
  network: {
    title: "You're offline",
    message: 'Check your internet connection. Your unsaved changes are still here.',
    icon: wifiOffOutline,
  },
  permission: {
    title: 'Access restricted',
    message: "You don't have permission to perform this action.",
    icon: shieldAlertOutline,
  },
  'not-found': { title: 'Page not found', message: "We couldn't find the page you're looking for.", icon: fileQuestionOutline },
  session: { title: 'Your session has expired', message: 'Please sign in again to continue.', icon: lockOutline },
  server: {
    title: 'Something went wrong',
    message: "We couldn't load this part of the CMS. Please try again.",
    icon: alertCircleOutline,
  },
  maintenance: {
    title: 'Lake Group CMS is temporarily unavailable',
    message: "We're performing maintenance and expect to be back shortly.",
    icon: wrenchOutline,
  },
};

/**
 * Composed error state with an inline retry (spec §37). One shared visual
 * language for every failure class – a failed operation never looks like the
 * whole system is broken, and no raw error details ever reach this UI.
 */
export function ErrorState({
  variant = 'default',
  title,
  message,
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  const defaults = variantDefaults[variant];
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/60 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
        <Icon icon={defaults.icon} className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-ink">{title ?? defaults.title}</h3>
      {(message != null || variant !== 'default') && (
        <p className="max-w-md text-sm text-ink-muted">{message ?? defaults.message}</p>
      )}
      {(onRetry || action) && (
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
