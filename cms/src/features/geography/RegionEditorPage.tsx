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
import { countryApi, regionApi } from './api';
import { GeographicWorkflowTab } from './GeographicWorkflowTab';

/** Mirrors backend regionCreateSchema/regionUpdateSchema (validators/registry.js). */
const regionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  countryId: z.string().min(1, 'Country is required'),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type RegionForm = z.infer<typeof regionSchema>;

const empty: RegionForm = {
  name: '',
  countryId: '',
  reason: '',
};

/**
 * Region editor (Phase 13) – create (/app/regions/new) and edit
 * (/app/regions/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (form) / Workflow (status + actions + version
 * history). Every save sends a `reason`; the country is required (backend
 * schema) and chosen from the governed countries list.
 */
export function RegionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-regions', id],
    queryFn: () => regionApi.get(id as string),
    enabled: isEdit,
  });
  const countries = useQuery({
    queryKey: ['admin-countries'],
    queryFn: countryApi.list,
    select: (data) => data.countries,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<RegionForm>({ resolver: zodResolver(regionSchema), defaultValues: empty });

  useEffect(() => {
    const row = detail.data?.region;
    if (!row) return;
    form.reset({
      name: row.name ?? '',
      countryId: row.countryId ?? '',
      reason: '',
    });
  }, [detail.data, form]);

  const countryOptions = useMemo(
    () =>
      (countries.data ?? [])
        .filter((c) => c.status !== 'ARCHIVED')
        .map((c) => ({ value: c.id, label: c.name })),
    [countries.data],
  );

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: RegionForm) {
    try {
      const input = {
        name: values.name,
        countryId: values.countryId,
        reason: values.reason,
      };
      if (isEdit) {
        await regionApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The region is back in draft pending review.' });
      } else {
        await regionApi.create(input);
        toast({ variant: 'success', title: 'Region created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-regions'] });
      navigate('/app/regions');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create region',
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
          <p className="text-sm font-medium text-ink">Could not load this region</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/regions" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to regions
          </Link>
        </CardContent>
      </Card>
    );
  }

  const regionName = detail.data?.region?.name;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="region-name" label="Name" required error={form.formState.errors.name?.message}>
            <Input
              id="region-name"
              placeholder="e.g. Northern Emirates"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </Field>
          <Field
            id="region-country"
            label="Country"
            required
            error={form.formState.errors.countryId?.message}
          >
            <Select
              id="region-country"
              aria-invalid={Boolean(form.formState.errors.countryId)}
              {...form.register('countryId')}
            >
              <option value="">Select a country…</option>
              {countryOptions.map((option) => (
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
            id="region-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="region-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the regional boundaries' : 'e.g. Drafting the region for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/regions')}>
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
        title={isEdit ? `Edit ${regionName ?? 'region'}` : 'New region'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a region draft for review. Locations hang off it in the registry.'
        }
      />
      <BackLink to="/app/regions">Back to regions</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Region editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: <GeographicWorkflowTab route="regions" id={id as string} label="Region" />,
            },
          ]}
        />
      ) : (
        detailsForm
      )}
    </>
  );
}
