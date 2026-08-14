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
import { companyApi } from './api';
import { CompanyRelationshipsTab } from './CompanyRelationshipsTab';
import { CompanyWorkflowTab } from './CompanyWorkflowTab';

/** Mirrors backend companyCreateSchema/companyUpdateSchema (validators/registry.js). */
const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with dashes (e.g. lake-oil)'),
  description: z.string().max(2000, 'Keep the description under 2000 characters').optional(),
  website: z.string().max(300, 'Keep the website under 300 characters').optional(),
  foundedDate: z.string().optional(),
  logo: z.string().max(500, 'Keep the logo URL under 500 characters').optional(),
  logoMediaId: z.string().optional(),
  parentCompanyId: z.string().optional(),
  categoryId: z.string().optional(),
  headquartersCountryId: z.string().optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type CompanyForm = z.infer<typeof companySchema>;

const empty: CompanyForm = {
  name: '',
  slug: '',
  description: '',
  website: '',
  foundedDate: '',
  logo: '',
  logoMediaId: '',
  parentCompanyId: '',
  categoryId: '',
  headquartersCountryId: '',
  reason: '',
};

/** Optional select → undefined so the backend refs stay clean ('' is invalid). */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Company editor (spec §10) – create (/app/companies/new) and edit
 * (/app/companies/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (form) / Relationships (related entities from the
 * governed lists) / Workflow (status + actions + version history). Every save
 * sends a `reason`; slug is create-only (backend companyUpdateSchema omits it)
 * and the backend guards circular parent chains.
 */
export function CompanyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-companies', id],
    queryFn: () => companyApi.get(id as string),
    enabled: isEdit,
  });

  // Option lists for the pickers – same governed endpoints the site uses.
  const categories = useQuery({
    queryKey: ['admin-categories'],
    queryFn: companyApi.categories,
    select: (data) => data.categories ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const countries = useQuery({
    queryKey: ['admin-countries'],
    queryFn: companyApi.countries,
    select: (data) => data.countries ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const media = useQuery({
    queryKey: ['admin-media'],
    queryFn: companyApi.media,
    select: (data) => data.media ?? [],
    staleTime: 5 * 60 * 1000,
  });
  // Parent picker + subsidiaries share the canonical companies list.
  const companies = useQuery({
    queryKey: ['admin-companies'],
    queryFn: companyApi.list,
    select: (data) => data.companies,
    staleTime: 30 * 1000,
  });

  const form = useForm<CompanyForm>({ resolver: zodResolver(companySchema), defaultValues: empty });

  // Load the record into the form when editing.
  useEffect(() => {
    const row = detail.data?.company;
    if (!row) return;
    form.reset({
      name: row.name ?? '',
      slug: row.slug ?? '',
      description: row.description ?? '',
      website: row.website ?? '',
      foundedDate: row.foundedDate ? row.foundedDate.slice(0, 10) : '',
      logo: row.logo ?? '',
      logoMediaId: row.logoMediaId ?? '',
      parentCompanyId: row.parentCompanyId ?? '',
      categoryId: row.categoryId ?? '',
      headquartersCountryId: row.headquartersCountryId ?? '',
      reason: '',
    });
  }, [detail.data, form]);

  const categoryOptions = useMemo(
    () => (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categories.data],
  );
  const countryOptions = useMemo(
    () => (countries.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [countries.data],
  );
  const parentOptions = useMemo(
    () =>
      (companies.data ?? [])
        .filter((c) => c.id !== id) // a company cannot be its own parent
        .map((c) => ({ value: c.id, label: c.name })),
    [companies.data, id],
  );
  const mediaOptions = useMemo(
    () =>
      (media.data ?? []).map((m) => ({
        value: m.id,
        label: `${m.altText || m.caption || m.url}${m.status === 'PUBLISHED' ? '' : ` (${m.status.replace('_', ' ')})`}`,
      })),
    [media.data],
  );

  // Logo preview – prefers the typed URL, falls back to the selected media item.
  const logoUrl = form.watch('logo');
  const logoMediaId = form.watch('logoMediaId');
  const logoPreview = useMemo(() => {
    if (logoUrl && logoUrl.trim()) return logoUrl.trim();
    const row = (media.data ?? []).find((m) => m.id === logoMediaId);
    return row ? (row.variants?.thumb ?? row.url) : null;
  }, [logoUrl, logoMediaId, media.data]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: CompanyForm) {
    try {
      const input = {
        name: values.name,
        description: optional(values.description),
        website: optional(values.website),
        foundedDate: values.foundedDate
          ? new Date(`${values.foundedDate}T00:00:00Z`).toISOString()
          : undefined,
        logo: optional(values.logo),
        logoMediaId: optional(values.logoMediaId) ?? null,
        parentCompanyId: optional(values.parentCompanyId),
        categoryId: optional(values.categoryId),
        headquartersCountryId: optional(values.headquartersCountryId),
        reason: values.reason,
      };
      if (isEdit) {
        await companyApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The company is back in draft pending review.' });
      } else {
        await companyApi.create({ ...input, slug: values.slug });
        toast({ variant: 'success', title: 'Company created', description: 'It is saved as a draft.' });
      }
      // The list query (shared with the parent picker, 30s staleTime) would
      // otherwise serve its pre-save snapshot on the way back.
      void queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      navigate('/app/companies');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create company',
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
          <p className="text-sm font-medium text-ink">Could not load this company</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/companies" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to companies
          </Link>
        </CardContent>
      </Card>
    );
  }

  const companyName = detail.data?.company?.name;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="company-name" label="Name" required error={form.formState.errors.name?.message}>
            <Input
              id="company-name"
              placeholder="e.g. Lake Oil"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </Field>
          <Field
            id="company-slug"
            label="Slug"
            required={!isEdit}
            hint={isEdit ? 'The slug is fixed after creation.' : 'Lowercase letters, numbers and dashes.'}
            error={form.formState.errors.slug?.message}
          >
            <Input
              id="company-slug"
              placeholder="e.g. lake-oil"
              disabled={isEdit}
              aria-invalid={Boolean(form.formState.errors.slug)}
              {...form.register('slug')}
            />
          </Field>
          <Field
            id="company-description"
            label="Description"
            hint="Short company profile – shown across the site. Max 2000 characters."
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="company-description"
              rows={5}
              placeholder="What the company does, its markets, and its role in the group…"
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="company-website" label="Website" error={form.formState.errors.website?.message}>
              <Input
                id="company-website"
                placeholder="https://lakegroup.com"
                aria-invalid={Boolean(form.formState.errors.website)}
                {...form.register('website')}
              />
            </Field>
            <Field id="company-founded" label="Founded date" error={form.formState.errors.foundedDate?.message}>
              <Input
                id="company-founded"
                type="date"
                aria-invalid={Boolean(form.formState.errors.foundedDate)}
                {...form.register('foundedDate')}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start gap-4">
            <Field
              id="company-logo"
              label="Logo URL"
              hint="Directly hosted logo image."
              error={form.formState.errors.logo?.message}
              className="min-w-0 flex-1"
            >
              <Input
                id="company-logo"
                placeholder="https://cdn.lake-group.com/logos/…"
                aria-invalid={Boolean(form.formState.errors.logo)}
                {...form.register('logo')}
              />
            </Field>
            {logoPreview && (
              <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-strong bg-surface-muted">
                <img
                  src={logoPreview}
                  alt="Company logo preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <Field
            id="company-logo-media"
            label="Logo media"
            hint="Optional link to the media library – usage is tracked on the media item."
            error={form.formState.errors.logoMediaId?.message}
          >
            <Select
              id="company-logo-media"
              aria-invalid={Boolean(form.formState.errors.logoMediaId)}
              {...form.register('logoMediaId')}
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
          <CardTitle>Corporate structure</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            id="company-parent"
            label="Parent company"
            hint="Leave blank for a group-level company."
            error={form.formState.errors.parentCompanyId?.message}
          >
            <Select
              id="company-parent"
              aria-invalid={Boolean(form.formState.errors.parentCompanyId)}
              {...form.register('parentCompanyId')}
            >
              <option value="">None</option>
              {parentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="company-category" label="Category" error={form.formState.errors.categoryId?.message}>
            <Select
              id="company-category"
              aria-invalid={Boolean(form.formState.errors.categoryId)}
              {...form.register('categoryId')}
            >
              <option value="">No category</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="company-country"
            label="Headquarters country"
            error={form.formState.errors.headquartersCountryId?.message}
          >
            <Select
              id="company-country"
              aria-invalid={Boolean(form.formState.errors.headquartersCountryId)}
              {...form.register('headquartersCountryId')}
            >
              <option value="">No country</option>
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
            id="company-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="company-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the description with the new markets' : 'e.g. Drafting the company profile for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/companies')}>
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
        title={isEdit ? `Edit ${companyName ?? 'company'}` : 'New company'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. Relationships and workflow live on the other tabs.'
            : 'Create a company draft for review.'
        }
      />
      <BackLink to="/app/companies">Back to companies</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Company editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'relationships',
              label: 'Relationships',
              content: <CompanyRelationshipsTab companyId={id as string} />,
            },
            {
              value: 'workflow',
              label: 'Workflow',
              content: <CompanyWorkflowTab companyId={id as string} />,
            },
          ]}
        />
      ) : (
        detailsForm
      )}
    </>
  );
}
