import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '../auth/AuthProvider';
import { BackLink } from '../../components/ui/BackLink';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/toast';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { apiErrorMessage } from '../../services/api';
import { isSuperAdmin } from '../../utils/permissions';
import { newsApi } from './api';

/** Mirrors the backend newsCreateSchema/newsUpdateSchema (validators/cms.js). */
const newsSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with dashes (e.g. annual-report-2025)'),
  body: z.string().min(1, 'Body is required'),
  categoryId: z.string().optional(),
  relatedCompanyId: z.string().optional(),
  relatedProjectId: z.string().optional(),
  authorId: z.string().optional(),
  publicationDate: z.string().optional(),
  metaTitle: z.string().max(160, 'Keep the meta title under 160 characters').optional(),
  metaDescription: z.string().max(320, 'Keep the meta description under 320 characters').optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type NewsForm = z.infer<typeof newsSchema>;

const empty: NewsForm = {
  title: '',
  slug: '',
  body: '',
  categoryId: '',
  relatedCompanyId: '',
  relatedProjectId: '',
  authorId: '',
  publicationDate: '',
  metaTitle: '',
  metaDescription: '',
  reason: '',
};

/** Optional select → undefined so the backend refs stay clean ('' is invalid). */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * News editor (spec §13) – create (/app/news/new) and edit
 * (/app/news/:id/edit) against the real governed endpoint. Every save sends
 * a `reason`; the backend keeps the version history and reopens the workflow
 * to DRAFT on edit. slug is create-only (backend newsUpdateSchema omits it).
 */
