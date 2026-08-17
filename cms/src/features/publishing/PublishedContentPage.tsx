import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import publishOff from '@iconify-icons/mdi/publish-off';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { canReview } from '../../utils/permissions';
import { publishingApi, invalidatePublishing } from './api';
import { PublishingListView } from './PublishingListView';
import { rowLabel, type PublishingEntity, type UnifiedRow } from './registry';
import { PreviewLink } from '../preview/PreviewLink';

/**
 * Published Content (spec §25) – everything currently live on the public site,
 * grouped by entity across every governed route (GET /admin/:route fan-out;
 * no aggregate endpoint exists, so the view filters by status client-side).
 * The backend stays the gate: unpublish is the only mutation here, and it is
 * offered only to REVIEWER+ on entities that have the transition (metrics
 * does not).
 */
export function PublishedContentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [unpublishing, setUnpublishing] = useState<{ entity: PublishingEntity; row: UnifiedRow } | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useQuery({
    queryKey: ['publishing', 'lists'],
    queryFn: publishingApi.lists,
    // Publishing happens elsewhere too – keep this surface fresh.
    refetchInterval: 60_000,
  });

  async function confirmUnpublish() {
    if (!unpublishing) return;
    const { entity, row } = unpublishing;
    setBusy(true);
    try {
      await publishingApi.unpublish(entity.route, row.id);
      toast({
        variant: 'success',
        title: 'Unpublished',
        description: `“${rowLabel(entity, row)}” is back in drafts and off the public site.`,
      });
      await invalidatePublishing(queryClient);
      setUnpublishing(null);
    } catch (err) {
      toast({ variant: 'error', title: 'Could not unpublish', description: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Published Content"
        description="Everything currently live on the public site, across every content type. Unpublish to pull an item back into drafts."
      />

      <PublishingListView
        status="PUBLISHED"
        result={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        emptyTitle="Nothing is published yet"
        emptyDescription="Content appears here once it has been approved and published from the review queue."
        rowLink={(entity) => entity.listPath}
        renderActions={(entity, row) => (
          <div className="flex items-center gap-2">
            <PreviewLink route={entity.route} id={row.id} />
            {canReview(user?.role) && entity.canUnpublish !== false && (
              <Button variant="outline" size="sm" onClick={() => setUnpublishing({ entity, row })}>
                <Icon icon={publishOff} className="h-4 w-4" aria-hidden="true" />
                Unpublish
              </Button>
            )}
          </div>
        )}
      />

      <ConfirmDialog
        open={unpublishing !== null}
        title="Unpublish this content?"
        description={
          <>
            <strong>{unpublishing ? rowLabel(unpublishing.entity, unpublishing.row) : ''}</strong> will be
            removed from the public site immediately and move back to drafts. You can re-publish it later after
            a review.
          </>
        }
        confirmLabel="Unpublish"
        tone="danger"
        loading={busy}
        onConfirm={confirmUnpublish}
        onCancel={() => setUnpublishing(null)}
      />
    </>
  );
}
