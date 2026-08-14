import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import type { BulkAction } from './types';

export interface BulkActionBarProps<T> {
  selectedCount: number;
  /** Actions already filtered to the signed-in user's role. */
  actions: BulkAction<T>[];
  /** Number of selected rows each action applies to. */
  eligibleCounts: Record<string, number>;
  /** Id of the action currently running (its button shows a spinner). */
  runningId: string | null;
  onRun: (action: BulkAction<T>) => void;
  onClear: () => void;
  className?: string;
}

/** Sticky footer when rows are selected (spec §11 BulkActionBar). */
export function BulkActionBar<T>({
  selectedCount,
  actions,
  eligibleCounts,
  runningId,
  onRun,
  onClear,
  className,
}: BulkActionBarProps<T>) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-strong bg-surface px-4 py-3 shadow-pop',
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">
        {selectedCount} selected
        {actions.length > 0 && (
          <span className="ml-1.5 font-normal text-ink-muted">– bulk actions apply to eligible rows</span>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => {
          const eligible = eligibleCounts[action.id] ?? 0;
          return (
            <Button
              key={action.id}
              variant={action.variant ?? 'secondary'}
              size="sm"
              disabled={eligible === 0 || runningId !== null}
              loading={runningId === action.id}
              onClick={() => onRun(action)}
            >
              {action.label}
              {eligible > 0 && <span className="tabular-nums opacity-80">({eligible})</span>}
            </Button>
          );
        })}
        <Button variant="ghost" size="sm" disabled={runningId !== null} onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
