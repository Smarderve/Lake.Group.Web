import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps {
  className?: string;
  children: ReactNode;
}

/** Used only where elevation communicates hierarchy (spec §8/§61). */
export function Card({ className, children }: CardProps) {
  return <div className={cn('rounded-xl border border-border bg-surface shadow-card', className)}>{children}</div>;
}

export function CardHeader({ className, children }: CardProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: CardProps) {
  return <h3 className={cn('text-sm font-semibold text-ink', className)}>{children}</h3>;
}

export function CardDescription({ className, children }: CardProps) {
  return <p className={cn('mt-0.5 text-[13px] text-ink-muted', className)}>{children}</p>;
}

export function CardContent({ className, children }: CardProps) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: CardProps) {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-border px-5 py-3.5', className)}>
      {children}
    </div>
  );
}
