import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import trashCanOutline from '@iconify-icons/mdi/trash-can-outline';
import { useAuth } from '../auth/AuthProvider';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { canEdit } from '../../utils/permissions';
import { formatDateTime } from '../../utils/format';
import {
  LEADERSHIP_EVENT_LABELS,
  LEADERSHIP_EVENT_TYPES,
  leadershipApi,
  type LeadershipEventRow,
} from './api';

interface EventFormState {
  eventType: string;
  date: string;
  notes: string;
}

const emptyForm: EventFormState = { eventType: 'APPOINTED', date: '', notes: '' };

/**
 * Leadership Timeline tab (spec §12) – the appointment history behind the
 * derived `currentStatus`. Reads/writes the child router
 * (POST/PATCH/DELETE /admin/leadership/:id/events, EDITOR+); the backend
 * recomputes ACTIVE/DEPARTED from the latest event after every write.
 * Events are simple children – no reason, no version rows, hard-deletable.
 */
export function LeadershipTimelineTab({ leaderId }: { leaderId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EventFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeadershipEventRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['admin-leadership', leaderId],
    queryFn: () => leadershipApi.get(leaderId),
  });
  const events = useQuery({
    queryKey: ['admin-leadership', leaderId, 'events'],
    queryFn: () => leadershipApi.events(leaderId),
    select: (data) => data.events ?? [],
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-leadership', leaderId] });
    void queryClient.invalidateQueries({ queryKey: ['admin-leadership', leaderId, 'events'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-leadership'] });
  };

  function startEdit(event: LeadershipEventRow) {
    setEditingId(event.id);
    setForm({
      eventType: event.eventType,
      date: event.date.slice(0, 10),
      notes: event.notes ?? '',
    });
    setFormError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.date) {
      setFormError('Date is required.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        eventType: form.eventType as (typeof LEADERSHIP_EVENT_TYPES)[number],
        date: new Date(`${form.date}T00:00:00Z`).toISOString(),
        notes: form.notes.trim() ? form.notes : undefined,
      };
      if (editingId) {
        await leadershipApi.updateEvent(leaderId, editingId, input);
        toast({ variant: 'success', title: 'Event updated' });
      } else {
        await leadershipApi.createEvent(leaderId, input);
        toast({ variant: 'success', title: 'Event added' });
      }
      resetForm();
      invalidate();
    } catch (err) {
      toast({ variant: 'error', title: 'Could not save event', description: apiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await leadershipApi.deleteEvent(leaderId, deleteTarget.id);
      toast({ variant: 'success', title: 'Event deleted' });
      invalidate();
    } catch (err) {
      toast({ variant: 'error', title: 'Could not delete event', description: apiErrorMessage(err) });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (events.isLoading || (detail.isLoading && !detail.data)) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const leader = detail.data?.leadership;
  const rows = events.data ?? [];
  const canWrite = canEdit(user?.role);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone={leader?.currentStatus === 'DEPARTED' ? 'neutral' : 'green'} className="uppercase tracking-wide">
              {leader?.currentStatus ?? 'ACTIVE'}
            </Badge>
            <span className="text-sm text-ink-muted">
              {leader?.currentStatus === 'DEPARTED'
                ? 'This leader has departed – derived from the latest event.'
                : 'Active – derived from the latest event.'}
            </span>
          </div>
        </CardContent>
      </Card>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit event' : 'Add timeline event'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="event-type" label="Type" required>
                  <Select
                    id="event-type"
                    value={form.eventType}
                    onChange={(event) => setForm({ ...form, eventType: event.target.value })}
                  >
                    {LEADERSHIP_EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {LEADERSHIP_EVENT_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  id="event-date"
                  label="Date"
                  required
                  error={formError && !form.date ? formError : undefined}
                >
                  <Input
                    id="event-date"
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    aria-invalid={Boolean(formError && !form.date)}
                  />
                </Field>
              </div>
              <Field
                id="event-notes"
                label="Notes"
                hint="Context for the change – max 1000 characters."
              >
                <Textarea
                  id="event-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder="e.g. Named Managing Director of Lake Oil in 2015…"
                />
              </Field>
              <div className="flex items-center justify-end gap-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" loading={saving}>
                  {editingId ? 'Save event' : 'Add event'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appointment history</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No timeline events yet. {canWrite ? 'Add the first appointment above.' : ''}
            </p>
          ) : (
            <ul className="divide-y divide-border-strong">
              {[...rows]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink">
                          {LEADERSHIP_EVENT_LABELS[event.eventType]}
                        </span>
                        <time dateTime={event.date} className="text-xs tabular-nums text-ink-faint">
                          {formatDateTime(event.date)}
                        </time>
                      </div>
                      {event.notes && <p className="mt-1 text-xs text-ink-muted">{event.notes}</p>}
                    </div>
                    {canWrite && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${LEADERSHIP_EVENT_LABELS[event.eventType]} event`}
                          onClick={() => startEdit(event)}
                        >
                          <Icon icon={pencilOutline} className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          aria-label={`Delete ${LEADERSHIP_EVENT_LABELS[event.eventType]} event`}
                          onClick={() => setDeleteTarget(event)}
                        >
                          <Icon icon={trashCanOutline} className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete timeline event"
        description={
          deleteTarget
            ? `This removes the ${LEADERSHIP_EVENT_LABELS[deleteTarget.eventType]} event from ${leader?.name ?? 'this leader'}'s history. The leader's current status is recomputed from the remaining events.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
