import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import calendarClockOutline from '@iconify-icons/mdi/calendar-clock-outline';
import calendarBlankOutline from '@iconify-icons/mdi/calendar-blank-outline';
import calendarMonthOutline from '@iconify-icons/mdi/calendar-month-outline';
import chevronLeft from '@iconify-icons/mdi/chevron-left';
import chevronRight from '@iconify-icons/mdi/chevron-right';
import formatListChecks from '@iconify-icons/mdi/format-list-checks';
import closeCircleOutline from '@iconify-icons/mdi/close-circle-outline';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/format';
import { isSuperAdmin } from '../../utils/permissions';
import { entityTypeLabel } from '../review/labels';
import { scheduledApi, type PublishScheduleRow } from './api';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Scheduled Publishing (spec §24) – a calendar + list view of every pending
 * publication across all governed entities, from GET /admin/publish-schedules
 * (any authenticated user). The backend stays the scheduler: this page only
 * reads and cancels. Scheduling an APPROVED record happens on its review
 * screen; cancelling here leaves the entity APPROVED for a human to publish
 * or reschedule.
 */
export function ScheduledPublishingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [cancelling, setCancelling] = useState<PublishScheduleRow | null>(null);
  const [busy, setBusy] = useState(false);

  const schedules = useQuery({
    queryKey: ['publish-schedules'],
    queryFn: scheduledApi.list,
    // Publication times move as the clock does.
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => schedules.data?.schedules ?? [], [schedules.data]);

  // Calendar grid: weeks starting Monday, covering the month (4-6 rows).
  const grid = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const start = new Date(first);
    start.setDate(first.getDate() - startOffset);
    const days: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return days;
  }, [month]);

  const rowsByDay = useMemo(() => {
    const map = new Map<string, PublishScheduleRow[]>();
    for (const row of rows) {
      const key = new Date(row.publishAt).toDateString();
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [rows]);

  const selectedKey = selectedDay ? selectedDay.toDateString() : null;
  const selectedRows = selectedKey ? (rowsByDay.get(selectedKey) ?? []) : [];

  async function cancelSchedule(row: PublishScheduleRow) {
    setBusy(true);
    try {
      await scheduledApi.cancel(row.id);
      toast({ variant: 'success', title: 'Schedule cancelled', description: 'The item stays approved – publish or reschedule it when ready.' });
      await queryClient.invalidateQueries({ queryKey: ['publish-schedules'] });
      await queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      setCancelling(null);
    } catch (err) {
      toast({ variant: 'error', title: 'Could not cancel schedule', description: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const monthTitle = month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader
        title="Scheduled Publishing"
        description="Upcoming publications across every content type."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface p-1">
            <Button variant={view === 'calendar' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('calendar')}>
              <Icon icon={calendarMonthOutline} className="h-4 w-4" aria-hidden="true" /> Calendar
            </Button>
            <Button variant={view === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('list')}>
              <Icon icon={formatListChecks} className="h-4 w-4" aria-hidden="true" /> List
            </Button>
          </div>
        }
      />

      {schedules.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : schedules.isError ? (
        <ErrorState
          title="Could not load scheduled publications"
          message="The schedule is unreachable right now."
          onRetry={() => schedules.refetch()}
          className="mt-4"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Icon icon={calendarBlankOutline} className="h-5 w-5" aria-hidden="true" />}
          title="No scheduled publications"
          description="Approved content can be scheduled from its review screen – pick a date and it appears here."
          className="mt-4"
        />
      ) : view === 'calendar' ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-label="Publication calendar" className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{monthTitle}</h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                  <Icon icon={chevronLeft} className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                  <Icon icon={chevronRight} className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>              <div className="grid grid-cols-7 border-b border-border bg-surface-muted text-center">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-1 py-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((day) => {
                const inMonth = day.getMonth() === month.getMonth();
                const dayRows = rowsByDay.get(day.toDateString()) ?? [];
                const isSelected = selectedKey === day.toDateString();
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    aria-label={`${formatDate(day)}${dayRows.length ? `, ${dayRows.length} scheduled` : ''}`}                    className={`relative min-h-16 border-b border-r border-border px-1.5 pb-1.5 pt-1 text-left transition-colors last:border-r-0 ${inMonth ? 'hover:bg-surface-muted' : 'bg-surface-muted/40'} ${isSelected ? 'bg-brand-50 ring-1 ring-inset ring-brand-600' : ''}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday ? 'bg-brand-600 font-semibold text-white' : inMonth ? 'text-ink' : 'text-ink-faint'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayRows.length > 0 && (
                      <span className="absolute bottom-1.5 left-1.5 flex gap-0.5" aria-hidden="true">
                        {dayRows.slice(0, 3).map((row) => (
                          <span key={row.id} className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-label="Selected day's publications">
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">
                  {selectedDay ? formatDate(selectedDay) : 'Upcoming'}
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {selectedDay
                    ? `${selectedRows.length} scheduled publication${selectedRows.length === 1 ? '' : 's'}`
                    : 'Select a day on the calendar to see its publications.'}
                </p>
              </div>
              <ul className="divide-y divide-border">
                {(selectedDay ? selectedRows : rows.slice(0, 8)).map((row) => (
                  <ScheduleRowItem key={row.id} row={row} canCancel={isSuperAdmin(user?.role)} onCancel={() => setCancelling(row)} />
                ))}
                {selectedDay && selectedRows.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-ink-faint">Nothing scheduled on this day.</li>
                )}
              </ul>
            </div>
          </section>
        </div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <ScheduleRowItem key={row.id} row={row} canCancel={isSuperAdmin(user?.role)} onCancel={() => setCancelling(row)} />
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancel scheduled publication?"
        description={
          <>
            <strong>{cancelling?.label ?? 'This item'}</strong> will no longer publish at{' '}
            {cancelling ? formatDateTime(cancelling.publishAt) : ''}. The item stays approved – you can
            publish or reschedule it later.
          </>
        }
        confirmLabel="Cancel schedule"
        tone="danger"
        loading={busy}
        onConfirm={() => cancelling && cancelSchedule(cancelling)}
        onCancel={() => setCancelling(null)}
      />
    </>
  );
}

function ScheduleRowItem({
  row,
  canCancel,
  onCancel,
}: {
  row: PublishScheduleRow;
  canCancel: boolean;
  onCancel: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{row.label ?? 'Untitled'}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
          <Icon icon={calendarClockOutline} className="h-3.5 w-3.5" aria-hidden="true" />
          {entityTypeLabel(row.entityType)}
        </p>
      </div>
      <time dateTime={row.publishAt} className="w-44 text-xs text-ink-muted">
        {formatDateTime(row.publishAt)}
      </time>
      <StatusBadge status={row.entityStatus ?? 'DRAFT'} />
      <Badge tone="green">PENDING</Badge>
      {canCancel && (
        <Button variant="outline" size="sm" onClick={onCancel}>
          <Icon icon={closeCircleOutline} className="h-4 w-4" aria-hidden="true" /> Cancel
        </Button>
      )}
    </li>
  );
}
