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
import { locationApi } from '../geography/api';
import { careerListingApi, type ListingStatus } from './api';

/** Mirrors backend careerListingCreateSchema (validators/cms.js). */
const careerListingSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  department: z.string().max(120, 'Keep the department under 120 characters').optional(),
  employmentType: z.string().max(60, 'Keep the employment type under 60 characters').optional(),
  companyId: z.string().optional(),
  locationId: z.string().optional(),
  description: z.string().max(4000, 'Keep the description under 4000 characters').optional(),
  requirements: z.string().max(4000, 'Keep the requirements under 4000 characters').optional(),
  postedDate: z.string().optional(),
  closingDate: z.string().optional(),
  listingStatus: z.enum(['OPEN', 'CLOSED']).optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type CareerListingForm = z.infer<typeof careerListingSchema>;

const empty: CareerListingForm = {
  jobTitle: '',
  department: '',
  employmentType: '',
  companyId: '',
  locationId: '',
  description: '',
  requirements: '',
  postedDate: '',
  closingDate: '',
  listingStatus: 'OPEN',
  reason: '',
};

/**
 * Career listing editor (Phase 15) – create (/app/careers/new) and edit
 * (/app/careers/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (form) / Workflow (status + actions + version
 * history). Only OPEN listings are served on the public site – that is
 * enforced server-side, this screen just manages the field.
 */
export function CareerListingEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-career-listings', id],
    queryFn: () => careerListingApi.get(id as string),
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

  const form = useForm<CareerListingForm>({
    resolver: zodResolver(careerListingSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    const row = detail.data?.careerListing;
    if (!row) return;
    form.reset({
      jobTitle: row.jobTitle ?? '',
      department: row.department ?? '',
      employmentType: row.employmentType ?? '',
      companyId: row.companyId ?? '',
      locationId: row.locationId ?? '',
      description: row.description ?? '',
      requirements: row.requirements ?? '',
      postedDate: row.postedDate ? row.postedDate.slice(0, 10) : '',
      closingDate: row.closingDate ? row.closingDate.slice(0, 10) : '',
      listingStatus: row.listingStatus ?? 'OPEN',
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

  // reset() can run before the registry option lists finish loading, and an
  // uncontrolled <select> coerces a not-yet-present value to the placeholder.
  // Re-apply the stored refs once the option lists are populated (same shared
  // editor fix as the project/location/facility editors).
  useEffect(() => {
    const row = detail.data?.careerListing;
    if (!row) return;
    if (row.companyId && companyOptions.some((o) => o.value === row.companyId)) {
      form.setValue('companyId', row.companyId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
    if (row.locationId && locationOptions.some((o) => o.value === row.locationId)) {
      form.setValue('locationId', row.locationId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [companyOptions, locationOptions, detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: CareerListingForm) {
    try {
      const input = {
        jobTitle: values.jobTitle,
        department: optionalRef(values.department),
        employmentType: optionalRef(values.employmentType),
        companyId: optionalRef(values.companyId),
        locationId: optionalRef(values.locationId),
        description: optionalRef(values.description),
        requirements: optionalRef(values.requirements),
        postedDate: optionalRef(values.postedDate),
        closingDate: optionalRef(values.closingDate),
        listingStatus: (values.listingStatus ?? 'OPEN') as ListingStatus,
        reason: values.reason,
      };
      if (isEdit) {
        await careerListingApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The listing is back in draft pending review.' });
      } else {
        await careerListingApi.create(input);
        toast({ variant: 'success', title: 'Listing created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-career-listings'] });
      navigate('/app/careers');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create listing',
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
          <p className="text-sm font-medium text-ink">Could not load this listing</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/careers" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to careers
          </Link>
        </CardContent>
      </Card>
    );
  }

  const jobTitle = detail.data?.careerListing?.jobTitle;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Listing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="listing-title" label="Job title" required error={form.formState.errors.jobTitle?.message}>
              <Input
                id="listing-title"
                placeholder="e.g. Port Operations Manager"
                aria-invalid={Boolean(form.formState.errors.jobTitle)}
                {...form.register('jobTitle')}
              />
            </Field>
            <Field id="listing-department" label="Department" error={form.formState.errors.department?.message}>
              <Input
                id="listing-department"
                placeholder="e.g. Operations"
                aria-invalid={Boolean(form.formState.errors.department)}
                {...form.register('department')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="listing-company"
              label="Company"
              hint="The company this role belongs to."
              error={form.formState.errors.companyId?.message}
            >
              <Select
                id="listing-company"
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
            <Field id="listing-location" label="Location" error={form.formState.errors.locationId?.message}>
              <Select
                id="listing-location"
                aria-invalid={Boolean(form.formState.errors.locationId)}
                {...form.register('locationId')}
              >
                <option value="">No location</option>
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
              id="listing-employment"
              label="Employment type"
              hint="e.g. Full-time, Part-time, Contract"
              error={form.formState.errors.employmentType?.message}
            >
              <Input
                id="listing-employment"
                placeholder="e.g. Full-time"
                aria-invalid={Boolean(form.formState.errors.employmentType)}
                {...form.register('employmentType')}
              />
            </Field>
            <Field id="listing-status" label="Listing status" hint="Closed listings are not shown on the public site." error={form.formState.errors.listingStatus?.message}>
              <Select
                id="listing-status"
                aria-invalid={Boolean(form.formState.errors.listingStatus)}
                {...form.register('listingStatus')}
              >
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="listing-posted" label="Posted date" error={form.formState.errors.postedDate?.message}>
              <Input
                id="listing-posted"
                type="date"
                aria-invalid={Boolean(form.formState.errors.postedDate)}
                {...form.register('postedDate')}
              />
            </Field>
            <Field id="listing-closing" label="Closing date" error={form.formState.errors.closingDate?.message}>
              <Input
                id="listing-closing"
                type="date"
                aria-invalid={Boolean(form.formState.errors.closingDate)}
                {...form.register('closingDate')}
              />
            </Field>
          </div>
          <Field
            id="listing-description"
            label="Description"
            hint="What the role involves. Shown on the public careers page."
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="listing-description"
              rows={5}
              placeholder="e.g. Leads daily terminal operations and the shift management team…"
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </Field>
          <Field
            id="listing-requirements"
            label="Requirements"
            hint="Experience, skills and qualifications needed."
            error={form.formState.errors.requirements?.message}
          >
            <Textarea
              id="listing-requirements"
              rows={4}
              placeholder="e.g. 8+ years in logistics, degree in engineering…"
              aria-invalid={Boolean(form.formState.errors.requirements)}
              {...form.register('requirements')}
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
            id="listing-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="listing-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the closing date' : 'e.g. Drafting the job listing for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/careers')}>
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
        title={isEdit ? `Edit ${jobTitle ?? 'listing'}` : 'New job listing'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a job listing draft for review.'
        }
      />
      <BackLink to="/app/careers">Back to careers</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Career listing editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: (
                <WorkflowTab
                  route="career-listings"
                  id={id as string}
                  label="Career listing"
                  entityKey="careerListing"
                  titleField="jobTitle"
                  getDetail={(detailId) => careerListingApi.get(detailId)}
                  entityApi={careerListingApi}
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
