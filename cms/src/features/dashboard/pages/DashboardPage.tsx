import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import officeBuildingOutline from '@iconify-icons/mdi/office-building-outline';
import fileDocumentOutline from '@iconify-icons/mdi/file-document-outline';
import imageOutline from '@iconify-icons/mdi/image-outline';
import chartLine from '@iconify-icons/mdi/chart-line';
import clipboardCheckOutline from '@iconify-icons/mdi/clipboard-check-outline';
import calendarClockOutline from '@iconify-icons/mdi/calendar-clock-outline';
import plus from '@iconify-icons/mdi/plus';
import type { IconifyIcon } from '@iconify/react';
import { useAuth } from '../../auth/AuthProvider';
import { useSettings } from '../../settings/SettingsProvider';
import { dashboardApi, type GovernedListResponse } from '../api';
import { actionLabel, entityTypeLabel, resourceLabel } from '../labels';
import { buttonVariants } from '../../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { apiErrorMessage } from '../../../services/api';
import { formatNumber, relativeTime } from '../../../utils/format';
import { canReview, isSuperAdmin } from '../../../utils/permissions';
import type { AuditEntry, NotificationRow } from '../../../types/api';

const KPI_ROUTES: { label: string; to: string; icon: IconifyIcon; route: string }[] = [
  { label: 'Companies', to: '/app/companies', icon: officeBuildingOutline, route: 'companies' },
  { label: 'News', to: '/app/news', icon: fileDocumentOutline, route: 'news' },
  { label: 'Media', to: '/app/media', icon: imageOutline, route: 'media' },
  { label: 'Metrics', to: '/app/metrics', icon: chartLine, route: 'metrics' },
];

const QUICK_ACTIONS = [
  { label: 'Create Article', to: '/app/news' },
  { label: 'Create Company', to: '/app/companies' },
  { label: 'Upload Media', to: '/app/media' },
  { label: 'Review Queue', to: '/app/review' },
];

