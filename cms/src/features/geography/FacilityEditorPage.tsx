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
import { companyApi } from '../companies/api';
import { facilityApi, locationApi, mapCategoryApi } from './api';
import { GeographicWorkflowTab } from './GeographicWorkflowTab';

/** Mirrors backend facilityCreateSchema/facilityUpdateSchema (validators/registry.js). */
const facilitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  locationId: z.string().min(1, 'A facility must sit in a location'),
  companyId: z.string().min(1, 'A facility must belong to a company'),
  category: z.string().max(80, 'Keep the category under 80 characters').optional(),
  coordinates: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value || /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim()),
      { message: 'Coordinates must be latitude, longitude – e.g. 25.2048, 55.2708' },
    ),
  operationalStatus: z.string().max(60, 'Keep the status under 60 characters').optional(),
  mapCategoryId: z.string().optional(),
  mapVisible: z.boolean(),
  markerLabel: z.string().max(80, 'Keep the label under 80 characters').optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type FacilityForm = z.infer<typeof facilitySchema>;

const empty: FacilityForm = {
  name: '',
  locationId: '',
  companyId: '',
  category: '',
  coordinates: '',
  operationalStatus: '',
  mapCategoryId: '',
  mapVisible: false,
  markerLabel: '',
  reason: '',
};

