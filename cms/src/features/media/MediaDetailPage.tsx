import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import archiveOutline from '@iconify-icons/mdi/archive-outline';
import linkVariant from '@iconify-icons/mdi/link-variant';
import { useAuth } from '../auth/AuthProvider';
import { BackLink } from '../../components/ui/BackLink';
import { Button, buttonVariants } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { formatDateTime, formatBytes, formatDate } from '../../utils/format';
import { canEdit, canReview, isSuperAdmin } from '../../utils/permissions';
import { mediaApi, mediaPreviewUrl, isImageMedia, type MediaRow } from './api';

interface DetailProps {
  row: MediaRow;
}

function WorkflowBar({ row, onChanged }: DetailProps & { onChanged: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const navigate = useNavigate();

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast({ variant: 'success', title: success });
      onChanged();
    } catch (err) {
      toast({ variant: 'error', title: 'Action failed', description: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const role = user?.role;
  const canEditRole = canEdit(role);
  const canReviewRole = canReview(role);

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} />
            <span className="text-sm text-ink-muted">
              {row.status === 'DRAFT' && 'Draft – not visible on the public site.'}
              {row.status === 'IN_REVIEW' && 'Awaiting a reviewer.'}
              {row.status === 'APPROVED' && 'Approved – ready to publish.'}
              {row.status === 'PUBLISHED' && 'Live on the public site.'}
              {row.status === 'ARCHIVED' && 'Archived – no longer visible.'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEditRole && row.status === 'DRAFT' && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(() => mediaApi.submit(row.id), 'Submitted for review')}
              >
                Submit for review
              </Button>
            )}
            {canReviewRole && row.status === 'IN_REVIEW' && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(() => mediaApi.approve(row.id), 'Approved')}
              >
                Approve
              </Button>
            )}
            {canReviewRole && row.status === 'APPROVED' && (
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(() => mediaApi.publish(row.id), 'Published')}
              >
                Publish
              </Button>
            )}
            <Link
              to={`/app/media/${row.id}/edit`}
              className={buttonVariants({ variant: 'secondary' })}
              aria-disabled={!canEditRole}
              onClick={(event) => {
                if (!canEditRole) event.preventDefault();
              }}
            >
              <Icon icon={pencilOutline} className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
            {isSuperAdmin(role) && row.status !== 'ARCHIVED' && (
              <Button variant="destructiveOutline" loading={busy} onClick={() => setArchiveOpen(true)}>
                <Icon icon={archiveOutline} className="h-4 w-4" aria-hidden="true" />
                Archive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={archiveOpen}
        title="Archive media item"
        description="This removes the item from the published site and closes its workflow. This cannot be undone from the CMS."
        confirmLabel="Archive"
        tone="danger"
        loading={busy}
        onConfirm={() => {
          setArchiveOpen(false);
          void run(() => mediaApi.archive(row.id), 'Archived').then(() => navigate('/app/media'));
        }}
        onCancel={() => setArchiveOpen(false)}
      />
    </>
  );
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

/** Media detail (spec §21): preview, metadata, usage, version history. */
export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ['admin-media', id],
    queryFn: () => mediaApi.get(id as string),
    select: (data) => data,
  });

  const usages = useQuery({
    queryKey: ['admin-media-usages', id],
    queryFn: () => mediaApi.usages(id as string),
    select: (data) => data.usages ?? [],
  });

  const folders = useQuery({
    queryKey: ['admin-media-folders'],
    queryFn: mediaApi.folders,
    select: (data) => data.mediaFolders ?? [],
    staleTime: 5 * 60 * 1000,
  });

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const row = detail.data?.media;

  if (detail.isError || !row) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-ink">Could not load this media item</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/media" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to media library
          </Link>
        </CardContent>
      </Card>
    );
  }

  const preview = mediaPreviewUrl(row);
  const image = isImageMedia(row);
  const folderName = folders.data?.find((folder) => folder.id === row.folderId)?.name;
  const tags = row.tags ?? [];
  const versions = detail.data?.versions ?? [];

  return (
    <>
      <PageHeader
        title={row.altText || row.caption || 'Media item'}
        description="Preview, metadata, where it is used, and its workflow state."
      />
      <BackLink to="/app/media">Back to media library</BackLink>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-surface-muted">
                {image ? (
                  <img
                    src={preview}
                    alt={row.altText ?? ''}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-ink-faint">
                    <Icon icon={linkVariant} className="h-10 w-10" aria-hidden="true" />
                    <span className="text-xs">{row.mimeType ?? 'file'}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border-strong px-4 py-3">
                <p className="truncate text-xs text-ink-muted">{row.url}</p>
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-medium text-brand-700 hover:underline"
                >
                  Open original ↗
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Where it's used</CardTitle>
            </CardHeader>
            <CardContent>
              {usages.isLoading ? (
                <div className="py-6 text-center">
                  <Spinner />
                </div>
              ) : usages.data && usages.data.length > 0 ? (
                <ul className="divide-y divide-border-strong">
                  {usages.data.map((usage) => (
                    <li key={usage.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{usage.entityType}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {usage.field} · {usage.entityId}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-ink-faint">{formatDate(usage.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">Not used by any published entity yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <WorkflowBar
            row={row}
            onChanged={() => {
              void queryClient.invalidateQueries({ queryKey: ['admin-media'] });
              void queryClient.invalidateQueries({ queryKey: ['admin-media', id] });
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetaItem label="Status">{row.status.replace('_', ' ')}</MetaItem>
                <MetaItem label="Type">{row.mimeType ?? '–'}</MetaItem>
                {row.width && row.height ? (
                  <MetaItem label="Dimensions">
                    {row.width}×{row.height}px
                  </MetaItem>
                ) : (
                  <MetaItem label="Dimensions">–</MetaItem>
                )}
                <MetaItem label="Size">{formatBytes(row.sizeBytes)}</MetaItem>
                <MetaItem label="Folder">{folderName ?? '–'}</MetaItem>
                <MetaItem label="Created">{formatDateTime(row.createdAt)}</MetaItem>
                <MetaItem label="Updated">{formatDateTime(row.updatedAt)}</MetaItem>
                <MetaItem label="Copyright">{row.copyright ?? '–'}</MetaItem>
                <MetaItem label="License">{row.license ?? '–'}</MetaItem>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Caption &amp; tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {row.caption ? (
                <p className="text-sm text-ink">{row.caption}</p>
              ) : (
                <p className="text-sm text-ink-muted">No caption.</p>
              )}
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-faint">No tags.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Version history</CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-sm text-ink-muted">No versions recorded.</p>
              ) : (
                <ul className="divide-y divide-border-strong">
                  {[...versions].reverse().map((version) => (
                    <li key={version.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={version.status} />
                        <time dateTime={version.createdAt} className="text-xs text-ink-faint">
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
        </div>
      </div>
    </>
  );
}
