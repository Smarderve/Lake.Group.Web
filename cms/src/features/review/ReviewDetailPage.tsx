import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import arrowLeft from '@iconify-icons/mdi/arrow-left';
import calendarClockOutline from '@iconify-icons/mdi/calendar-clock-outline';
import checkOutline from '@iconify-icons/mdi/check-outline';
import arrowULeftTop from '@iconify-icons/mdi/arrow-u-left-top';
import rocketLaunchOutline from '@iconify-icons/mdi/rocket-launch-outline';
import fileDocumentOutline from '@iconify-icons/mdi/file-document-outline';
import { useAuth } from '../auth/AuthProvider';
import { reviewApi } from './api';
import { scheduledApi } from '../scheduled/api';
import { entityTypeLabel, fieldLabel, valueLabel } from './labels';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/Badge';
import { Button, buttonVariants } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { canEdit, canReview } from '../../utils/permissions';

/**
 * Review screen (spec §23) – one governed submission, its pending-vs-current
 * diff, what it affects, and the reviewer's decisions. Fetches the record +
 * version history through the governed router and the diff through
 * /admin/:route/:id/impact; approve/request-changes/publish are the backend's
 * own transitions (REVIEWER+, recent-auth enforced server-side).
 */
export function ReviewDetailPage() {
  const { route = '', id = '' } = useParams<{ route: string; id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [notesError, setNotesError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'approve' | 'reject' | 'publish' | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleReason, setScheduleReason] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['admin', route, id],
    queryFn: () => reviewApi.detail(route, id),
    enabled: Boolean(route && id),
  });

  // Impact (diff + references) requires EDITOR+; VIEWER/REVIEWER-only sessions
  // get a graceful fallback rendered from the version history instead.
  const impact = useQuery({
    queryKey: ['admin', route, id, 'impact'],
    queryFn: () => reviewApi.impact(route, id),
    enabled: Boolean(route && id),
    retry: false,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin', route, id] });
    void queryClient.invalidateQueries({ queryKey: ['admin', route, id, 'impact'] });
    void queryClient.invalidateQueries({ queryKey: ['review-queue'] });
  }, [queryClient, route, id]);

  const run = useCallback(
    async (kind: 'approve' | 'reject' | 'publish', reason: string | undefined) => {
      setBusy(kind);
      try {
        if (kind === 'approve') await reviewApi.approve(route, id, reason || undefined);
        else if (kind === 'reject') await reviewApi.reject(route, id, reason ?? '');
        else await reviewApi.publish(route, id, reason || undefined);
        toast({
          variant: 'success',
          title:
            kind === 'approve'
              ? 'Approved'
              : kind === 'reject'
                ? 'Changes requested'
                : 'Published',
          description:
            kind === 'approve'
              ? 'The item moved to APPROVED.'
              : kind === 'reject'
                ? 'The item returned to DRAFT with your notes.'
                : 'The item is now live on the public site.',
        });
        setNotes('');
        setNotesError(null);
        setConfirmReject(false);
        invalidate();
      } catch (err) {
        toast({ variant: 'error', title: 'Action failed', description: apiErrorMessage(err) });
      } finally {
        setBusy(null);
      }
    },
    [route, id, toast, invalidate],
  );

  const row = detail.data ? (Object.values(detail.data).find((v) => v && typeof v === 'object' && 'status' in v) as
    | (Record<string, unknown> & { id: string; status: string })
    | undefined) : undefined;

  const entityLabel = (row?.['title'] as string | undefined) ?? (row?.['name'] as string | undefined) ?? (row?.['label'] as string | undefined) ?? 'Submission';
  const status = (row?.status ?? impact.data?.status ?? 'DRAFT') as string;

  const runSchedule = useCallback(async () => {
    if (!scheduleAt) {
      setScheduleError('Pick a date and time in the future.');
      return;
    }
    const publishAt = new Date(scheduleAt);
    if (Number.isNaN(publishAt.getTime()) || publishAt.getTime() <= Date.now()) {
      setScheduleError('The publication time must be in the future.');
      return;
    }
    setBusy('publish');
    try {
      await scheduledApi.schedule(route, id, publishAt.toISOString(), scheduleReason || undefined);
      toast({
        variant: 'success',
        title: 'Publication scheduled',
        description: `${entityLabel} will publish on ${formatDateTime(publishAt.toISOString())}.`,
      });
      setScheduleOpen(false);
      setScheduleAt('');
      setScheduleReason('');
      setScheduleError(null);
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['publish-schedules'] });
    } catch (err) {
      toast({ variant: 'error', title: 'Could not schedule', description: apiErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  }, [scheduleAt, scheduleReason, route, id, entityLabel, toast, invalidate, queryClient]);

  const diffRows = useMemo(() => {
    if (impact.data && Object.keys(impact.data.diff).length > 0) {
      return Object.entries(impact.data.diff);
    }
    return null;
  }, [impact.data]);

  const references = impact.data?.references ?? [];

  const canAct = canReview(user?.role) && (status === 'IN_REVIEW' || status === 'APPROVED');

  function onRequestChanges() {
    if (!notes.trim()) {
      setNotesError('Add a note explaining what should change before requesting changes.');
      return;
    }
    setConfirmReject(true);
  }

  return (
    <>
      <PageHeader
        title={entityLabel}
        description="Review the pending change, note what should change, then approve or send it back."
        actions={
          <Link to="/app/review" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            <Icon icon={arrowLeft} className="h-4 w-4" aria-hidden="true" />
            Back to queue
          </Link>
        }
      />

      {detail.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : detail.isError ? (
        <ErrorState
          title="Could not load this submission"
          message="The record is unreachable right now."
          onRetry={() => detail.refetch()}
          className="mt-4"
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Pending change */}
          <section className="rounded-xl border border-border bg-surface shadow-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Pending change</h2>
              <StatusBadge status={status as never} />
              <span className="text-xs text-ink-faint">{entityTypeLabel(impact.data?.entityType ?? 'item')}</span>
            </div>

            {impact.data && Object.keys(impact.data.diff).length > 0 ? (
              <dl className="mt-4 divide-y divide-border">
                {diffRows?.map(([field, { from, to }]) => (
                  <div key={field} className="py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{fieldLabel(field)}</dt>
                    <dd className="mt-1.5 space-y-1 text-sm">
                      <p className="text-ink-muted line-through decoration-ink-faint/50">{valueLabel(from)}</p>
                      <p className="font-medium text-ink">{valueLabel(to)}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <VersionFallback versions={detail.data?.versions ?? []} />
            )}

            {references.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Affects {references.length} {references.length === 1 ? 'item' : 'items'}
                </h3>
                <ul className="mt-2 space-y-1">
                  {references.map((ref) => (
                    <li key={`${ref.type}:${ref.id}`} className="flex items-center gap-1.5 text-sm text-ink-muted">
                      <Icon icon={fileDocumentOutline} className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                      <span className="truncate">{ref.label}</span>
                      <span className="shrink-0 text-xs text-ink-faint">({entityTypeLabel(ref.type)})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Reviewer actions */}
          <aside className="space-y-4">
            <section className="rounded-xl border border-border bg-surface shadow-card p-5">
              <h2 className="text-sm font-semibold text-ink">Reviewer notes</h2>
              <Field
                label="Notes (required to request changes)"
                hint="Saved to the version history for the editor and the audit trail."
                error={notesError ?? undefined}
                className="mt-3"
              >
                <Textarea
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    if (notesError) setNotesError(null);
                  }}
                  rows={5}
                  placeholder="What should change before this can be approved?"
                  invalid={Boolean(notesError)}
                />
              </Field>
            </section>

            {canAct ? (
              <section className="rounded-xl border border-border bg-surface shadow-card p-5">
                <h2 className="text-sm font-semibold text-ink">Decision</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {status === 'IN_REVIEW' && (
                    <>
                      <Button
                        variant="primary"
                        onClick={() => run('approve', notes)}
                        loading={busy === 'approve'}
                        disabled={busy !== null}
                      >
                        <Icon icon={checkOutline} className="h-4 w-4" aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={onRequestChanges}
                        loading={busy === 'reject'}
                        disabled={busy !== null}
                      >
                        <Icon icon={arrowULeftTop} className="h-4 w-4" aria-hidden="true" />
                        Request changes
                      </Button>
                    </>
                  )}
                  {status === 'APPROVED' && (
                    <>
                      <Button
                        variant="primary"
                        onClick={() => run('publish', notes)}
                        loading={busy === 'publish'}
                        disabled={busy !== null}
                      >
                        <Icon icon={rocketLaunchOutline} className="h-4 w-4" aria-hidden="true" />
                        Publish now
                      </Button>
                      {canEdit(user?.role) && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setScheduleError(null);
                            setScheduleOpen(true);
                          }}
                          disabled={busy !== null}
                        >
                          <Icon icon={calendarClockOutline} className="h-4 w-4" aria-hidden="true" />
                          Schedule
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-3 text-xs text-ink-faint">
                  Actions require a recent sign-in (15 minutes) and the reviewer role.
                </p>
              </section>
            ) : (
              <section className="rounded-xl border border-border bg-surface-muted p-5">
                <p className="text-sm text-ink-muted">
                  Your role can read this submission but cannot make review decisions.
                </p>
              </section>
            )}

            {row && (
              <section className="rounded-xl border border-border bg-surface shadow-card p-5">
                <h2 className="text-sm font-semibold text-ink">Details</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-faint">Submitted</dt>
                    <dd className="text-ink">–</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-faint">Created</dt>
                    <dd className="text-ink">{formatDateTime(row['createdAt'] as string | undefined)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-faint">Updated</dt>
                    <dd className="text-ink">{formatDateTime(row['updatedAt'] as string | undefined)}</dd>
                  </div>
                </dl>
              </section>
            )}
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmReject}
        title="Request changes"
        description={
          <>
            <p className="mb-3">
              The item returns to <strong>DRAFT</strong> and the editor is notified with your notes. It can be
              resubmitted once revised.
            </p>
            <p className="text-xs text-ink-faint">Notes sent with this request:</p>
            <blockquote className="mt-1 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-ink">
              {notes.trim()}
            </blockquote>
          </>
        }
        confirmLabel="Send back"
        tone="default"
        loading={busy === 'reject'}
        onConfirm={() => run('reject', notes)}
        onCancel={() => setConfirmReject(false)}
      />

      <Dialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule publication"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={busy !== null}>
              Cancel
            </Button>
            <Button variant="primary" onClick={runSchedule} loading={busy === 'publish'} disabled={busy !== null}>
              <Icon icon={calendarClockOutline} className="h-4 w-4" aria-hidden="true" />
              Schedule
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            The item is <strong>APPROVED</strong>. Pick a future time to publish it. Scheduling again
            replaces this pending schedule.
          </p>
          <Field label="Publish at" hint="Local time; must be in the future." error={scheduleError ?? undefined}>
            <Input
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => {
                setScheduleAt(event.target.value);
                if (scheduleError) setScheduleError(null);
              }}
              invalid={Boolean(scheduleError)}
            />
          </Field>
          <Field label="Reason" hint="Optional – recorded in the version history and audit trail.">
            <Textarea
              value={scheduleReason}
              onChange={(event) => setScheduleReason(event.target.value)}
              rows={3}
              placeholder="e.g. Align with the annual report release."
            />
          </Field>
        </div>
      </Dialog>
    </>
  );
}

/** Fallback preview when impact isn't available (VIEWER/REVIEWER-only). */
function VersionFallback({ versions }: { versions: Array<Record<string, unknown>> }) {
  const latest = [...versions].reverse().find((v) => v['status'] !== 'PUBLISHED') ?? versions[versions.length - 1];
  const data = (latest?.['data'] ?? null) as Record<string, unknown> | null;

  if (!data || Object.keys(data).length === 0) {
    return (
      <EmptyState
        icon={<Icon icon={fileDocumentOutline} className="h-5 w-5" aria-hidden="true" />}
        title="No pending change details"
        description="Change details are available to editors; the submission itself is intact."
        className="mt-4"
      />
    );
  }

  return (
    <dl className="mt-4 divide-y divide-border">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{fieldLabel(key)}</dt>
          <dd className="mt-1 text-sm text-ink">{valueLabel(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
