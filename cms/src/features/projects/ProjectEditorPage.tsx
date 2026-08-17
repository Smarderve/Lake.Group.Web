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
import { locationApi } from '../geography/api';
import { GeographicWorkflowTab } from '../geography/GeographicWorkflowTab';
import { projectApi } from './api';

/** Mirrors backend projectCreateSchema (validators/cms.js). */
const projectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  companyId: z.string().optional(),
  locationId: z.string().optional(),
  sector: z.string().max(120, 'Keep the sector under 120 characters').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().max(4000, 'Keep the description under 4000 characters').optional(),
  impact: z.string().max(4000, 'Keep the impact under 4000 characters').optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type ProjectForm = z.infer<typeof projectSchema>;

const empty: ProjectForm = {
  title: '',
  companyId: '',
  locationId: '',
  sector: '',
  startDate: '',
  endDate: '',
  description: '',
  impact: '',
  reason: '',
};

/** Optional select/date → undefined so the backend refs stay clean ('' is invalid). */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Project editor (Phase 14) – create (/app/projects/new) and edit
 * (/app/projects/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (form) / Workflow (status + actions + version
 * history). Companies and locations resolve from the registry.
 */
export function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-projects', id],
    queryFn: () => projectApi.get(id as string),
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

  const form = useForm<ProjectForm>({ resolver: zodResolver(projectSchema), defaultValues: empty });

  useEffect(() => {
    const row = detail.data?.project;
    if (!row) return;
    form.reset({
      title: row.title ?? '',
      companyId: row.companyId ?? '',
      locationId: row.locationId ?? '',
      sector: row.sector ?? '',
      startDate: row.startDate ? row.startDate.slice(0, 10) : '',
      endDate: row.endDate ? row.endDate.slice(0, 10) : '',
      description: row.description ?? '',
      impact: row.impact ?? '',
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
  // Re-apply the stored refs once the option lists are populated so the
  // selects display the saved company/location. Values pointing at archived
  // records are left alone (the option cannot render, but the saved
  // reference is preserved on submit).
  useEffect(() => {
    const row = detail.data?.project;
    if (!row) return;
    if (row.companyId && companyOptions.some((o) => o.value === row.companyId)) {
      form.setValue('companyId', row.companyId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
    if (row.locationId && locationOptions.some((o) => o.value === row.locationId)) {
      form.setValue('locationId', row.locationId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [companyOptions, locationOptions, detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: ProjectForm) {
    try {
      const input = {
        title: values.title,
        companyId: optional(values.companyId),
        locationId: optional(values.locationId),
        sector: optional(values.sector),
        startDate: optional(values.startDate),
        endDate: optional(values.endDate),
        description: optional(values.description),
        impact: optional(values.impact),
        reason: values.reason,
      };
      if (isEdit) {
        await projectApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The project is back in draft pending review.' });
      } else {
        await projectApi.create(input);
        toast({ variant: 'success', title: 'Project created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      navigate('/app/projects');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create project',
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
          <p className="text-sm font-medium text-ink">Could not load this project</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/projects" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to projects
          </Link>
        </CardContent>
      </Card>
    );
  }

  const projectTitle = detail.data?.project?.title;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="project-title" label="Title" required error={form.formState.errors.title?.message}>
              <Input
                id="project-title"
                placeholder="e.g. Expansion of Jebel Ali Port"
                aria-invalid={Boolean(form.formState.errors.title)}
                {...form.register('title')}
              />
            </Field>
            <Field
              id="project-sector"
              label="Sector"
              hint="e.g. Energy, Infrastructure, Maritime"
              error={form.formState.errors.sector?.message}
            >
              <Input
                id="project-sector"
                placeholder="e.g. Infrastructure"
                aria-invalid={Boolean(form.formState.errors.sector)}
                {...form.register('sector')}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="project-company" label="Company" error={form.formState.errors.companyId?.message}>
              <Select
                id="project-company"
                aria-invalid={Boolean(form.formState.errors.companyId)}
                {...form.register('companyId')}
              >
                <option value="">No company</option>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="project-location" label="Location" error={form.formState.errors.locationId?.message}>
              <Select
                id="project-location"
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
            <Field id="project-start" label="Start date" error={form.formState.errors.startDate?.message}>
              <Input
                id="project-start"
                type="date"
                aria-invalid={Boolean(form.formState.errors.startDate)}
                {...form.register('startDate')}
              />
            </Field>
            <Field id="project-end" label="End date" error={form.formState.errors.endDate?.message}>
              <Input
                id="project-end"
                type="date"
                aria-invalid={Boolean(form.formState.errors.endDate)}
                {...form.register('endDate')}
              />
            </Field>
          </div>
          <Field
            id="project-description"
            label="Description"
            hint="What this project delivers. Shown on the public website."
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="project-description"
              rows={5}
              placeholder="e.g. A phased expansion adding two deep-water berths…"
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </Field>
          <Field
            id="project-impact"
            label="Impact"
            hint="What changed for the community or the business. Shown on the public website."
            error={form.formState.errors.impact?.message}
          >
            <Textarea
              id="project-impact"
              rows={4}
              placeholder="e.g. Created 1,200 jobs during construction…"
              aria-invalid={Boolean(form.formState.errors.impact)}
              {...form.register('impact')}
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
            id="project-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="project-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the end date' : 'e.g. Drafting the project for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/projects')}>
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
        title={isEdit ? `Edit ${projectTitle ?? 'project'}` : 'New project'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a project draft for review. Companies and locations resolve from the registry.'
        }
      />
      <BackLink to="/app/projects">Back to projects</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Project editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: <GeographicWorkflowTab route="projects" id={id as string} label="Project" />,
            },
          ]}
        />
      ) : (
        detailsForm
      )}
    </>
  );
}
