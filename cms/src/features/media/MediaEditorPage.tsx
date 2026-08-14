import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
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
import { apiErrorMessage } from '../../services/api';
import { mediaApi } from './api';

/** Mirrors the backend mediaCreateSchema/mediaUpdateSchema (validators/map-media.js). */
const mediaSchema = z.object({
  url: z.string().max(500, 'Keep the URL under 500 characters'),
  altText: z.string().max(300, 'Keep the alt text under 300 characters').optional(),
  caption: z.string().max(500, 'Keep the caption under 500 characters').optional(),
  mimeType: z.string().max(100).optional(),
  sizeBytes: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  copyright: z.string().max(200).optional(),
  license: z.string().max(200).optional(),
  tags: z.string().max(300).optional(),
  variantsJson: z.string().max(1000).optional(),
  folderId: z.string().optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type MediaForm = z.infer<typeof mediaSchema>;

const empty: MediaForm = {
  url: '',
  altText: '',
  caption: '',
  mimeType: '',
  sizeBytes: '',
  width: '',
  height: '',
  copyright: '',
  license: '',
  tags: '',
  variantsJson: '',
  folderId: '',
  reason: '',
};

/** Optional string → undefined so the backend refs stay clean ('' is invalid). */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

function optionalInt(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function tagsToArray(value: string | undefined): string[] | undefined {
  const list = (value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

function variantsFromJson(value: string | undefined): Record<string, string> | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record: Record<string, string> = {};
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === 'string' && val.length > 0) record[key] = val;
      }
      return Object.keys(record).length > 0 ? record : undefined;
    }
  } catch {
    // fall through – the UI rejects malformed JSON below
  }
  return undefined;
}

/**
 * Media editor (spec §21) – create (/app/media/new) and edit
 * (/app/media/:id/edit) against the real governed endpoint.
 *
 * New media can be uploaded as validated binary content or registered from
 * an existing governed URL. Existing rows retain the metadata editor.
 */