export function NewsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const detail = useQuery({
    queryKey: ['admin-news', id],
    queryFn: () => newsApi.get(id as string),
    enabled: isEdit,
    select: (data) => data.news,
  });

  // Option lists for the pickers – same governed endpoints the site uses.
  const categories = useQuery({
    queryKey: ['admin-categories'],
    queryFn: newsApi.categories,
    select: (data) => data.categories ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const companies = useQuery({
    queryKey: ['admin-companies-options'],
    queryFn: newsApi.companies,
    select: (data) => data.companies ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const projects = useQuery({
    queryKey: ['admin-projects-options'],
    queryFn: newsApi.projects,
    select: (data) => data.projects ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const users = useQuery({
    queryKey: ['admin-users-options'],
    queryFn: newsApi.users,
    select: (data) => data.users ?? [],
    enabled: isSuperAdmin(user?.role),
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<NewsForm>({ resolver: zodResolver(newsSchema), defaultValues: empty });
  // Warn before leaving with unsaved edits; failed saves never clear the form.
  useUnsavedChanges(form.formState.isDirty);

  // Load the record into the form when editing.
  useEffect(() => {
    const row = detail.data;
    if (!row) return;
    form.reset({
      title: row.title ?? '',
      slug: row.slug ?? '',
      body: row.body ?? '',
      categoryId: row.categoryId ?? '',
      relatedCompanyId: row.relatedCompanyId ?? '',
      relatedProjectId: row.relatedProjectId ?? '',
      authorId: row.authorId ?? '',
      publicationDate: row.publicationDate ? row.publicationDate.slice(0, 10) : '',
      metaTitle: row.metaTitle ?? '',
      metaDescription: row.metaDescription ?? '',
      reason: '',
    });
  }, [detail.data, form]);

  const categoryOptions = useMemo(
    () => (categories.data ?? []).map((c) => ({ value: c.id, label: String(c.name ?? c.id) })),
    [categories.data],
  );
  const companyOptions = useMemo(
    () => (companies.data ?? []).map((c) => ({ value: c.id, label: String(c.name ?? c.id) })),
    [companies.data],
  );
  const projectOptions = useMemo(
    () => (projects.data ?? []).map((p) => ({ value: p.id, label: String(p.title ?? p.id) })),
    [projects.data],
  );
  const authorOptions = useMemo(
    () => (users.data ?? []).map((u) => ({ value: u.id, label: u.name ? `${u.name} (${u.email})` : u.email })),
    [users.data],
  );

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: NewsForm) {
    try {
      const input = {
        title: values.title,
        body: values.body,
        categoryId: optional(values.categoryId),
        relatedCompanyId: optional(values.relatedCompanyId),
        relatedProjectId: optional(values.relatedProjectId),
        authorId: optional(values.authorId),
        publicationDate: values.publicationDate
          ? new Date(`${values.publicationDate}T00:00:00Z`).toISOString()
          : undefined,
        metaTitle: optional(values.metaTitle),
        metaDescription: optional(values.metaDescription),
        reason: values.reason,
      };
      if (isEdit) {
        await newsApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The article is back in draft pending review.' });
      } else {
        await newsApi.create({ ...input, slug: values.slug });
        toast({ variant: 'success', title: 'Article created', description: 'It is saved as a draft.' });
      }
      navigate('/app/news');
    } catch (err) {
      toast({ variant: 'error', title: isEdit ? 'Could not save changes' : 'Could not create article', description: apiErrorMessage(err) });
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
          <p className="text-sm font-medium text-ink">Could not load this article</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/news" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to news
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit article' : 'New article'}
        description={isEdit ? 'Changes save as a draft and reopen the workflow.' : 'Create a draft news article for review.'}
      />
      <BackLink to="/app/news">Back to news</BackLink>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field id="news-title" label="Title" required error={form.formState.errors.title?.message}>
              <Input
                id="news-title"
                placeholder="e.g. Lake Group opens a new terminal in Dar es Salaam"
                aria-invalid={Boolean(form.formState.errors.title)}
                {...form.register('title')}
              />
            </Field>
            <Field
              id="news-slug"
              label="Slug"
              required={!isEdit}
              hint={isEdit ? 'The slug is fixed after creation.' : 'Lowercase letters, numbers and dashes.'}
              error={form.formState.errors.slug?.message}
            >
              <Input
                id="news-slug"
                placeholder="e.g. dar-terminal-opening"
                disabled={isEdit}
                aria-invalid={Boolean(form.formState.errors.slug)}
                {...form.register('slug')}
              />
            </Field>
            <Field id="news-body" label="Body" required error={form.formState.errors.body?.message}>
              <Textarea
                id="news-body"
                rows={10}
                placeholder="Write the article…"
                aria-invalid={Boolean(form.formState.errors.body)}
                {...form.register('body')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="news-category" label="Category" error={form.formState.errors.categoryId?.message}>
              <Select
                id="news-category"
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
            <Field id="news-company" label="Related company" error={form.formState.errors.relatedCompanyId?.message}>
              <Select
                id="news-company"
                aria-invalid={Boolean(form.formState.errors.relatedCompanyId)}
                {...form.register('relatedCompanyId')}
              >
                <option value="">None</option>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="news-project" label="Related project" error={form.formState.errors.relatedProjectId?.message}>
              <Select
                id="news-project"
                aria-invalid={Boolean(form.formState.errors.relatedProjectId)}
                {...form.register('relatedProjectId')}
              >
                <option value="">None</option>
                {projectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            {isSuperAdmin(user?.role) && (
              <Field id="news-author" label="Author" hint="Defaults to you when left blank." error={form.formState.errors.authorId?.message}>
                <Select
                  id="news-author"
                  aria-invalid={Boolean(form.formState.errors.authorId)}
                  {...form.register('authorId')}
                >
                  <option value="">Assign to me</option>
                  {authorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field id="news-date" label="Publication date" hint="Leave blank to publish when approved." error={form.formState.errors.publicationDate?.message}>
              <Input
                id="news-date"
                type="date"
                aria-invalid={Boolean(form.formState.errors.publicationDate)}
                {...form.register('publicationDate')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field id="news-meta-title" label="Meta title" hint="Shown in search results – max 160 characters." error={form.formState.errors.metaTitle?.message}>
              <Input
                id="news-meta-title"
                placeholder="e.g. Lake Group opens Dar es Salaam terminal"
                aria-invalid={Boolean(form.formState.errors.metaTitle)}
                {...form.register('metaTitle')}
              />
            </Field>
            <Field id="news-meta-description" label="Meta description" hint="Max 320 characters." error={form.formState.errors.metaDescription?.message}>
              <Textarea
                id="news-meta-description"
                rows={3}
                placeholder="A short summary for search results…"
                aria-invalid={Boolean(form.formState.errors.metaDescription)}
                {...form.register('metaDescription')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change reason</CardTitle>
          </CardHeader>
          <CardContent>
            <Field id="news-reason" label="Why is this changing?" required hint="Saved to the version history for the audit trail." error={form.formState.errors.reason?.message}>
              <Textarea
                id="news-reason"
                rows={2}
                placeholder={isEdit ? 'e.g. Updated the terminal capacity figures from the site team' : 'e.g. Drafting the announcement for review'}
                aria-invalid={Boolean(form.formState.errors.reason)}
                {...form.register('reason')}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/app/news')}>
            Cancel
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {isEdit ? 'Save changes' : 'Create draft'}
          </Button>
        </div>
      </form>
    </>
  );
}
