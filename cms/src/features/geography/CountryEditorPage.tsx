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
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { countryApi } from './api';
import { GeographicWorkflowTab } from './GeographicWorkflowTab';

/** Mirrors backend countryCreateSchema/countryUpdateSchema (validators/registry.js). */
const countrySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isoCode: z
    .string()
    .regex(/^[A-Z]{2}$/, 'ISO code must be exactly two uppercase letters (e.g. AE)')
    .optional(),
  regionGrouping: z.string().max(200, 'Keep the region grouping under 200 characters').optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type CountryForm = z.infer<typeof countrySchema>;

const empty: CountryForm = {
  name: '',
  isoCode: '',
  regionGrouping: '',
  reason: '',
};

/** Optional text → undefined so the backend refs stay clean ('' is invalid). */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Country editor (Phase 13) – create (/app/countries/new) and edit
 * (/app/countries/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (form) / Workflow (status + actions + version
 * history). Every save sends a `reason`; isoCode is create-only (backend
 * countryUpdateSchema omits it).
 */
export function CountryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-countries', id],
    queryFn: () => countryApi.get(id as string),
    enabled: isEdit,
  });

  const form = useForm<CountryForm>({ resolver: zodResolver(countrySchema), defaultValues: empty });

  // Load the record into the form when editing.
  useEffect(() => {
    const row = detail.data?.country;
    if (!row) return;
    form.reset({
      name: row.name ?? '',
      isoCode: row.isoCode ?? '',
      regionGrouping: row.regionGrouping ?? '',
      reason: '',
    });
  }, [detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: CountryForm) {
    try {
      const input = {
        name: values.name,
        regionGrouping: optional(values.regionGrouping),
        reason: values.reason,
      };
      if (isEdit) {
        await countryApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The country is back in draft pending review.' });
      } else {
        await countryApi.create({ ...input, isoCode: optional(values.isoCode) });
        toast({ variant: 'success', title: 'Country created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-countries'] });
      navigate('/app/countries');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create country',
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
          <p className="text-sm font-medium text-ink">Could not load this country</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/countries" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to countries
          </Link>
        </CardContent>
      </Card>
    );
  }

  const countryName = detail.data?.country?.name;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="country-name" label="Name" required error={form.formState.errors.name?.message}>
              <Input
                id="country-name"
                placeholder="e.g. United Arab Emirates"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register('name')}
              />
            </Field>
            <Field
              id="country-iso"
              label="ISO code"
              required={!isEdit}
              hint={isEdit ? 'The ISO code is fixed after creation.' : 'Two uppercase letters, e.g. AE.'}
              error={form.formState.errors.isoCode?.message}
            >
              <Input
                id="country-iso"
                placeholder="AE"
                maxLength={2}
                disabled={isEdit}
                aria-invalid={Boolean(form.formState.errors.isoCode)}
                {...form.register('isoCode')}
              />
            </Field>
          </div>
          <Field
            id="country-region-grouping"
            label="Region grouping"
            hint="Optional grouping shown on the public site, e.g. “Middle East & Africa”."
            error={form.formState.errors.regionGrouping?.message}
          >
            <Input
              id="country-region-grouping"
              placeholder="e.g. Middle East & Africa"
              aria-invalid={Boolean(form.formState.errors.regionGrouping)}
              {...form.register('regionGrouping')}
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
            id="country-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="country-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the region grouping' : 'e.g. Drafting the market profile for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/countries')}>
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
        title={isEdit ? `Edit ${countryName ?? 'country'}` : 'New country'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a country draft for review. Regions and locations hang off it in the registry.'
        }
      />
      <BackLink to="/app/countries">Back to countries</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Country editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: <GeographicWorkflowTab route="countries" id={id as string} label="Country" />,
            },
          ]}
        />
      ) : (
        detailsForm
      )}
    </>
  );
}
