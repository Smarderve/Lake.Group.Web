import type { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import alertOutline from '@iconify-icons/mdi/alert-outline';
import alertCircleOutline from '@iconify-icons/mdi/alert-circle-outline';
import checkCircleOutline from '@iconify-icons/mdi/check-circle-outline';
import informationOutline from '@iconify-icons/mdi/information-outline';
import close from '@iconify-icons/mdi/close';
import type { IconifyIcon } from '@iconify/react';
import { cn } from '../../utils/cn';

export type AlertTone = 'info' | 'warning' | 'success' | 'error' | 'neutral';

const ALERT_STYLES: Record<AlertTone, { container: string; icon: IconifyIcon; iconClass: string; titleClass: string; bodyClass: string }> = {
  info: {
    container: 'border-lake-200 bg-lake-50',
    icon: informationOutline,
    iconClass: 'text-lake-700',
    titleClass: 'text-lake-900',
    bodyClass: 'text-lake-800',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50',
    icon: alertOutline,
    iconClass: 'text-amber-700',
    titleClass: 'text-amber-900',
    bodyClass: 'text-amber-800',
  },
  success: {
    container: 'border-brand-200 bg-brand-50',
    icon: checkCircleOutline,
    iconClass: 'text-brand-700',
    titleClass: 'text-brand-900',
    bodyClass: 'text-brand-800',
  },
  error: {
    container: 'border-red-200 bg-red-50',
    icon: alertCircleOutline,
    iconClass: 'text-red-700',
    titleClass: 'text-red-900',
    bodyClass: 'text-red-800',
  },
  neutral: {
    container: 'border-border-strong bg-surface-muted',
    icon: informationOutline,
    iconClass: 'text-ink-muted',
    titleClass: 'text-ink',
    bodyClass: 'text-ink-muted',
  },
};

export interface AlertProps {
  tone?: AlertTone;
  title: ReactNode;
  description?: ReactNode;
  /** Optional dismiss action (e.g. a retry). Renders under the description. */
  action?: ReactNode;
  className?: string;
}

/**
 * Controlled semantic alert (UI directive §11). One treatment for every
 * tone – icon + title + body with consistent spacing and accessible
 * contrast; color never carries the state alone (WCAG 1.4.1).
 */
export function Alert({ tone = 'info', title, description, action, className }: AlertProps) {
  const style = ALERT_STYLES[tone];
  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', style.container, className)}>
      <Icon icon={style.icon} className={cn('mt-0.5 h-5 w-5 shrink-0', style.iconClass)} aria-hidden="true" />
      <div className="min-w-0">
        <p className={cn('text-sm font-medium', style.titleClass)}>{title}</p>
        {description && <div className={cn('mt-0.5 text-sm', style.bodyClass)}>{description}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

/** Tiny icon-only dismiss used by dismissible alerts (kept internal for now). */
export function AlertClose({ onClick, label = 'Dismiss' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="ml-auto shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-black/5 hover:text-ink"
    >
      <Icon icon={close} className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