export function MediaEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const detail = useQuery({
    queryKey: ['admin-media', id],
    queryFn: () => mediaApi.get(id as string),
    enabled: isEdit,
    select: (data) => data.media,
  });

  const folders = useQuery({
    queryKey: ['admin-media-folders'],
    queryFn: mediaApi.folders,
    select: (data) => data.mediaFolders ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<MediaForm>({ resolver: zodResolver(mediaSchema), defaultValues: empty });

  useEffect(() => {
    const row = detail.data;
    if (!row) return;
    form.reset({
      url: row.url ?? '',
      altText: row.altText ?? '',
      caption: row.caption ?? '',
      mimeType: row.mimeType ?? '',
      sizeBytes: row.sizeBytes != null ? String(row.sizeBytes) : '',
      width: row.width != null ? String(row.width) : '',
      height: row.height != null ? String(row.height) : '',
      copyright: row.copyright ?? '',
      license: row.license ?? '',
      tags: (row.tags ?? []).join(', '),
      variantsJson: row.variants ? JSON.stringify(row.variants, null, 2) : '',
      folderId: row.folderId ?? '',
      reason: '',
    });
  }, [detail.data, form]);

  const folderOptions = useMemo(
    () => (folders.data ?? []).map((folder) => ({ value: folder.id, label: folder.name })),
    [folders.data],
  );

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: MediaForm) {
    try {
      if (!isEdit && selectedFile) {
        setIsUploading(true);
        setUploadProgress(0);
        await mediaApi.upload({
          file: selectedFile,
          altText: optional(values.altText),
          caption: optional(values.caption),
          copyright: optional(values.copyright),
          license: optional(values.license),
          tags: tagsToArray(values.tags),
          folderId: optional(values.folderId),
          reason: values.reason,
        }, setUploadProgress);
        toast({ variant: 'success', title: 'Media uploaded', description: 'The file is stored securely as a draft.' });
        navigate('/app/media');
        return;
      }
      if (!values.url.trim()) {
        form.setError('url', { type: 'manual', message: 'Enter a URL or choose a file to upload' });
        return;
      }
      const variantsJson = values.variantsJson ?? '';
      const variants = variantsFromJson(variantsJson);
      if (variantsJson.trim() && !variants) {
        toast({
          variant: 'error',
          title: 'Variants are not valid JSON',
          description: 'Use the shape { "thumb": "…", "original": "…" } – each value a URL.',
        });
        return;
      }
      const input = {
        url: values.url,
        altText: optional(values.altText),
        caption: optional(values.caption),
        mimeType: optional(values.mimeType),
        sizeBytes: optionalInt(values.sizeBytes),
        width: optionalInt(values.width),
        height: optionalInt(values.height),
        copyright: optional(values.copyright),
        license: optional(values.license),
        tags: tagsToArray(values.tags),
        variants,
        folderId: optional(values.folderId),
        reason: values.reason,
      };
      if (isEdit) {
        await mediaApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The media item is back in draft pending review.' });
      } else {
        await mediaApi.create(input);
        toast({ variant: 'success', title: 'Media added', description: 'It is saved as a draft.' });
      }
      navigate('/app/media');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not add media',
        description: apiErrorMessage(err),
      });
    } finally {
      setIsUploading(false);
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
          <p className="text-sm font-medium text-ink">Could not load this media item</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/media" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to media library
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit media item' : 'Add media'}
        description={isEdit ? 'Changes save as a draft and reopen the workflow.' : 'Upload a file or register an existing asset for review.'}
      />
      <BackLink to="/app/media">Back to media library</BackLink>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEdit && (
              <>
                <Field
                  id="media-file"
                  label="Upload file"
                  hint="JPEG, PNG, WebP, GIF, or PDF. Maximum 10 MB."
                >
                  <input
                    id="media-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    aria-describedby="media-file-hint"
                    className="block w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file && file.size > 10 * 1024 * 1024) {
                        event.target.value = '';
                        setSelectedFile(null);
                        toast({ variant: 'error', title: 'File is too large', description: 'Choose a file no larger than 10 MB.' });
                        return;
                      }
                      setSelectedFile(file);
                      setUploadProgress(null);
                    }}
                  />
                </Field>
                {selectedFile && (
                  <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm" aria-live="polite">
                    <p className="font-medium text-ink">{selectedFile.name}</p>
                    <p className="text-ink-muted">{Math.max(1, Math.ceil(selectedFile.size / 1024))} KB selected</p>
                    {uploadProgress != null && (
                      <div className="mt-2">
                        <progress className="h-2 w-full" max={100} value={uploadProgress} aria-label="Upload progress" />
                        <p className="text-xs text-ink-muted">{uploadProgress}% uploaded</p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-center text-xs font-medium uppercase tracking-wide text-ink-faint">or use an existing URL</p>
              </>
            )}
            <Field
              id="media-url"
              label="URL"
              required={isEdit}
              hint={isEdit ? 'Web address of the file.' : 'Optional when uploading a file.'}
              error={form.formState.errors.url?.message}
            >
              <Input
                id="media-url"
                placeholder="https://cdn.lake-group.com/assets/…"
                aria-invalid={Boolean(form.formState.errors.url)}
                {...form.register('url')}
              />
            </Field>
            <Field id="media-alt" label="Alt text" hint="Describes the image for screen readers and SEO." error={form.formState.errors.altText?.message}>
              <Input
                id="media-alt"
                placeholder="e.g. Lake Oil service station in Dar es Salaam"
                aria-invalid={Boolean(form.formState.errors.altText)}
                {...form.register('altText')}
              />
            </Field>
            <Field id="media-caption" label="Caption" error={form.formState.errors.caption?.message}>
              <Textarea
                id="media-caption"
                rows={2}
                placeholder="Shown under the asset on the site…"
                aria-invalid={Boolean(form.formState.errors.caption)}
                {...form.register('caption')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>File details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="media-mime" label="MIME type" hint="e.g. image/png, application/pdf" error={form.formState.errors.mimeType?.message}>
              <Input
                id="media-mime"
                placeholder="image/png"
                aria-invalid={Boolean(form.formState.errors.mimeType)}
                {...form.register('mimeType')}
              />
            </Field>
            <Field id="media-size" label="File size (bytes)" error={form.formState.errors.sizeBytes?.message}>
              <Input
                id="media-size"
                type="number"
                min={0}
                placeholder="245760"
                aria-invalid={Boolean(form.formState.errors.sizeBytes)}
                {...form.register('sizeBytes')}
              />
            </Field>
            <Field id="media-width" label="Width (px)" error={form.formState.errors.width?.message}>
              <Input
                id="media-width"
                type="number"
                min={1}
                placeholder="1920"
                aria-invalid={Boolean(form.formState.errors.width)}
                {...form.register('width')}
              />
            </Field>
            <Field id="media-height" label="Height (px)" error={form.formState.errors.height?.message}>
              <Input
                id="media-height"
                type="number"
                min={1}
                placeholder="1080"
                aria-invalid={Boolean(form.formState.errors.height)}
                {...form.register('height')}
              />
            </Field>
            <Field id="media-folder" label="Folder" error={form.formState.errors.folderId?.message}>
              <Select
                id="media-folder"
                aria-invalid={Boolean(form.formState.errors.folderId)}
                {...form.register('folderId')}
              >
                <option value="">No folder</option>
                {folderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="media-tags" label="Tags" hint="Comma-separated." error={form.formState.errors.tags?.message}>
              <Input
                id="media-tags"
                placeholder="dar es salaam, fuel, retail"
                aria-invalid={Boolean(form.formState.errors.tags)}
                {...form.register('tags')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rights &amp; variants</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="media-copyright" label="Copyright" error={form.formState.errors.copyright?.message}>
              <Input
                id="media-copyright"
                placeholder="© Lake Group"
                aria-invalid={Boolean(form.formState.errors.copyright)}
                {...form.register('copyright')}
              />
            </Field>
            <Field id="media-license" label="License" error={form.formState.errors.license?.message}>
              <Input
                id="media-license"
                placeholder="CC BY 4.0"
                aria-invalid={Boolean(form.formState.errors.license)}
                {...form.register('license')}
              />
            </Field>
            <Field
              id="media-variants"
              label="Variants"
              hint='JSON of named URLs, e.g. { "thumb": "…", "original": "…" }'
              error={form.formState.errors.variantsJson?.message}
              className="sm:col-span-2"
            >
              <Textarea
                id="media-variants"
                rows={4}
                placeholder={'{\n  "thumb": "https://…/thumb.jpg",\n  "original": "https://…/full.jpg"\n}'}
                aria-invalid={Boolean(form.formState.errors.variantsJson)}
                {...form.register('variantsJson')}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change reason</CardTitle>
          </CardHeader>
          <CardContent>
            <Field id="media-reason" label="Why is this changing?" required hint="Saved to the version history for the audit trail." error={form.formState.errors.reason?.message}>
              <Textarea
                id="media-reason"
                rows={2}
                placeholder={isEdit ? 'e.g. Replaced with the corrected asset URL' : 'e.g. Adding the new announcement banner'}
                aria-invalid={Boolean(form.formState.errors.reason)}
                {...form.register('reason')}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/app/media')}>
            Cancel
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting || isUploading}>
            {isEdit ? 'Save changes' : selectedFile ? 'Upload media' : 'Add media'}
          </Button>
        </div>
      </form>
    </>
  );
}
