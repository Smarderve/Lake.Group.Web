import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { BackLink } from '../../components/ui/BackLink';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Tabs } from '../../components/ui/Tabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { WorkflowTab } from '../../components/workflow/WorkflowTab';
import { useAuth } from '../auth/AuthProvider';
import { canEdit, canReview, isSuperAdmin } from '../../utils/permissions';
import { formatDateTime } from '../../utils/format';
import { metricApi, isStaleMetric, type MetricRow } from './api';

/**
 * Mirrors metricBaseSchema (validators/metrics.js). `key` is optional in the
 * form because it is immutable on edit (metricUpdateSchema omits it); create
 * requires it. `consumers` is captured as comma-separated text and split on
 * submit.
 */
const metricFormSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Key must be lowercase alphanumeric (a-z, 0-9, -, _)')
    .optional(),
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required'),
  unit: z.string().max(80).optional(),
  source: z.string().min(1, 'Source is required – where does this figure come from?'),
  effectiveDate: z.string().optional(),
  consumers: z.string().optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type MetricForm = z.infer<typeof metricFormSchema>;

const empty: MetricForm = {
  key: '',
  label: '',
  value: '',
  unit: '',
  source: '',
  effectiveDate: '',
  consumers: '',
  reason: '',
};

function splitConsumers(text: string | undefined): string[] | undefined {
  const items = (text ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Corporate metrics editor (Phase 16) – create (/app/metrics/new) and edit
 * (/app/metrics/:id/edit) against the real metrics router. Three tabs:
 * Details (the fact itself), Verification (re-check state – the data-truth
 * signal), and Workflow (status + transitions + version history). There is
 * no archive transition on metrics; rollback is a super-admin extra action.
 */
export function MetricEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-metrics', id],
    queryFn: () => metricApi.get(id as string),
    enabled: isEdit,
  });

  const form = useForm<MetricForm>({
    resolver: zodResolver(metricFormSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    const row = detail.data?.metric;
    if (!row) return;
    form.reset({
      key: row.key ?? '',
      label: row.label ?? '',
      value: row.value ?? '',
      unit: row.unit ?? '',
      source: row.source ?? '',
      effectiveDate: row.effectiveDate ? row.effectiveDate.slice(0, 10) : '',
      consumers: (row.consumers ?? []).join(', '),
      reason: '',
    });
  }, [detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: MetricForm) {
    if (!isEdit && !values.key) {
      toast({ variant: 'error', title: 'Key is required', description: 'Every metric needs a stable key.' });
      return;
    }
    try {
      const input = {
        label: values.label,
        value: values.value,
        unit: values.unit?.trim() || undefined,
        source: values.source,
        reason: values.reason,
        effectiveDate: values.effectiveDate || undefined,
        consumers: splitConsumers(values.consumers),
      };
      if (isEdit) {
        await metricApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The metric is back in draft pending review.' });
      } else {
        await metricApi.create({ ...input, key: values.key as string });
        toast({ variant: 'success', title: 'Metric created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
      navigate('/app/metrics');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create metric',
        description: apiErrorMessage(err),
      });
    }
  }

  if (isBusy) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEdit && detail.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-ink">Could not load this metric</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/metrics" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to metrics
          </Link>
        </CardContent>
      </Card>
    );
  }

  const metric = detail.data?.metric;
  const metricLabel = metric?.label;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Metric</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEdit && (
            <Field
              id="metric-key"
              label="Key"
              required
              hint="A stable identifier, e.g. employees.total. Cannot be changed later."
              error={form.formState.errors.key?.message}
            >
              <Input
                id="metric-key"
                placeholder="e.g. employees.total"
                aria-invalid={Boolean(form.formState.errors.key)}
                {...form.register('key')}
              />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="metric-label" label="Label" required error={form.formState.errors.label?.message}>
              <Input
                id="metric-label"
                placeholder="e.g. Total employees"
                aria-invalid={Boolean(form.formState.errors.label)}
                {...form.register('label')}
              />
            </Field>
            <Field id="metric-source" label="Source" required hint="Where does this figure come from?" error={form.formState.errors.source?.message}>
              <Input
                id="metric-source"
                placeholder="e.g. audited financial statements, FY2024"
                aria-invalid={Boolean(form.formState.errors.source)}
                {...form.register('source')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="metric-value" label="Value" required error={form.formState.errors.value?.message}>
              <Input
                id="metric-value"
                placeholder="e.g. 1,200"
                aria-invalid={Boolean(form.formState.errors.value)}
                {...form.register('value')}
              />
            </Field>
            <Field id="metric-unit" label="Unit" hint="Optional, e.g. people, %, US$m" error={form.formState.errors.unit?.message}>
              <Input
                id="metric-unit"
                placeholder="e.g. people"
                aria-invalid={Boolean(form.formState.errors.unit)}
                {...form.register('unit')}
              />
            </Field>
            <Field id="metric-effective-date" label="As of" hint="Optional – when the figure applies." error={form.formState.errors.effectiveDate?.message}>
              <Input
                id="metric-effective-date"
                type="date"
                aria-invalid={Boolean(form.formState.errors.effectiveDate)}
                {...form.register('effectiveDate')}
              />
            </Field>
          </div>
          <Field
            id="metric-consumers"
            label="Consumers"
            hint="Comma-separated pages or components that display this figure, e.g. About, Contact, Careers."
            error={form.formState.errors.consumers?.message}
          >
            <Textarea
              id="metric-consumers"
              rows={2}
              placeholder="e.g. About page, Investors page"
              aria-invalid={Boolean(form.formState.errors.consumers)}
              {...form.register('consumers')}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change reason</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            id="metric-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="metric-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated headcount from the FY2024 audit' : 'e.g. Drafting the figure for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/metrics')}>
          Cancel
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {isEdit ? 'Save changes' : 'Create draft'}
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <PageHeader
        title={isEdit ? `Edit ${metricLabel ?? 'metric'}` : 'New metric'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Record a corporate figure as a draft for review.'
        }
      />
      <BackLink to="/app/metrics">Back to metrics</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Metric editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'verification',
              label: 'Verification',
              content: <VerificationTab metric={metric} metricId={id as string} />,
            },
            {
              value: 'workflow',
              label: 'Workflow',
              content: (
                <WorkflowTab
                  route="metrics"
                  id={id as string}
                  label="Metric"
                  entityKey="metric"
                  titleField="label"
                  getDetail={(detailId) => metricApi.get(detailId)}
                  entityApi={metricApi}
                  canArchive={false}
                  extraActions={(row, busy) => <RollbackAction metricId={row.id} status={row.status} busy={busy} />}
                />
              ),
            },
          ]}
        />
      ) : (
        detailsForm
      )}
    </>
  );
}