interface KpiCardProps {
  label: string;
  to: string;
  icon: IconifyIcon;
  rows: GovernedRow[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

function KpiCard({ label, to, icon, rows, loading, error, onRetry }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <Link to={to} className="group flex items-center justify-between">
          <span className="text-[13px] font-medium text-ink-muted group-hover:text-ink">{label}</span>
          <Icon icon={icon} className="h-4 w-4 text-ink-faint" aria-hidden="true" />
        </Link>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : error ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">Couldn't load</span>
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <p className="text-2xl font-semibold tabular-nums text-ink">{formatNumber(rows?.length ?? 0)}</p>
            <p className="text-xs text-ink-faint">
              {rows?.filter((r) => r.status === 'PUBLISHED').length ?? 0} published
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

type GovernedRow = { id: string; status: string; [key: string]: unknown };

/** Needs Attention for reviewers – the live review queue (spec §10). */
function ReviewQueueCard() {
  const query = useQuery({
    queryKey: ['review-queue'],
    queryFn: dashboardApi.reviewQueue,
  });

  const { inReview = [], approvedAwaitingPublish = [], scheduled = [] } = query.data ?? {};
  const empty = inReview.length === 0 && approvedAwaitingPublish.length === 0 && scheduled.length === 0;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Needs Attention</CardTitle>
          <CardDescription>Items that require your action.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading review queue">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : query.error ? (
          <p className="text-sm text-ink-muted">
            Couldn't load the queue. <span className="text-ink-faint">{apiErrorMessage(query.error)}</span>
          </p>
        ) : empty ? (
          <EmptyState
            title="Nothing waiting on you"
            description="Pending reviews, approvals and scheduled publications will appear here."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <>
            {inReview.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Awaiting review · {inReview.length}
                </p>
                <ul className="mt-1 divide-y divide-border">
                  {inReview.slice(0, 5).map((item) => (
                    <li key={`rev-${item.route}-${item.id}`} className="flex items-start justify-between gap-3 py-2">
                      <Link to={`/app/${item.route}`} className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink hover:text-brand-700">{item.label}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {entityTypeLabel(item.entityType)}
                          {item.submitterEmail ? ` · ${item.submitterEmail}` : ''}
                        </p>
                      </Link>
                      <span className="shrink-0 text-xs text-ink-faint">{item.submittedAt ? relativeTime(item.submittedAt) : null}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {approvedAwaitingPublish.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Ready to publish · {approvedAwaitingPublish.length}
                </p>
                <ul className="mt-1 divide-y divide-border">
                  {approvedAwaitingPublish.slice(0, 5).map((item) => (
                    <li key={`app-${item.route}-${item.id}`} className="flex items-start justify-between gap-3 py-2">
                      <Link to={`/app/${item.route}`} className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink hover:text-brand-700">{item.label}</p>
                        <p className="truncate text-xs text-ink-muted">{entityTypeLabel(item.entityType)}</p>
                      </Link>
                      <Icon icon={clipboardCheckOutline} className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {scheduled.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Scheduled · {scheduled.length}
                </p>
                <ul className="mt-1 divide-y divide-border">
                  {scheduled.slice(0, 3).map((s) => (
                    <li key={`sched-${s.id}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate text-sm text-ink">{entityTypeLabel(s.entityType)}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
                        <Icon icon={calendarClockOutline} className="h-3.5 w-3.5" aria-hidden="true" />
                        {relativeTime(s.publishAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Needs Attention for non-reviewers – their unread notifications. */
function MyNotificationsCard() {
  const query = useQuery({ queryKey: ['notifications'], queryFn: dashboardApi.notifications });
  const unread = query.data?.notifications.filter((n) => !n.read) ?? [];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Needs Attention</CardTitle>
          <CardDescription>Items that require your action.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading notifications">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : query.error ? (
          <p className="text-sm text-ink-muted">
            Couldn't load notifications. <span className="text-ink-faint">{apiErrorMessage(query.error)}</span>
          </p>
        ) : unread.length === 0 ? (
          <EmptyState
            title="Nothing waiting on you"
            description="New notifications about your content will appear here."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {unread.slice(0, 6).map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 py-2">
                <p className="min-w-0 text-sm text-ink">{n.message}</p>
                <span className="shrink-0 text-xs text-ink-faint">{relativeTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Recent Activity for SUPER_ADMIN – the audit trail feed. */
function AuditActivityCard() {
  const audit = useQuery({ queryKey: ['audit-log', 8], queryFn: () => dashboardApi.auditLog(8) });
  const users = useQuery({ queryKey: ['admin-users'], queryFn: dashboardApi.users });
  const emailById = new Map((users.data?.users ?? []).map((u) => [u.id, u.email]));
  const entries: AuditEntry[] = audit.data?.entries ?? [];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest changes across your content.</CardDescription>
        </div>
        {audit.data && audit.data.total > 0 && (
          <Link
            to="/app/audit"
            className="text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            View all ({audit.data.total})
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {audit.isLoading || users.isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading activity">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : audit.error ? (
          <p className="text-sm text-ink-muted">
            Couldn't load activity. <span className="text-ink-faint">{apiErrorMessage(audit.error)}</span>
          </p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Sensitive actions from you and your team will show up here."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {entries.slice(0, 8).map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{actionLabel(entry.action)}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {resourceLabel(entry.resource)}
                    {emailById.get(entry.actorId ?? '') ? ` · ${emailById.get(entry.actorId ?? '')}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-faint">{relativeTime(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Recent Activity for non-admins – their notification feed. */
function MyActivityCard() {
  const query = useQuery({ queryKey: ['notifications'], queryFn: dashboardApi.notifications });
  const notifications: NotificationRow[] = query.data?.notifications ?? [];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest changes across your content.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading activity">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : query.error ? (
          <p className="text-sm text-ink-muted">
            Couldn't load activity. <span className="text-ink-faint">{apiErrorMessage(query.error)}</span>
          </p>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Actions from you and your team will show up here."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {notifications.slice(0, 8).map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{n.message}</p>
                  {n.entityType && <p className="text-xs text-ink-muted">{entityTypeLabel(n.entityType)}</p>}
                </div>
                <span className="shrink-0 text-xs text-ink-faint">{relativeTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard (spec §10). All numbers and feeds are API-backed:
 *   - KPI cards   – governed list counts (any role)
 *   - Attention   – review queue (REVIEWER+) or my unread notifications
 *   - Activity    – audit trail (SUPER_ADMIN) or my notifications
 */
export function DashboardPage() {
  const { user } = useAuth();
  const { preferences } = useSettings();
  const { quickActions, recentActivity } = preferences.dashboardSettings;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Review current content activity and items that need attention."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_ROUTES.map((kpi) => (
          <KpiCardWrapper key={kpi.route} kpi={kpi} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={recentActivity ? '' : 'xl:col-span-2'}>
          {canReview(user?.role) ? <ReviewQueueCard /> : <MyNotificationsCard />}
        </div>
        {recentActivity &&
          (isSuperAdmin(user?.role) ? <AuditActivityCard /> : <MyActivityCard />)}
      </div>

      {quickActions && (
        <Card className="mt-6">
          <CardHeader>
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common content operations.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Icon icon={plus} className="h-3.5 w-3.5" aria-hidden="true" />
                {action.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

/** Query hook per governed KPI, wired to the shared KpiCard. */
function KpiCardWrapper({ kpi }: { kpi: (typeof KPI_ROUTES)[number] }) {
  const query = useQuery({
    queryKey: ['governed', kpi.route],
    queryFn: () => dashboardApi.governed(kpi.route),
    select: (data: GovernedListResponse) => data[kpi.route],
  });
  return (
    <KpiCard
      label={kpi.label}
      to={kpi.to}
      icon={kpi.icon}
      rows={query.data}
      loading={query.isLoading}
      error={query.error}
      onRetry={() => query.refetch()}
    />
  );
}
