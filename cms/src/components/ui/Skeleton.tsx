import { cn } from '../../utils/cn';

export interface SkeletonProps {
  className?: string;
}

/** Loading placeholder – shape mirrors the final layout (spec §37). */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={cn('relative overflow-hidden rounded-md bg-surface-muted', className)}>
      <div className="cms-animate-shimmer absolute inset-0 animate-[cms-shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

/** A table-like skeleton block for list screens. */
export function TableSkeleton({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn('h-9', c === 0 ? 'w-1/3' : 'flex-1')} />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
