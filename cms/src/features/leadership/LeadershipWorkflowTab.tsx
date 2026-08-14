import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import archiveOutline from '@iconify-icons/mdi/archive-outline';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { canEdit, canReview, isSuperAdmin } from '../../utils/permissions';
import { formatDateTime } from '../../utils/format';
import { leadershipApi } from './api';
import { PreviewLink } from '../preview/PreviewLink';

const STATUS_COPY: Record<string, string> = {
  DRAFT: 'Draft – not visible on the public site.',
  IN_REVIEW: 'Awaiting a reviewer.',
  APPROVED: 'Approved – ready to publish.',
  PUBLISHED: 'Live on the public site.',
  ARCHIVED: 'Archived – no longer visible.',
};

/**
 * Leadership Workflow tab (spec §12). Status + role-gated transitions against
 * the real governed endpoints (EDITOR+ submits, REVIEWER+ approves/publishes,
 * SUPER_ADMIN archives) and the version history the backend records on every
 * transition. The backend remains the permission boundary.
 */
export function LeadershipWorkflowTab({ leaderId }: { leaderId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const detail = useQuery({
    queryKey: ['admin-leadership', leaderId],
    queryFn: () => leadershipApi.get(leaderId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-leadership'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-leadership', leaderId] });
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

  const row = detail.data?.leadership;
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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} />
            <span className="text-sm text-ink-muted">{STATUS_COPY[row.status]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PreviewLink route="leadership" id={row.id} />
            {canEdit(role) && row.status === 'DRAFT' && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(() => leadershipApi.submit(row.id), 'Submitted for review')}
              >
                Submit for review
              </Button>
            )}
            {canReview(role) && row.status === 'IN_REVIEW' && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(() => leadershipApi.approve(row.id), 'Approved')}
              >
                Approve
              </Button>
            )}
            {canReview(role) && row.status === 'APPROVED' && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(() => leadershipApi.publish(row.id), 'Published')}
              >
                Publish
              </Button>
            )}
            {isSuperAdmin(role) && row.status !== 'ARCHIVED' && (
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

      <ConfirmDialog
        open={archiveOpen}
        title="Archive leader"
        description={`This removes "${row.name}" from the published site and closes their workflow. This cannot be undone from the CMS.`}
        confirmLabel="Archive"
        tone="danger"
        loading={busy}
        onConfirm={() => {
          setArchiveOpen(false);
          void run(() => leadershipApi.archive(row.id), 'Archived').then(() => navigate('/app/leadership'));
        }}
        onCancel={() => setArchiveOpen(false)}
      />
    </div>
  );
}
