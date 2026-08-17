import { useEffect, useMemo, useState } from 'react';
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
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { optionalRef } from '../../services/governed';
import { WorkflowTab } from '../../components/workflow/WorkflowTab';
import { companyApi } from '../companies/api';
import { mediaApi } from '../media/api';
import { csrEntryApi } from './api';

/** Mirrors backend csrEntryCreateSchema (validators/cms.js). */
const csrEntrySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(4000, 'Keep the description under 4000 characters').optional(),
  category: z.string().max(80, 'Keep the category under 80 characters').optional(),
  imageMediaId: z.string().optional(),
  companyId: z.string().optional(),
  date: z.string().optional(),
  period: z.string().max(80, 'Keep the period under 80 characters').optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type CsrEntryForm = z.infer<typeof csrEntrySchema>;

const empty: CsrEntryForm = {
  title: '',
  description: '',
  category: '',
  imageMediaId: '',
  companyId: '',
  date: '',
  period: '',
  reason: '',
};

/**
 * CSR entry editor (Phase 15) – create (/app/csr/new) and edit (/app/csr/:id/edit)
 * against the real governed endpoint. Editing is a tabbed editor: Details (form) /
 * Workflow (status + actions + version history).
 */
export function CsrEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-csr-entries', id],
    queryFn: () => csrEntryApi.get(id as string),
    enabled: isEdit,
  });
  const companies = useQuery({
    queryKey: ['admin-companies'],
    queryFn: companyApi.list,
    select: (data) => data.companies,
    staleTime: 5 * 60 * 1000,
  });
  const media = useQuery({
    queryKey: ['admin-media'],
    queryFn: mediaApi.list,
    select: (data) => data.media,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<CsrEntryForm>({
    resolver: zodResolver(csrEntrySchema),
    defaultValues: empty,
  });

  useEffect(() => {
    const row = detail.data?.cSREntry;
    if (!row) return;
    form.reset({
      title: row.title ?? '',
      description: row.description ?? '',
      category: row.category ?? '',
      imageMediaId: row.imageMediaId ?? '',
      companyId: row.companyId ?? '',
      date: row.date ? row.date.slice(0, 10) : '',
      period: row.period ?? '',
      reason: '',
    });
  }, [detail.data, form]);

  const companyOptions = useMemo(
    () =>
      (companies.data ?? [])
        .filter((c) => c.status !== 'ARCHIVED')
        .map((c) => ({ value: c.id, label: c.name })),
    [companies.data],
  );
  const mediaOptions = useMemo(
    () =>
      (media.data ?? []).map((m) => ({
        value: m.id,
        label: `${m.altText || m.caption || m.url}${m.status === 'PUBLISHED' ? '' : ` (${m.status.replace('_', ' ')})`}`,
      })),
    [media.data],
  );

  // reset() can run before the registry option lists finish loading, and an
  // uncontrolled <select> coerces a not-yet-present value to the placeholder.
  // Re-apply the stored refs once the option lists are populated (same shared
  // editor fix as the project/location/facility/career editors).
  useEffect(() => {
    const row = detail.data?.cSREntry;
    if (!row) return;
    if (row.companyId && companyOptions.some((o) => o.value === row.companyId)) {
      form.setValue('companyId', row.companyId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
    if (row.imageMediaId && mediaOptions.some((o) => o.value === row.imageMediaId)) {
      form.setValue('imageMediaId', row.imageMediaId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [companyOptions, mediaOptions, detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: CsrEntryForm) {
    try {
      const input = {
        title: values.title,
        description: optionalRef(values.description),
        category: optionalRef(values.category),
        imageMediaId: optionalRef(values.imageMediaId) ?? null,
        companyId: optionalRef(values.companyId),
        date: optionalRef(values.date),
        period: optionalRef(values.period),
        reason: values.reason,
      };
      if (isEdit) {
        await csrEntryApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The entry is back in draft pending review.' });
      } else {
        await csrEntryApi.create(input);
        toast({ variant: 'success', title: 'Entry created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-csr-entries'] });
      navigate('/app/csr');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create entry',
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
          <p className="text-sm font-medium text-ink">Could not load this entry</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/csr" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to CSR
          </Link>
        </CardContent>
      </Card>
    );
  }

  const title = detail.data?.cSREntry?.title;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="csr-title" label="Title" required error={form.formState.errors.title?.message}>
            <Input
              id="csr-title"
              placeholder="e.g. Port community clean-up"
              aria-invalid={Boolean(form.formState.errors.title)}
              {...form.register('title')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="csr-category" label="Category" error={form.formState.errors.category?.message}>
              <Input
                id="csr-category"
                placeholder="e.g. Community"
                aria-invalid={Boolean(form.formState.errors.category)}
                {...form.register('category')}
              />
            </Field>
            <Field id="csr-period" label="Period" error={form.formState.errors.period?.message}>
              <Input
                id="csr-period"
                placeholder="e.g. 2024"
                aria-invalid={Boolean(form.formState.errors.period)}
                {...form.register('period')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="csr-company"
              label="Company"
              hint="The company this entry belongs to."
              error={form.formState.errors.companyId?.message}
            >
              <Select
                id="csr-company"
                aria-invalid={Boolean(form.formState.errors.companyId)}
                {...form.register('companyId')}
              >
                <option value="">Group level</option>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="csr-date" label="Date" error={form.formState.errors.date?.message}>
              <Input
                id="csr-date"
                type="date"
                aria-invalid={Boolean(form.formState.errors.date)}
                {...form.register('date')}
              />
            </Field>
          </div>
          <Field
            id="csr-description"
            label="Description"
            hint="What was done and the difference it made. Shown on the public site."
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="csr-description"
              rows={5}
              placeholder="e.g. Staff volunteered across three shifts to clean the harbour front…"
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </Field>
          <Field
            id="csr-image-media"
            label="Image"
            hint="Optional link to the media library – usage is tracked on the media item."
            error={form.formState.errors.imageMediaId?.message}
          >
            <Select
              id="csr-image-media"
              aria-invalid={Boolean(form.formState.errors.imageMediaId)}
              {...form.register('imageMediaId')}
            >
              <option value="">None</option>
              {mediaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change reason</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            id="csr-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="csr-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the period' : 'e.g. Drafting the CSR entry for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/csr')}>
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
        title={isEdit ? `Edit ${title ?? 'entry'}` : 'New CSR entry'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a corporate social responsibility entry draft for review.'
        }
      />
      <BackLink to="/app/csr">Back to CSR</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="CSR entry editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: (
                <WorkflowTab
                  route="csr-entries"
                  id={id as string}
                  label="CSR entry"
                  entityKey="cSREntry"
                  titleField="title"
                  getDetail={(detailId) => csrEntryApi.get(detailId)}
                  entityApi={csrEntryApi}
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
