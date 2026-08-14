import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import archiveOutline from '@iconify-icons/mdi/archive-outline';
import { useAuth } from '../../features/auth/AuthProvider';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/toast';
import { apiErrorMessage } from '../../services/api';
import { canEdit, canReview, isSuperAdmin } from '../../utils/permissions';
import { formatDateTime } from '../../utils/format';
import type { VersionRow, WorkflowStatus } from '../../types/api';
import { PreviewLink } from '../../features/preview/PreviewLink';

const STATUS_COPY: Record<string, string> = {
  DRAFT: 'Draft – not visible on the public site.',
  IN_REVIEW: 'Awaiting a reviewer.',
  APPROVED: 'Approved – ready to publish.',
  PUBLISHED: 'Live on the public site.',
  ARCHIVED: 'Archived – no longer visible.',
};

/** The governed transitions the tab surfaces (submit/approve/publish/archive).
 * `archive` is optional – the metrics router has no archive route, so its
 * api object simply omits it (and `canArchive` stays false). */
export interface WorkflowActions {
  submit: (id: string) => Promise<unknown>;
  approve: (id: string) => Promise<unknown>;
  publish: (id: string) => Promise<unknown>;
  archive?: (id: string) => Promise<unknown>;
}

export interface WorkflowTabProps {
  /** Admin route slug – e.g. 'career-listings'. Drives query keys + default back-nav. */
  route: string;
  id: string;
  /** Human label for copy, e.g. "Career listing". */
  label: string;
  /** Key the detail response nests the record under – e.g. 'careerListing'. */
  entityKey: string;
  /** Row field holding the human-readable title (default 'name'). */
  titleField?: string;
  /** Shared detail read – the governed detail returns { [entityKey]: row, versions }. */
  getDetail: (id: string) => Promise<{ versions?: VersionRow[] } & Record<string, unknown>>;
  /** Route-scoped transitions – every api object exposes the same six. */
  entityApi: WorkflowActions;
  /** Where to go after archive (defaults to the collection list). */
  onArchived?: () => void;
  /** Hide the Archive action – routers without an archive transition (metrics). */
  canArchive?: boolean;
  /** Extra transition buttons rendered in the action row (e.g. metrics rollback). */
  extraActions?: (row: { id: string; status: WorkflowStatus }, busy: boolean) => ReactNode;
}

/**
 * Governed workflow tab (Phases 14-15) – shared by every governed editor and
 * the country drill-down. Status + role-gated transitions against the real
 * governed endpoints (EDITOR+ submits, REVIEWER+ approves/publishes,
 * SUPER_ADMIN archives) and the version history the backend records on every
 * transition. The backend remains the permission boundary.
 */
export function WorkflowTab({
  route,
  id,
  label,
  entityKey,
  titleField = 'name',
  getDetail,
  entityApi,
  onArchived,
  canArchive = true,
  extraActions,
}: WorkflowTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const detail = useQuery({
    queryKey: [`admin-${route}`, id],
    queryFn: () => getDetail(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [`admin-${route}`] });
    void queryClient.invalidateQueries({ queryKey: [`admin-${route}`, id] });
    void queryClient.invalidateQueries({ queryKey: ['governed'] });
  };

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast({ variant: 'success', title: success });
      invalidate();
    } catch (err) {
      toast({ variant: 'error', title: 'Action failed', description: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const row = detail.data?.[entityKey] as
    | { id: string; status: WorkflowStatus; [key: string]: unknown }
    | undefined;
  if (detail.isError || !row) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-ink">Could not load the workflow state</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
        </CardContent>
      </Card>
    );
  }

  const role = user?.role;
  const versions = detail.data?.versions ?? [];
  const rowTitle = String(row[titleField] ?? '');
  // Captured locally – TS cannot narrow a property access through a closure.
  const archive = entityApi.archive;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} />
            <span className="text-sm text-ink-muted">{STATUS_COPY[row.status]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PreviewLink route={route} id={row.id} />
            {canEdit(role) && row.status === 'DRAFT' && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(() => entityApi.submit(row.id), 'Submitted for review')}
              >
                Submit for review
              </Button>
            )}
            {canReview(role) && row.status === 'IN_REVIEW' && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(() => entityApi.approve(row.id), 'Approved')}
              >
                Approve
              </Button>
            )}
            {canReview(role) && row.status === 'APPROVED' && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(() => entityApi.publish(row.id), 'Published')}
              >
                Publish
              </Button>
            )}
            {extraActions?.(row, busy)}
            {canArchive && archive && isSuperAdmin(role) && row.status !== 'ARCHIVED' && (
              <Button
                variant="destructiveOutline"
                loading={busy}
                onClick={() => setArchiveOpen(true)}
              >
                <Icon icon={archiveOutline} className="h-4 w-4" aria-hidden="true" />
                Archive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-ink-muted">No versions recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border-strong">
              {[...versions].reverse().map((version) => (
                <li key={version.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={version.status} />
                    <time dateTime={version.createdAt} className="text-xs tabular-nums text-ink-faint">
                      {formatDateTime(version.createdAt)}
                    </time>
                  </div>
                  {version.reason && <p className="mt-1 text-xs text-ink-muted">{version.reason}</p>}
                  {version.changedBy && (
                    <p className="mt-0.5 text-xs text-ink-faint">by {version.changedBy}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canArchive && archive && (
        <ConfirmDialog
          open={archiveOpen}
          title={`Archive ${label.toLowerCase()}`}
          description={`This removes "${rowTitle}" from the published site and closes its workflow. This cannot be undone from the CMS.`}
          confirmLabel="Archive"
          tone="danger"
          loading={busy}
          onConfirm={() => {
            setArchiveOpen(false);
            void run(() => archive(row.id), 'Archived').then(() => {
              if (onArchived) onArchived();
              else navigate(`/app/${route}`);
            });
          }}
          onCancel={() => setArchiveOpen(false)}
        />
      )}
    </div>
  );
}