/** Optional select/input → undefined so the backend refs stay clean. */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/** Parse a "lat,lng" coordinates string (the public site's format). */
function parseCoordinates(raw: string | undefined): { lat: number; lng: number } | null {
  if (!raw) return null;
  const [latStr, lngStr] = raw.split(',');
  const lat = Number(latStr?.trim());
  const lng = Number(lngStr?.trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Facility editor (Phase 14) – create (/app/facilities/new) and edit
 * (/app/facilities/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (form + live map preview) / Workflow (status +
 * actions + version history). Map layers come from the governed
 * map-categories route; coordinates use the public site's "lat,lng" format.
 */
export function FacilityEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-facilities', id],
    queryFn: () => facilityApi.get(id as string),
    enabled: isEdit,
  });
  const companies = useQuery({
    queryKey: ['admin-companies'],
    queryFn: companyApi.list,
    select: (data) => data.companies,
    staleTime: 5 * 60 * 1000,
  });
  const locations = useQuery({
    queryKey: ['admin-locations'],
    queryFn: locationApi.list,
    select: (data) => data.locations,
    staleTime: 5 * 60 * 1000,
  });
  const mapCategories = useQuery({
    queryKey: ['admin-map-categories'],
    queryFn: mapCategoryApi.list,
    select: (data) => data['map-categories'],
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<FacilityForm>({ resolver: zodResolver(facilitySchema), defaultValues: empty });

  useEffect(() => {
    const row = detail.data?.facility;
    if (!row) return;
    form.reset({
      name: row.name ?? '',
      locationId: row.locationId ?? '',
      companyId: row.companyId ?? '',
      category: row.category ?? '',
      coordinates: row.coordinates ?? '',
      operationalStatus: row.operationalStatus ?? '',
      mapCategoryId: row.mapCategoryId ?? '',
      mapVisible: row.mapVisible,
      markerLabel: row.markerLabel ?? '',
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
  const locationOptions = useMemo(
    () =>
      (locations.data ?? [])
        .filter((l) => l.status !== 'ARCHIVED')
        .map((l) => ({ value: l.id, label: l.name })),
    [locations.data],
  );
  const mapCategoryOptions = useMemo(
    () =>
      (mapCategories.data ?? [])
        .filter((c) => c.status !== 'ARCHIVED')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((c) => ({ value: c.id, label: c.name })),
    [mapCategories.data],
  );

  // reset() can run before the option lists finish loading, and an uncontrolled
  // <select> coerces a not-yet-present value to the placeholder. Re-apply the
  // stored refs once the option lists are populated. Values pointing at
  // archived records are left alone (the option cannot render, but the saved
  // reference is preserved on submit).
  useEffect(() => {
    const row = detail.data?.facility;
    if (!row) return;
    if (row.companyId && companyOptions.some((o) => o.value === row.companyId)) {
      form.setValue('companyId', row.companyId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
    if (row.locationId && locationOptions.some((o) => o.value === row.locationId)) {
      form.setValue('locationId', row.locationId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
    if (row.mapCategoryId && mapCategoryOptions.some((o) => o.value === row.mapCategoryId)) {
      form.setValue('mapCategoryId', row.mapCategoryId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [companyOptions, locationOptions, mapCategoryOptions, detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  const watchedCoordinates = form.watch('coordinates');
  const preview = parseCoordinates(watchedCoordinates);
  const embedUrl = preview
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${preview.lng - 0.015},${preview.lat - 0.015},${preview.lng + 0.015},${preview.lat + 0.015}&layer=mapnik&marker=${preview.lat},${preview.lng}`
    : '';
  const openUrl = preview
    ? `https://www.openstreetmap.org/?mlat=${preview.lat}&mlon=${preview.lng}#map=15/${preview.lat}/${preview.lng}`
    : '';

  async function onSubmit(values: FacilityForm) {
    try {
      const input = {
        name: values.name,
        locationId: values.locationId,
        companyId: values.companyId,
        category: optional(values.category),
        coordinates: optional(values.coordinates),
        operationalStatus: optional(values.operationalStatus),
        mapCategoryId: values.mapCategoryId ? values.mapCategoryId : null,
        mapVisible: values.mapVisible,
        markerLabel: optional(values.markerLabel),
        reason: values.reason,
      };
      if (isEdit) {
        await facilityApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The facility is back in draft pending review.' });
      } else {
        await facilityApi.create(input);
        toast({ variant: 'success', title: 'Facility created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-facilities'] });
      navigate('/app/facilities');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create facility',
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
          <p className="text-sm font-medium text-ink">Could not load this facility</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/facilities" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to facilities
          </Link>
        </CardContent>
      </Card>
    );
  }

  const facilityName = detail.data?.facility?.name;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="facility-name" label="Name" required error={form.formState.errors.name?.message}>
              <Input
                id="facility-name"
                placeholder="e.g. Jebel Ali Terminal 3"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register('name')}
              />
            </Field>
            <Field
              id="facility-category"
              label="Category"
              hint="e.g. Port, Plant, Office"
              error={form.formState.errors.category?.message}
            >
              <Input
                id="facility-category"
                placeholder="e.g. Port"
                aria-invalid={Boolean(form.formState.errors.category)}
                {...form.register('category')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="facility-company"
              label="Company"
              required
              error={form.formState.errors.companyId?.message}
            >
              <Select
                id="facility-company"
                aria-invalid={Boolean(form.formState.errors.companyId)}
                {...form.register('companyId')}
              >
                <option value="">Select a company</option>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              id="facility-location"
              label="Location"
              required
              error={form.formState.errors.locationId?.message}
            >
              <Select
                id="facility-location"
                aria-invalid={Boolean(form.formState.errors.locationId)}
                {...form.register('locationId')}
              >
                <option value="">Select a location</option>
                {locationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="facility-coordinates"
              label="Coordinates"
              hint="Latitude, longitude – e.g. 25.2048, 55.2708"
              error={form.formState.errors.coordinates?.message}
            >
              <Input
                id="facility-coordinates"
                placeholder="25.2048, 55.2708"
                aria-invalid={Boolean(form.formState.errors.coordinates)}
                {...form.register('coordinates')}
              />
            </Field>
            <Field
              id="facility-operational-status"
              label="Operational status"
              hint="e.g. Operating, Under construction"
              error={form.formState.errors.operationalStatus?.message}
            >
              <Input
                id="facility-operational-status"
                placeholder="e.g. Operating"
                aria-invalid={Boolean(form.formState.errors.operationalStatus)}
                {...form.register('operationalStatus')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="facility-map-category"
              label="Map layer"
              hint="The map category this facility appears under."
              error={form.formState.errors.mapCategoryId?.message}
            >
              <Select
                id="facility-map-category"
                aria-invalid={Boolean(form.formState.errors.mapCategoryId)}
                {...form.register('mapCategoryId')}
              >
                <option value="">No layer</option>
                {mapCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              id="facility-marker-label"
              label="Marker label"
              hint="Short text shown next to the map marker."
              error={form.formState.errors.markerLabel?.message}
            >
              <Input
                id="facility-marker-label"
                placeholder="e.g. Terminal 3"
                aria-invalid={Boolean(form.formState.errors.markerLabel)}
                {...form.register('markerLabel')}
              />
            </Field>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                id="facility-map-visible"
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                {...form.register('mapVisible')}
              />
              <label htmlFor="facility-map-visible" className="text-[13px] font-medium text-ink">
                Visible on the public map
              </label>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Hidden facilities stay in the registry but appear on no map.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Map preview</CardTitle>
        </CardHeader>
        <CardContent>
          {preview ? (
            <div className="space-y-2">
              <iframe
                title={`Map preview for ${form.getValues('name') || 'this facility'}`}
                src={embedUrl}
                className="h-64 w-full rounded-lg border border-border bg-surface"
                loading="lazy"
              />
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Open in OpenStreetMap
              </a>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              Enter coordinates as latitude, longitude (e.g. 25.2048, 55.2708) to preview the marker on the map.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change reason</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            id="facility-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="facility-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the coordinates' : 'e.g. Drafting the facility for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/facilities')}>
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
        title={isEdit ? `Edit ${facilityName ?? 'facility'}` : 'New facility'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a facility draft for review. Locations, companies and map layers resolve from the registry.'
        }
      />
      <BackLink to="/app/facilities">Back to facilities</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Facility editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: <GeographicWorkflowTab route="facilities" id={id as string} label="Facility" />,
            },
          ]}
        />
      ) : (
        detailsForm
      )}
    </>
  );
}
