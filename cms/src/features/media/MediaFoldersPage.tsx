import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Icon } from '@iconify/react';
import folderOutline from '@iconify-icons/mdi/folder-outline';
import folderPlusOutline from '@iconify-icons/mdi/folder-plus-outline';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import { PageHeader } from '../../components/ui/PageHeader';
import { BackLink } from '../../components/ui/BackLink';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Dialog } from '../../components/ui/Dialog';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/toast';
import { apiErrorMessage } from '../../services/api';
import { formatDate } from '../../utils/format';
import { canEdit } from '../../utils/permissions';
import { useAuth } from '../auth/AuthProvider';
import { mediaApi, type MediaFolderRow } from './api';

const folderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with dashes')
    .optional()
    .or(z.literal('')),
  parentId: z.string().optional(),
  description: z.string().max(300).optional(),
});

type FolderForm = z.infer<typeof folderSchema>;

/** Folders are organizational – not governed, no workflow (spec §21). */
export function MediaFoldersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MediaFolderRow | null>(null);

  const query = useQuery({
    queryKey: ['admin-media-folders'],
    queryFn: mediaApi.folders,
    select: (data) => data.mediaFolders ?? [],
  });

  const form = useForm<FolderForm>({
    resolver: zodResolver(folderSchema),
    defaultValues: { name: '', slug: '', parentId: '', description: '' },
  });

  const folderOptions = useMemo(
    () =>
      (query.data ?? [])
        .filter((folder) => folder.id !== editing?.id) // no self-parent
        .map((folder) => ({ value: folder.id, label: folder.name })),
    [query.data, editing?.id],
  );

  function openCreate() {
    setEditing(null);
    form.reset({ name: '', slug: '', parentId: '', description: '' });
    setDialogOpen(true);
  }

  function openEdit(folder: MediaFolderRow) {
    setEditing(folder);
    form.reset({
      name: folder.name,
      slug: folder.slug,
      parentId: folder.parentId ?? '',
      description: folder.description ?? '',
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: FolderForm) {
    try {
      const parentId = values.parentId && values.parentId.trim().length > 0 ? values.parentId : undefined;
      if (editing) {
        await mediaApi.updateFolder(editing.id, {
          name: values.name,
          parentId,
          description: values.description || undefined,
        });
        toast({ variant: 'success', title: 'Folder updated' });
      } else {
        await mediaApi.createFolder({
          name: values.name,
          slug: values.slug || values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          parentId,
          description: values.description || undefined,
        });
        toast({ variant: 'success', title: 'Folder created' });
      }
      setDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-media-folders'] });
    } catch (err) {
      toast({
        variant: 'error',
        title: editing ? 'Could not update folder' : 'Could not create folder',
        description: apiErrorMessage(err),
      });
    }
  }

  const canManage = canEdit(user?.role);
  const rows = query.data ?? [];

  return (
    <>
      <PageHeader
        title="Media folders"
        description="Organize media into folders – folders are organizational and are never published."
        actions={
          canManage ? (
            <Button variant="primary" size="md" onClick={openCreate}>
              <Icon icon={folderPlusOutline} className="h-4 w-4" aria-hidden="true" />
              New folder
            </Button>
          ) : undefined
        }
      />
      <BackLink to="/app/media">Back to media library</BackLink>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : query.isError ? (
        <ErrorState title="Could not load folders" message="The folder list is unreachable right now." onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Icon icon={folderOutline} className="h-5 w-5" aria-hidden="true" />}
          title="No folders yet"
          description="Folders group media so the library stays navigable."
          action={
            canManage ? (
              <Button variant="outline" size="sm" onClick={openCreate}>
                Create the first folder
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border-strong">
              {rows.map((folder) => {
                const parent = rows.find((row) => row.id === folder.parentId);
                return (
                  <li key={folder.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
                        <Icon icon={folderOutline} className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{folder.name}</p>
                        <p className="truncate text-xs text-ink-faint">
                          /{folder.slug}
                          {parent ? ` · inside ${parent.name}` : ''} · created {formatDate(folder.createdAt)}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => openEdit(folder)}
                        aria-label={`Edit ${folder.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                      >
                        <Icon icon={pencilOutline} className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Edit folder' : 'New folder'}
        description={editing ? 'Rename or move this folder.' : 'Create a folder to organize media.'}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="folder-form" loading={form.formState.isSubmitting}>
              {editing ? 'Save changes' : 'Create folder'}
            </Button>
          </>
        }
      >
        <form id="folder-form" onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field id="folder-name" label="Name" required error={form.formState.errors.name?.message}>
            <Input
              id="folder-name"
              placeholder="e.g. Announcements"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </Field>
          {!editing && (
            <Field
              id="folder-slug"
              label="Slug"
              hint="Defaults to the name if left blank. Fixed after creation."
              error={form.formState.errors.slug?.message}
            >
              <Input
                id="folder-slug"
                placeholder="announcements"
                aria-invalid={Boolean(form.formState.errors.slug)}
                {...form.register('slug')}
              />
            </Field>
          )}
          <Field id="folder-parent" label="Inside folder" error={form.formState.errors.parentId?.message}>
            <Select
              id="folder-parent"
              aria-invalid={Boolean(form.formState.errors.parentId)}
              {...form.register('parentId')}
            >
              <option value="">Top level</option>
              {folderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="folder-description" label="Description" error={form.formState.errors.description?.message}>
            <Textarea
              id="folder-description"
              rows={2}
              placeholder="What belongs in this folder?"
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
