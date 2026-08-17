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
import { WorkflowTab } from '../../components/workflow/WorkflowTab';
import { categoryApi, type CategoryRow } from './api';

/** Mirrors backend categoryCreateSchema/categoryUpdateSchema (validators/registry.js). */
const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().max(500, 'Keep the description under 500 characters').optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type CategoryForm = z.infer<typeof categorySchema>;

const empty: CategoryForm = {
  name: '',
  description: '',
  reason: '',
};

/**
 * Category editor (Phase 15 gap) – create (/app/categories/new) and edit
 * (/app/categories/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (form) / Workflow (status + actions + version
 * history). Every save sends a `reason`, exactly like the other editors.
 */
export function CategoryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-categories', id],
    queryFn: () => categoryApi.get(id as string),
    enabled: isEdit,
  });

  const form = useForm<CategoryForm>({ resolver: zodResolver(categorySchema), defaultValues: empty });

  useEffect(() => {
    const row = detail.data?.category;
    if (!row) return;
    form.reset({
      name: row.name ?? '',
      description: row.description ?? '',
      reason: '',
    });
  }, [detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: CategoryForm) {
    try {
      const input = {
        name: values.name,
        description: values.description?.trim() ? values.description : undefined,
        reason: values.reason,
      };
      if (isEdit) {
        await categoryApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The category is back in draft pending review.' });
      } else {
        await categoryApi.create(input);
        toast({ variant: 'success', title: 'Category created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      navigate('/app/categories');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create category',
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
          <p className="text-sm font-medium text-ink">Could not load this category</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/categories" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to categories
          </Link>
        </CardContent>
      </Card>
    );
  }

  const categoryName = detail.data?.category?.name;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="category-name" label="Name" required error={form.formState.errors.name?.message}>
            <Input
              id="category-name"
              placeholder="e.g. Energy"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </Field>
          <Field
            id="category-description"
            label="Description"
            hint="One or two sentences describing what this category covers."
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="category-description"
              rows={3}
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
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
            id="category-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="category-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Renaming the category' : 'e.g. Drafting the category for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/categories')}>
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
        title={isEdit ? `Edit ${categoryName ?? 'category'}` : 'New category'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a category draft for review.'
        }
      />
      <BackLink to="/app/categories">Back to categories</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Category editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: (
                <WorkflowTab
                  route="categories"
                  id={id as string}
                  label="Category"
                  entityKey="category"
                  titleField="name"
                  getDetail={(detailId) => categoryApi.get(detailId)}
                  entityApi={categoryApi}
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
export type { CategoryRow };
