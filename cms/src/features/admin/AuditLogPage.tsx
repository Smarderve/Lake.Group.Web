import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from './api';
import { apiErrorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

const PAGE_SIZE = 25;

function label(value: string) {
  return value.replace(/_/g, ' ');
}

export function AuditLogPage() {
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [filters, setFilters] = useState({ action: '', actorId: '' });
  const [offset, setOffset] = useState(0);
  const entries = useQuery({
    queryKey: ['admin', 'audit-log', filters, offset],
    queryFn: () =>
      adminApi.auditLog({
        limit: PAGE_SIZE,
        offset,
        action: filters.action || undefined,
        actorId: filters.actorId || undefined,
      }),
  });

  return (
    <>
      <PageHeader
        title="Audit Trail"
        description="Immutable security and governance events, newest first. Sensitive request data is never recorded."
      />
      <Card className="mb-4 p-4">
        <form
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setOffset(0);
            setFilters({ action: action.trim(), actorId: actorId.trim() });
          }}
        >
          <Field id="audit-action" label="Action">
            <Input
              id="audit-action"
              name="auditAction"
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. CONTENT_PUBLISHED…"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            />
          </Field>
          <Field id="audit-actor" label="Actor ID">
            <Input
              id="audit-actor"
              name="auditActorId"
              autoComplete="off"
              spellCheck={false}
              placeholder="Exact user ID…"
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
            />
          </Field>
          <Button type="submit" className="self-end">
            Apply filters
          </Button>
        </form>
      </Card>

      {entries.isPending ? (
        <Card className="space-y-3 p-5" aria-label="Loading audit events">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : entries.isError ? (
        <ErrorState message={apiErrorMessage(entries.error)} onRetry={() => void entries.refetch()} />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table aria-label="Audit events">
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{label(entry.action)}</TableCell>
                    <TableCell>
                      <p className="font-mono text-xs">{entry.actorId ?? 'System'}</p>
                      {entry.ip && <p className="mt-0.5 text-xs text-ink-muted">{entry.ip}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.resource}</TableCell>
                    <TableCell>
                      {entry.metadata ? (
                        <details className="max-w-xs">
                          <summary className="cursor-pointer text-xs font-medium text-brand-700">View metadata</summary>
                          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-surface-muted p-2 text-[11px] text-ink">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-ink-faint">–</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-ink-muted">{formatDate(entry.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Pagination
            className="mt-4"
            meta={{ total: entries.data.total, limit: entries.data.limit, offset: entries.data.offset }}
            onPageChange={setOffset}
          />
        </>
      )}
    </>
  );
}
