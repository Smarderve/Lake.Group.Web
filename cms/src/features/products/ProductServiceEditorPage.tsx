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
import { productServiceApi } from './api';
import { ProductServiceWorkflowTab } from './ProductServiceWorkflowTab';

/** Mirrors backend productServiceCreateSchema/productServiceUpdateSchema. */
const productServiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().max(1000, 'Keep the description under 1000 characters').optional(),
  companyId: z.string().min(1, 'Company is required'),
  categoryId: z.string().optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type ProductServiceForm = z.infer<typeof productServiceSchema>;

const empty: ProductServiceForm = {
  name: '',
  description: '',
  companyId: '',
  categoryId: '',
  reason: '',
};

/** Optional select → undefined so the backend refs stay clean ('' is invalid). */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Product/Service editor (spec §12) – create (/app/products/new) and edit
 * (/app/products/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (form) / Workflow (status + actions + version
 * history). Every save sends a `reason`; the company is required (backend
 * schema), category is optional.
 */
export function ProductServiceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-product-services', id],
    queryFn: () => productServiceApi.get(id as string),
    enabled: isEdit,
  });

  // Option lists for the pickers – same governed endpoints the site uses.
  const companies = useQuery({
    queryKey: ['admin-companies'],
    queryFn: productServiceApi.companies,
    select: (data) => data.companies ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const categories = useQuery({
    queryKey: ['admin-categories'],
    queryFn: productServiceApi.categories,
    select: (data) => data.categories ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<ProductServiceForm>({
    resolver: zodResolver(productServiceSchema),
    defaultValues: empty,
  });

  // Load the record into the form when editing.
  useEffect(() => {
    const row = detail.data?.productService;
    if (!row) return;
    form.reset({
      name: row.name ?? '',
      description: row.description ?? '',
      companyId: row.companyId ?? '',
      categoryId: row.categoryId ?? '',
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
  const categoryOptions = useMemo(
    () =>
      (categories.data ?? [])
        .filter((c) => c.status !== 'ARCHIVED')
        .map((c) => ({ value: c.id, label: c.name })),
    [categories.data],
  );

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: ProductServiceForm) {
    try {
      const input = {
        name: values.name,
        description: optional(values.description),
        companyId: values.companyId,
        categoryId: optional(values.categoryId),
        reason: values.reason,
      };
      if (isEdit) {
        await productServiceApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The product is back in draft pending review.' });
      } else {
        await productServiceApi.create(input);
        toast({ variant: 'success', title: 'Product created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-product-services'] });
      navigate('/app/products');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create product',
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
          <p className="text-sm font-medium text-ink">Could not load this product</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/products" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to products
          </Link>
        </CardContent>
      </Card>
    );
  }

  const productName = detail.data?.productService?.name;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field id="product-name" label="Name" required error={form.formState.errors.name?.message}>
            <Input
              id="product-name"
              placeholder="e.g. Lake Marine Fuels"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </Field>
          <Field
            id="product-description"
            label="Description"
            hint="What this product or service is – shown across the site. Max 1000 characters."
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="product-description"
              rows={5}
              placeholder="What it is, who it is for, and how it fits the group…"
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="product-company"
              label="Company"
              required
              error={form.formState.errors.companyId?.message}
            >
              <Select
                id="product-company"
                aria-invalid={Boolean(form.formState.errors.companyId)}
                {...form.register('companyId')}
              >
                <option value="">Select a company…</option>
                {companyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="product-category" label="Category" error={form.formState.errors.categoryId?.message}>
              <Select
                id="product-category"
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change reason</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            id="product-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="product-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the description with the new offering' : 'e.g. Drafting the product for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/products')}>
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
        title={isEdit ? `Edit ${productName ?? 'product'}` : 'New product or service'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a product or service draft for review.'
        }
      />
      <BackLink to="/app/products">Back to products</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Product editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: <ProductServiceWorkflowTab productId={id as string} />,
            },
          ]}
        />
      ) : (
        detailsForm
      )}
    </>
  );
}
