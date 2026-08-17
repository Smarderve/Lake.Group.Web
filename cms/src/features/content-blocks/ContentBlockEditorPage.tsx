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
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { WorkflowTab } from '../../components/workflow/WorkflowTab';
import { contentBlockApi, CONTENT_BLOCK_TYPES, type ContentBlockType } from './api';

/** Must parse to a JSON object (not an array) – mirrors z.record in the schema. */
function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Mirrors backend contentBlockCreateSchema (validators/cms.js). */
const contentBlockSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Key must be lowercase letters, numbers and dashes – e.g. about-mission'),
  type: z.enum(CONTENT_BLOCK_TYPES),
  contentJson: z.string().refine((raw) => parseJsonObject(raw) !== null, {
    message: 'Content must be valid JSON – an object such as { "body": "…" }',
  }),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type ContentBlockForm = z.infer<typeof contentBlockSchema>;

const empty: ContentBlockForm = {
  key: '',
  type: 'RICHTEXT',
  contentJson: '{\n  "body": ""\n}',
  reason: '',
};

/**
 * Content block editor (Phase 15) – create (/app/content-blocks/new) and edit
 * (/app/content-blocks/:id/edit) against the real governed endpoint. `key` is
 * the reusable identity and is immutable after creation. The block payload is
 * a structured JSON object that the public site renders by block type.
 */
export function ContentBlockEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-content-blocks', id],
    queryFn: () => contentBlockApi.get(id as string),
    enabled: isEdit,
  });

  const form = useForm<ContentBlockForm>({
    resolver: zodResolver(contentBlockSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    const row = detail.data?.contentBlock;
    if (!row) return;
    form.reset({
      key: row.key ?? '',
      type: row.type,
      contentJson: JSON.stringify(row.content ?? {}, null, 2),
      reason: '',
    });
  }, [detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: ContentBlockForm) {
    try {
      const content = parseJsonObject(values.contentJson);
      if (!content) {
        toast({ variant: 'error', title: 'Could not save', description: 'Content must be valid JSON.' });
        return;
      }
      const input = {
        // key is immutable after creation – never sent on update.
        ...(isEdit ? {} : { key: values.key }),
        type: values.type as ContentBlockType,
        content,
        reason: values.reason,
      };
      if (isEdit) {
        await contentBlockApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The block is back in draft pending review.' });
      } else {
        await contentBlockApi.create(input);
        toast({ variant: 'success', title: 'Block created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-content-blocks'] });
      navigate('/app/content-blocks');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create block',
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
          <p className="text-sm font-medium text-ink">Could not load this content block</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/content-blocks" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to content blocks
          </Link>
        </CardContent>
      </Card>
    );
  }

  const blockKey = detail.data?.contentBlock?.key;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Block</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="block-key"
              label="Key"
              required
              hint={
                isEdit
                  ? 'The key is permanent once the block is created – pages reference it.'
                  : 'The reusable identity – lowercase letters, numbers and dashes.'
              }
              error={form.formState.errors.key?.message}
            >
              <Input
                id="block-key"
                placeholder="e.g. about-mission"
                disabled={isEdit}
                aria-invalid={Boolean(form.formState.errors.key)}
                {...form.register('key')}
              />
            </Field>
            <Field id="block-type" label="Type" hint="How the public site renders this block." error={form.formState.errors.type?.message}>
              <Select
                id="block-type"
                aria-invalid={Boolean(form.formState.errors.type)}
                {...form.register('type')}
              >
                {CONTENT_BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            id="block-content"
            label="Content"
            hint="Structured JSON. The shape depends on the block type – e.g. RICHTEXT expects a body, QUOTE expects text and attribution."
            error={form.formState.errors.contentJson?.message}
          >
            <Textarea
              id="block-content"
              rows={10}
              className="font-mono text-xs leading-relaxed"
              spellCheck={false}
              placeholder='{ "body": "…" }'
              aria-invalid={Boolean(form.formState.errors.contentJson)}
              {...form.register('contentJson')}
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
            id="block-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="block-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the callout text' : 'e.g. Drafting the block for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/content-blocks')}>
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
        title={isEdit ? `Edit ${blockKey ?? 'block'}` : 'New content block'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a reusable content block draft for review.'
        }
      />
      <BackLink to="/app/content-blocks">Back to content blocks</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Content block editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: (
                <WorkflowTab
                  route="content-blocks"
                  id={id as string}
                  label="Content block"
                  entityKey="contentBlock"
                  titleField="key"
                  getDetail={(detailId) => contentBlockApi.get(detailId)}
                  entityApi={contentBlockApi}
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