/**
 * Verification tab – the data-truth surface of the metric. Shows the current
 * verification state (who-what-when is in the version history) and the
 * "Mark as re-verified" action. Re-verification never touches the value or
 * the workflow: it only records that the fact was re-checked.
 */
function VerificationTab({ metric, metricId }: { metric: MetricRow | undefined; metricId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  if (!metric) return null;

  const stale = isStaleMetric(metric);
  const canVerify = canEdit(user?.role) || canReview(user?.role);

  async function verify() {
    setSaving(true);
    try {
      await metricApi.verify(metricId, {
        note: note.trim() || undefined,
        verificationDate: date || undefined,
      });
      toast({ variant: 'success', title: 'Verification recorded', description: 'The figure no longer needs a re-check.' });
      void queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-metrics', metricId] });
      setNote('');
    } catch (err) {
      toast({ variant: 'error', title: 'Could not record verification', description: apiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {stale ? (
        <Alert
          tone="warning"
          title="Needs re-check"
          description={
            metric.verificationStatus === 'VERIFIED'
              ? `Last verified ${formatDateTime(metric.verificationDate as string)} – outside the 180-day window.`
              : 'This figure has never been verified. Confirm it against the source before it is relied on.'
          }
        />
      ) : (
        <Alert
          tone="success"
          title="Verified"
          description={
            metric.verificationDate
              ? `Last re-checked ${formatDateTime(metric.verificationDate)}.`
              : 'Marked as verified.'
          }
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Verification state</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Status</dt>
              <dd className="mt-1">
                <Badge tone={metric.verificationStatus === 'VERIFIED' ? 'green' : 'neutral'}>
                  {metric.verificationStatus === 'VERIFIED' ? 'Verified' : 'Unverified'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Last verified</dt>
              <dd className="mt-1 text-sm text-ink">
                {metric.verificationDate ? formatDateTime(metric.verificationDate) : 'Never'}
              </dd>
            </div>
            {metric.verificationNote && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Note</dt>
                <dd className="mt-1 text-sm text-ink-muted">{metric.verificationNote}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">Consumers</dt>
              <dd className="mt-1 text-sm text-ink-muted">
                {metric.consumers && metric.consumers.length > 0 ? metric.consumers.join(', ') : 'None recorded'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mark as re-verified</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-muted">
            Record that this figure was re-checked against its source. This clears the stale flag without changing
            the value or the workflow status.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="metric-verify-note" label="Note" hint="Optional – what was checked.">
              <Input
                id="metric-verify-note"
                placeholder="e.g. Confirmed against the FY2024 audit"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <Field id="metric-verify-date" label="Verified on" hint="Defaults to today.">
              <Input id="metric-verify-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button loading={saving} disabled={!canVerify} onClick={() => void verify()}>
              Record verification
            </Button>
          </div>
          {!canVerify && (
            <p className="text-right text-xs text-ink-faint">
              Only editors and reviewers can record a verification.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Rollback – super-admin only. Restores the most recent previously published
 * value without touching the workflow (the backend creates a new PUBLISHED
 * version, history is preserved).
 */
function RollbackAction({ metricId, status, busy }: { metricId: string; status: string; busy: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!isSuperAdmin(user?.role) || status !== 'PUBLISHED') return null;

  async function rollback() {
    try {
      await metricApi.rollback(metricId);
      toast({ variant: 'success', title: 'Value rolled back', description: 'The previous published value is live again.' });
      void queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-metrics', metricId] });
    } catch (err) {
      toast({ variant: 'error', title: 'Could not roll back', description: apiErrorMessage(err) });
    }
  }

  return (
    <>
      <Button variant="destructiveOutline" loading={busy} onClick={() => setOpen(true)}>
        Roll back value
      </Button>
      <ConfirmDialog
        open={open}
        title="Roll back value"
        description="Restores the most recent previously published value for this metric. The current value is replaced and the change is recorded in the version history."
        confirmLabel="Roll back"
        tone="danger"
        loading={busy}
        onConfirm={() => {
          setOpen(false);
          void rollback();
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
