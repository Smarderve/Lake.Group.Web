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
import { WorkflowTab } from '../../components/workflow/WorkflowTab';
import { contentBlockApi } from '../content-blocks/api';
import { PAGE_LAYOUT_TYPES, pageApi, type PageRow } from './api';

/** Mirrors backend pageCreateSchema/pageUpdateSchema (validators/cms.js). */
const pageSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with dashes (e.g. about-us)'),
  title: z.string().min(1, 'Title is required'),
  layoutType: z.string().max(60).optional(),
  contentBlocks: z.array(z.string().min(1)).optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(320).optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type PageForm = z.infer<typeof pageSchema>;

const empty: PageForm = {
  slug: '',
  title: '',
  layoutType: '',
  contentBlocks: [],
  metaTitle: '',
  metaDescription: '',
  reason: '',
};

/**
 * Page editor (Phase 15 gap) – create (/app/pages/new) and edit
 * (/app/pages/:id/edit) against the real governed `pages` endpoint. The page
 * is assembled from ContentBlocks (the join table), so the form offers a
 * checkbox selector of the governed content blocks. `slug` is immutable after
 * creation (backend pageUpdateSchema omits it). Editing is a tabbed editor:
 * Details (form) / Workflow (status + actions + version history).
 */
export function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-pages', id],
    queryFn: () => pageApi.get(id as string),
    enabled: isEdit,
  });
  const blocks = useQuery({
    queryKey: ['admin-content-blocks'],
    queryFn: contentBlockApi.list,
    select: (data) => data['content-blocks'],
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<PageForm>({ resolver: zodResolver(pageSchema), defaultValues: empty });

  useEffect(() => {
    const row = detail.data?.page;
    if (!row) return;
    form.reset({
      slug: row.slug ?? '',
      title: row.title ?? '',
      layoutType: row.layoutType ?? '',
      contentBlocks: row.contentBlocks ?? [],
      metaTitle: row.metaTitle ?? '',
      metaDescription: row.metaDescription ?? '',
      reason: '',
    });
  }, [detail.data, form]);

  const blockOptions = useMemo(
    () =>
      (blocks.data ?? [])
        .filter((b) => b.status !== 'ARCHIVED')
        .map((b) => ({ value: b.id, label: b.key, hint: b.type })),
    [blocks.data],
  );

  /** Include the stored layout type even when it's not one of the presets. */
  const layoutOptions = useMemo(() => {
    const stored = detail.data?.page?.layoutType;
    const presets = [...PAGE_LAYOUT_TYPES];
    if (stored && !presets.includes(stored as (typeof PAGE_LAYOUT_TYPES)[number])) {
      presets.push(stored as (typeof PAGE_LAYOUT_TYPES)[number]);
    }
    return presets;
  }, [detail.data?.page?.layoutType]);

  const selectedBlocks = form.watch('contentBlocks') ?? [];

  function toggleBlock(blockId: string, checked: boolean) {
    const next = checked
      ? [...new Set([...selectedBlocks, blockId])]
      : selectedBlocks.filter((b) => b !== blockId);
    form.setValue('contentBlocks', next, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
  }

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: PageForm) {
    try {
      const input = {
        slug: isEdit ? undefined : values.slug,
        title: values.title,
        layoutType: values.layoutType?.trim() ? values.layoutType : undefined,
        contentBlocks: values.contentBlocks && values.contentBlocks.length > 0 ? values.contentBlocks : undefined,
        metaTitle: values.metaTitle?.trim() ? values.metaTitle : undefined,
        metaDescription: values.metaDescription?.trim() ? values.metaDescription : undefined,
        reason: values.reason,
      };
      if (isEdit) {
        await pageApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The page is back in draft pending review.' });
      } else {
        await pageApi.create(input);
        toast({ variant: 'success', title: 'Page created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      navigate('/app/pages');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create page',
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
          <p className="text-sm font-medium text-ink">Could not load this page</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/pages" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to pages
          </Link>
        </CardContent>
      </Card>
    );
  }

  const pageTitle = detail.data?.page?.title;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="page-title" label="Title" required error={form.formState.errors.title?.message}>
              <Input
                id="page-title"
                placeholder="e.g. About Lake Group"
                aria-invalid={Boolean(form.formState.errors.title)}
                {...form.register('title')}
              />
            </Field>
            {isEdit ? (
              <Field id="page-slug" label="Slug" hint="Slugs are immutable once a page exists.">
                <Input id="page-slug" value={detail.data?.page?.slug ?? ''} readOnly className="bg-surface-muted" />
              </Field>
            ) : (
              <Field id="page-slug" label="Slug" required hint="Lowercase, dashes – e.g. about-us" error={form.formState.errors.slug?.message}>
                <Input
                  id="page-slug"
                  placeholder="about-us"
                  aria-invalid={Boolean(form.formState.errors.slug)}
                  {...form.register('slug')}
                />
              </Field>
            )}
          </div>
          <Field
            id="page-layout"
            label="Layout"
            hint="How the page is assembled on the public site."
            error={form.formState.errors.layoutType?.message}
          >
            <Select
              id="page-layout"
              aria-invalid={Boolean(form.formState.errors.layoutType)}
              {...form.register('layoutType')}
            >
              <option value="">Default</option>
              {layoutOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content blocks</CardTitle>
        </CardHeader>
        <CardContent>
          {blockOptions.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No content blocks available yet – create some on the Content Blocks page first.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {blockOptions.map((block) => (
                <label
                  key={block.value}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border px-3 py-2 hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-brand-600"
                    checked={selectedBlocks.includes(block.value)}
                    onChange={(event) => toggleBlock(block.value, event.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">{block.label}</span>
                    <span className="block text-xs text-ink-muted">{block.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search &amp; social</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="page-meta-title" label="Meta title" hint="Shown in search results and social shares." error={form.formState.errors.metaTitle?.message}>
            <Input
              id="page-meta-title"
              placeholder={pageTitle ?? 'Search title'}
              aria-invalid={Boolean(form.formState.errors.metaTitle)}
              {...form.register('metaTitle')}
            />
          </Field>
          <Field
            id="page-meta-description"
            label="Meta description"
            error={form.formState.errors.metaDescription?.message}
          >
            <Textarea
              id="page-meta-description"
              rows={2}
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
          <Field
            id="page-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="page-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the page copy' : 'e.g. Drafting the page for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/pages')}>
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
        title={isEdit ? `Edit ${pageTitle ?? 'page'}` : 'New page'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a page draft for review.'
        }
      />
      <BackLink to="/app/pages">Back to pages</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Page editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: (
                <WorkflowTab
                  route="pages"
                  id={id as string}
                  label="Page"
                  entityKey="page"
                  titleField="title"
                  getDetail={(detailId) => pageApi.get(detailId)}
                  entityApi={pageApi}
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

/** Keep the type import referenced for the editor's detail typing. */
export type { PageRow };
