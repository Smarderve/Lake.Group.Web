import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { WorkflowStatus } from '../../types/api';

export type BadgeTone = 'neutral' | 'amber' | 'blue' | 'green' | 'red' | 'gray';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'border-border bg-surface-muted text-ink-muted',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  blue: 'border-lake-200 bg-lake-50 text-lake-800',
  green: 'border-brand-200 bg-brand-50 text-brand-800',
  red: 'border-red-200 bg-red-50 text-red-800',
  gray: 'border-zinc-200 bg-zinc-100 text-zinc-700',
};

const dotTones: Record<BadgeTone, string> = {
  neutral: 'bg-ink-faint',
  amber: 'bg-amber-500',
  blue: 'bg-lake-500',
  green: 'bg-brand-600',
  red: 'bg-red-600',
  gray: 'bg-zinc-400',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Workflow status badge (spec §9). The text label carries the state so color
 * is never the only channel (WCAG 1.4.1); the dot is redundant emphasis.
 */
const STATUS_TONE: Record<WorkflowStatus, BadgeTone> = {
  DRAFT: 'neutral',
  IN_REVIEW: 'amber',
  APPROVED: 'blue',
  PUBLISHED: 'green',
  ARCHIVED: 'gray',
};

export function StatusBadge({ status, className }: { status: WorkflowStatus; className?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <Badge tone={tone} className={className}>
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone])} />
      {status.replace('_', ' ')}
    </Badge>
  );
}
