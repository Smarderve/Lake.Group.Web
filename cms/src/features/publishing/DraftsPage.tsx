import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import sendOutline from '@iconify-icons/mdi/send-outline';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button, buttonVariants } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { canEdit } from '../../utils/permissions';
import { publishingApi, invalidatePublishing } from './api';
import { PublishingListView } from './PublishingListView';
import { rowLabel, type PublishingEntity, type UnifiedRow } from './registry';
import { PreviewLink } from '../preview/PreviewLink';

/**
 * Drafts (spec §25) – every DRAFT across all governed entities in one place,
 * grouped by type (GET /admin/:route fan-out, status filtered client-side).
 * Drafts are where work starts: submit an item into the review pipeline, or
 * jump into its editor where one exists (news, media – other editors land in
 * later phases). The backend stays the gate – submit is EDITOR+ recent-auth.
 */
export function DraftsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState<{ entity: PublishingEntity; row: UnifiedRow } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const query = useQuery({
    queryKey: ['publishing', 'lists'],
    queryFn: publishingApi.lists,
    // Drafts change as editors work elsewhere – keep this surface fresh.
    refetchInterval: 60_000,
  });

  function closeSubmit() {
    if (busy) return;
    setSubmitting(null);
    setReason('');
  }

  async function confirmSubmit() {
    if (!submitting) return;
    const { entity, row } = submitting;
    setBusy(true);
    try {
      await publishingApi.submit(entity.route, row.id, reason.trim() || undefined);
      toast({
        variant: 'success',
        title: 'Submitted for review',
        description: `“${rowLabel(entity, row)}” is now in the review queue.`,
      });
      await invalidatePublishing(queryClient);
      closeSubmit();
    } catch (err) {
      toast({ variant: 'error', title: 'Could not submit', description: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Drafts"
        description="Every draft across all content types, grouped in one place. Submit an item for review, or open it in its editor."
      />

      <PublishingListView
        status="DRAFT"
        result={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        emptyTitle="No drafts"
        emptyDescription="Create or edit content to start a draft – it lands here until it's submitted for review."
        rowLink={(entity, row) => (entity.editPath ? entity.editPath(row.id) : entity.listPath)}
        renderActions={(entity, row) => (
          <div className="flex items-center gap-2">
            <PreviewLink route={entity.route} id={row.id} />
            {entity.editPath && (
              <Link to={entity.editPath(row.id)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <Icon icon={pencilOutline} className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            )}
            {canEdit(user?.role) && (
              <Button variant="secondary" size="sm" onClick={() => setSubmitting({ entity, row })}>
                <Icon icon={sendOutline} className="h-4 w-4" aria-hidden="true" />
                Submit
              </Button>
            )}
          </div>
        )}
      />

      <Dialog
        open={submitting !== null}
        onClose={closeSubmit}
        title="Submit for review?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeSubmit} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={confirmSubmit} loading={busy}>
              <Icon icon={sendOutline} className="h-4 w-4" aria-hidden="true" />
              Submit for review
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          <strong className="font-medium text-ink">{submitting ? rowLabel(submitting.entity, submitting.row) : ''}</strong>{' '}
          moves to the review queue. A reviewer can approve it for publication.
        </p>
        <label className="mt-4 block">
          <span className="text-xs font-medium text-ink">Reason (optional)</span>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="What changed in this draft?"
            className="mt-1.5"
            rows={3}
          />
        </label>
      </Dialog>
    </>
  );
}
