import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import openInNew from '@iconify-icons/mdi/open-in-new';
import { Alert } from '../../components/ui/Alert';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button, buttonVariants } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiUrl } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/format';
import { PUBLISHING_ENTITIES, rowLabel } from '../publishing/registry';
import { previewApi, type PreviewPayload } from './api';

const CONTENT_FIELDS = ['body', 'description', 'bio', 'impact', 'content', 'caption'] as const;
const TITLE_FIELDS = ['title', 'name', 'jobTitle', 'label', 'key', 'slug'] as const;
const IMAGE_FIELDS = ['bannerImage', 'photo', 'logo', 'url'] as const;
const HIDDEN_DETAIL_FIELDS = new Set([
  'id',
  'status',
  'createdAt',
  'updatedAt',
  ...CONTENT_FIELDS,
  ...TITLE_FIELDS,
  ...IMAGE_FIELDS,
]);

function textValue(record: Record<string, unknown>, fields: readonly string[]): string | null {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function imageValue(record: Record<string, unknown>): string | null {
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType : '';
  for (const field of IMAGE_FIELDS) {
    const value = record[field];
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) continue;
    if (field !== 'url' || mimeType.startsWith('image/') || /\.(avif|gif|jpe?g|png|svg|webp)(\?|$)/i.test(value)) {
      return value;
    }
  }
  return null;
}

function displayValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  return null;
}

function humanize(value: string): string {
  return value
    .replace(/Id$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function PreviewBody({ value }: { value: unknown }) {
  if (typeof value === 'string') {
    return <div className="whitespace-pre-wrap text-[15px] leading-7 text-ink">{value}</div>;
  }
  if (value && typeof value === 'object') {
    return (
      <dl className="space-y-4">
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <div key={key}>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{humanize(key)}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-ink">
              {displayValue(item) ?? JSON.stringify(item, null, 2)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p className="text-sm text-ink-muted">No long-form content is attached to this record.</p>;
}

function PreviewDocument({ preview }: { preview: PreviewPayload }) {
  const entity = PUBLISHING_ENTITIES.find((item) => item.route === preview.route);
  const title = textValue(preview.record, TITLE_FIELDS) ?? rowLabel(
    entity ?? {
      route: preview.route,
      label: humanize(preview.route),
      labelFields: [],
      listPath: '/app',
    },
    { ...preview.record, id: String(preview.record.id ?? '') },
  );
  const image = imageValue(preview.record);
  const contentField = CONTENT_FIELDS.find((field) => preview.record[field] != null);
  const details = Object.entries(preview.record)
    .filter(([key, value]) => !HIDDEN_DETAIL_FIELDS.has(key) && displayValue(value) !== null)
    .slice(0, 12);
  const metricValue = preview.route === 'metrics' ? displayValue(preview.record.value) : null;
  const metricUnit = preview.route === 'metrics' ? displayValue(preview.record.unit) : null;
  const date = textValue(preview.record, ['publicationDate', 'date', 'effectiveDate', 'postedDate']);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-ink px-5 py-3 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Lake Group · Content preview</p>
          <span className="text-xs text-white/60">Authenticated CMS view</span>
        </div>
      </div>

      {image && (
        <div className="aspect-[16/6] overflow-hidden border-b border-border bg-surface-muted">
          <img
            src={image}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.closest('div')?.classList.add('hidden');
            }}
          />
        </div>
      )}

      <article className="mx-auto max-w-4xl px-5 py-8 sm:px-10 sm:py-12">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{entity?.label ?? humanize(preview.route)}</Badge>
          <StatusBadge status={preview.status} />
          {date && <time dateTime={date} className="text-xs text-ink-faint">{formatDate(date)}</time>}
        </div>

        <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-4xl">
          {title}
        </h2>

        {metricValue ? (
          <div className="mt-8 border-l-4 border-brand-600 pl-5">
            <p className="text-5xl font-semibold tracking-[-0.04em] text-ink">
              {metricValue}
              {metricUnit && <span className="ml-2 text-xl font-medium text-ink-muted">{metricUnit}</span>}
            </p>
          </div>
        ) : (
          <div className="mt-8 border-t border-border pt-7">
            <PreviewBody value={contentField ? preview.record[contentField] : null} />
          </div>
        )}

        {details.length > 0 && (
          <section className="mt-10 border-t border-border pt-6" aria-labelledby="preview-details-heading">
            <h3 id="preview-details-heading" className="text-sm font-semibold text-ink">Public details</h3>
            <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {details.map(([key, value]) => (
                <div key={key} className="border-b border-border pb-3">
                  <dt className="text-xs text-ink-faint">{humanize(key)}</dt>
                  <dd className="mt-1 break-words text-sm text-ink">{displayValue(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <p className="mt-10 border-t border-border pt-4 text-xs text-ink-faint">
          Response updated {formatDateTime(preview.record.updatedAt as string | undefined)}
        </p>
      </article>
    </Card>
  );
}

export function PreviewPage() {
  const { route = '', id = '' } = useParams<{ route: string; id: string }>();
  const entity = useMemo(() => PUBLISHING_ENTITIES.find((item) => item.route === route), [route]);
  const query = useQuery({
    queryKey: ['preview', route, id],
    queryFn: () => previewApi.get(route, id),
    enabled: Boolean(route && id),
  });
  const preview = query.data?.preview;
  const backPath = entity?.editPath?.(id) ?? entity?.listPath ?? '/app/drafts';

  if (query.isLoading) {
    return (
      <div role="status" aria-label="Loading preview">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        <Skeleton className="mt-6 h-[32rem] w-full rounded-xl" />
        <span className="sr-only">Loading preview</span>
      </div>
    );
  }

  if (query.isError || !preview) {
    return (
      <ErrorState
        title="Could not load this preview"
        message="The preview service could not prepare this content. The public website has not been changed."
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Public website preview"
        description="This authenticated preview uses the same response shape and visibility rules as the public API."
        actions={
          <>
            <Link to={backPath} className={buttonVariants({ variant: 'outline' })}>Back to content</Link>
            {preview.publiclyVisible && (
              <Button
                variant="secondary"
                onClick={() => window.open(apiUrl(preview.publicPath), '_blank', 'noopener,noreferrer')}
              >
                <Icon icon={openInNew} className="h-4 w-4" aria-hidden="true" />
                Open live response
              </Button>
            )}
          </>
        }
      />

      <Alert
        tone={preview.publiclyVisible ? 'success' : 'warning'}
        title={preview.publiclyVisible ? 'This content is live' : 'Private preview – not visible publicly'}
        description={
          preview.publiclyVisible
            ? 'The public API currently serves this record. The preview below matches that public response.'
            : `${preview.visibilityReason}. Only authenticated CMS users can access the preview below.`
        }
        className="mb-5"
      />

      <PreviewDocument preview={preview} />
    </>
  );
}
