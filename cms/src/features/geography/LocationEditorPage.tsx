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
import { countryApi, locationApi, regionApi } from './api';
import { GeographicWorkflowTab } from './GeographicWorkflowTab';

/** Mirrors backend locationCreateSchema/locationUpdateSchema (validators/registry.js). */
const locationSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    regionId: z.string().optional(),
    countryId: z.string().optional(),
    // Optional fields must tolerate the empty string – regex on '' would
    // otherwise block saving without coordinates.
    latitude: z
      .string()
      .optional()
      .refine((value) => !value || /^-?\d+(\.\d+)?$/.test(value.trim()), {
        message: 'Latitude must be a number, e.g. 25.2048',
      }),
    longitude: z
      .string()
      .optional()
      .refine((value) => !value || /^-?\d+(\.\d+)?$/.test(value.trim()), {
        message: 'Longitude must be a number, e.g. 55.2708',
      }),
    type: z.string().max(100, 'Keep the type under 100 characters').optional(),
    reason: z.string().min(1, 'Reason is required – why is this changing?'),
  })
  .superRefine((values, ctx) => {
    // Backend requires at least one of regionId/countryId.
    if (!values.regionId && !values.countryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['countryId'],
        message: 'A location belongs to a country or a region – pick at least one.',
      });
    }
  });

type LocationForm = z.infer<typeof locationSchema>;

const empty: LocationForm = {
  name: '',
  regionId: '',
  countryId: '',
  latitude: '',
  longitude: '',
  type: '',
  reason: '',
};

/** Optional select → undefined so the backend refs stay clean ('' is invalid). */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Location editor (Phase 13) – create (/app/locations/new) and edit
 * (/app/locations/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (form) / Workflow (status + actions + version
 * history). A location belongs to a country or a region (backend superRefine);
 * picking a region is preferred and carries its country along.
 */
export function LocationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-locations', id],
    queryFn: () => locationApi.get(id as string),
    enabled: isEdit,
  });
  const countries = useQuery({
    queryKey: ['admin-countries'],
    queryFn: countryApi.list,
    select: (data) => data.countries,
    staleTime: 5 * 60 * 1000,
  });
  const regions = useQuery({
    queryKey: ['admin-regions'],
    queryFn: regionApi.list,
    select: (data) => data.regions,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<LocationForm>({ resolver: zodResolver(locationSchema), defaultValues: empty });

  useEffect(() => {
    const row = detail.data?.location;
    if (!row) return;
    form.reset({
      name: row.name ?? '',
      regionId: row.regionId ?? '',
      countryId: row.countryId ?? '',
      latitude: row.latitude != null ? String(row.latitude) : '',
      longitude: row.longitude != null ? String(row.longitude) : '',
      type: row.type ?? '',
      reason: '',
    });
  }, [detail.data, form]);

  const regionOptions = useMemo(
    () =>
      (regions.data ?? [])
        .filter((r) => r.status !== 'ARCHIVED')
        .map((r) => ({ value: r.id, label: r.name })),
    [regions.data],
  );
  const countryOptions = useMemo(
    () =>
      (countries.data ?? [])
        .filter((c) => c.status !== 'ARCHIVED')
        .map((c) => ({ value: c.id, label: c.name })),
    [countries.data],
  );

  // reset() can run before the region/country option lists finish loading, and
  // an uncontrolled <select> coerces a not-yet-present value to the
  // placeholder. Re-apply the stored refs once the option lists are populated.
  // Values pointing at archived records are left alone (the option cannot
  // render, but the saved reference is preserved on submit).
  useEffect(() => {
    const row = detail.data?.location;
    if (!row) return;
    if (row.regionId && regionOptions.some((o) => o.value === row.regionId)) {
      form.setValue('regionId', row.regionId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
    if (row.countryId && countryOptions.some((o) => o.value === row.countryId)) {
      form.setValue('countryId', row.countryId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [regionOptions, countryOptions, detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: LocationForm) {
    try {
      const input = {
        name: values.name,
        regionId: optional(values.regionId),
        countryId: optional(values.countryId),
        latitude: values.latitude ? Number(values.latitude) : undefined,
        longitude: values.longitude ? Number(values.longitude) : undefined,
        type: optional(values.type),
        reason: values.reason,
      };
      if (isEdit) {
        await locationApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The location is back in draft pending review.' });
      } else {
        await locationApi.create(input);
        toast({ variant: 'success', title: 'Location created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      navigate('/app/locations');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create location',
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
          <p className="text-sm font-medium text-ink">Could not load this location</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/locations" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to locations
          </Link>
        </CardContent>
      </Card>
    );
  }

  const locationName = detail.data?.location?.name;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="location-name" label="Name" required error={form.formState.errors.name?.message}>
              <Input
                id="location-name"
                placeholder="e.g. Jebel Ali Free Zone"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register('name')}
              />
            </Field>
            <Field
              id="location-type"
              label="Type"
              hint="e.g. Port, Industrial zone, Office"
              error={form.formState.errors.type?.message}
            >
              <Input
                id="location-type"
                placeholder="e.g. Industrial zone"
                aria-invalid={Boolean(form.formState.errors.type)}
                {...form.register('type')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="location-region"
              label="Region"
              hint="Preferred – the region carries its country."
              error={form.formState.errors.regionId?.message}
            >
              <Select
                id="location-region"
                aria-invalid={Boolean(form.formState.errors.regionId)}
                {...form.register('regionId')}
              >
                <option value="">No region</option>
                {regionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              id="location-country"
              label="Country"
              hint="Used when the location is not inside a region."
              error={form.formState.errors.countryId?.message}
            >
              <Select
                id="location-country"
                aria-invalid={Boolean(form.formState.errors.countryId)}
                {...form.register('countryId')}
              >
                <option value="">No country</option>
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="location-latitude"
              label="Latitude"
              hint="Decimal degrees, e.g. 25.2048"
              error={form.formState.errors.latitude?.message}
            >
              <Input
                id="location-latitude"
                placeholder="25.2048"
                inputMode="decimal"
                aria-invalid={Boolean(form.formState.errors.latitude)}
                {...form.register('latitude')}
              />
            </Field>
            <Field
              id="location-longitude"
              label="Longitude"
              hint="Decimal degrees, e.g. 55.2708"
              error={form.formState.errors.longitude?.message}
            >
              <Input
                id="location-longitude"
                placeholder="55.2708"
                inputMode="decimal"
                aria-invalid={Boolean(form.formState.errors.longitude)}
                {...form.register('longitude')}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change reason</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            id="location-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="location-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the coordinates' : 'e.g. Drafting the location for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/locations')}>
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
        title={isEdit ? `Edit ${locationName ?? 'location'}` : 'New location'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a location draft for review. Facilities hang off it in the registry.'
        }
      />
      <BackLink to="/app/locations">Back to locations</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Location editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: <GeographicWorkflowTab route="locations" id={id as string} label="Location" />,
            },
          ]}
        />
      ) : (
        detailsForm
      )}
    </>
  );
}
