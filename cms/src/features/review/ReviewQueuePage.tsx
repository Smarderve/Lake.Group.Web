import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import inboxOutline from '@iconify-icons/mdi/inbox-outline';
import clockOutline from '@iconify-icons/mdi/clock-outline';
import { reviewApi } from './api';
import { entityTypeLabel } from './labels';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { buttonVariants } from '../../components/ui/Button';
import { relativeTime, formatDateTime } from '../../utils/format';
import type { ScheduleRow } from '../../types/api';

/**
 * Review Queue (spec §23) – one place to work every governed submission
 * across all domains. Tabbed by stage (awaiting review / approved /
 * scheduled) over GET /admin/review-queue (REVIEWER+). Each item links to
 * its review screen (/app/review/:route/:id), which fetches the record
 * through the governed router – no invented endpoints.
 */
export function ReviewQueuePage() {
  const [tab, setTab] = useState('inReview');

  const queue = useQuery({
    queryKey: ['review-queue'],
    queryFn: reviewApi.queue,
    // Queue is the live workflow surface – keep it fresh.
    refetchInterval: 60_000,
  });

  const inReview = queue.data?.inReview ?? [];
  const approved = queue.data?.approvedAwaitingPublish ?? [];
  const scheduled = queue.data?.scheduled ?? [];

  const tabItems = [
    {
      value: 'inReview',
      label: (
        <span className="inline-flex items-center gap-2">
          Awaiting review
          <Badge tone={inReview.length > 0 ? 'amber' : 'neutral'}>{inReview.length}</Badge>
        </span>
      ),
      content: <ReviewTable rows={inReview.map((item) => ({ ...item, status: 'IN_REVIEW' as const }))} />,
    },
    {
      value: 'approved',
      label: (
        <span className="inline-flex items-center gap-2">
          Approved
          <Badge tone={approved.length > 0 ? 'blue' : 'neutral'}>{approved.length}</Badge>
        </span>
      ),
      content: <ReviewTable rows={approved.map((item) => ({ ...item, status: 'APPROVED' as const }))} />,
    },
    {
      value: 'scheduled',
      label: (
        <span className="inline-flex items-center gap-2">
          Scheduled
          <Badge tone={scheduled.length > 0 ? 'green' : 'neutral'}>{scheduled.length}</Badge>
        </span>
      ),
      content: <ScheduledTable rows={scheduled} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Review Queue"
        description="Approve or request changes on content awaiting review, then publish what's ready."
      />

      {queue.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : queue.isError ? (
        <ErrorState
          title="Could not load the review queue"
          message="The queue is unreachable right now."
          onRetry={() => queue.refetch()}
          className="mt-4"
        />
      ) : (
        <Tabs items={tabItems} value={tab} onChange={setTab} ariaLabel="Review queue stages" className="mt-6" />
      )}
    </>
  );
}

interface QueueRow {
  entityType: string;
  route: string;
  id: string;
  label: string;
  status: 'IN_REVIEW' | 'APPROVED';
  submitterId?: string | null;
  submitterEmail?: string | null;
  submittedAt?: string | null;
}

function ReviewTable({ rows }: { rows: QueueRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Icon icon={inboxOutline} className="h-5 w-5" aria-hidden="true" />}
        title="Nothing here"
        description="Items land here when an editor submits them for review."
        className="mt-4"
      />
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={`${row.entityType}:${row.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <Link
                to={`/app/review/${row.route}/${row.id}`}
                className="block max-w-md truncate text-sm font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline"
              >
                {row.label}
              </Link>
              <p className="mt-0.5 text-xs text-ink-faint">
                {entityTypeLabel(row.entityType)} · submitted by {row.submitterEmail ?? '–'}
              </p>
            </div>
            <time dateTime={row.submittedAt ?? undefined} className="w-28 text-xs text-ink-muted">
              {row.submittedAt ? relativeTime(row.submittedAt) : '–'}
            </time>
            <Badge tone={row.status === 'IN_REVIEW' ? 'amber' : 'blue'}>{row.status.replace('_', ' ')}</Badge>
            <Link
              to={`/app/review/${row.route}/${row.id}`}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {row.status === 'IN_REVIEW' ? 'Review' : 'Publish'}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScheduledTable({ rows }: { rows: ScheduleRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Icon icon={clockOutline} className="h-5 w-5" aria-hidden="true" />}
        title="No scheduled publications"
        description="Approved content can be scheduled from its review screen."
        className="mt-4"
      />
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {entityTypeLabel(row.entityType)} · {row.entityId.slice(0, 8)}
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">Scheduled publication</p>
            </div>
            <time dateTime={row.publishAt} className="w-40 text-xs text-ink-muted">
              {formatDateTime(row.publishAt)}
            </time>
            <Badge tone="green">PENDING</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
