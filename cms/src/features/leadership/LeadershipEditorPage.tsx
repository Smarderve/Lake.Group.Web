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
import { leadershipApi } from './api';
import { LeadershipTimelineTab } from './LeadershipTimelineTab';
import { LeadershipWorkflowTab } from './LeadershipWorkflowTab';

/** Mirrors backend leadershipCreateSchema/leadershipUpdateSchema (validators/cms.js). */
const leadershipSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
  bio: z.string().max(4000, 'Keep the bio under 4000 characters').optional(),
  photo: z.string().max(500, 'Keep the photo URL under 500 characters').optional(),
  photoMediaId: z.string().optional(),
  order: z.string().optional(),
  companyId: z.string().optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type LeadershipForm = z.infer<typeof leadershipSchema>;

const empty: LeadershipForm = {
  name: '',
  position: '',
  bio: '',
  photo: '',
  photoMediaId: '',
  order: '',
  companyId: '',
  reason: '',
};

/** Optional select → undefined so the backend refs stay clean ('' is invalid). */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Leadership editor (spec §12) – create (/app/leadership/new) and edit
 * (/app/leadership/:id/edit) against the real governed endpoint. Editing is a
 * tabbed editor: Details (profile form + photo) / Timeline (appointment
 * history – child events) / Workflow (status + actions + version history).
 * Every save sends a `reason`; photoMediaId links to the media library
 * (usage tracked server-side).
 */
export function LeadershipEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-leadership', id],
    queryFn: () => leadershipApi.get(id as string),
    enabled: isEdit,
  });

  // Option lists for the pickers – same governed endpoints the site uses.
  const companies = useQuery({
    queryKey: ['admin-companies'],
    queryFn: leadershipApi.companies,
    select: (data) => data.companies ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const media = useQuery({
    queryKey: ['admin-media'],
    queryFn: leadershipApi.media,
    select: (data) => data.media ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<LeadershipForm>({
    resolver: zodResolver(leadershipSchema),
    defaultValues: empty,
  });

  // Load the record into the form when editing.
  useEffect(() => {
    const row = detail.data?.leadership;
    if (!row) return;
    form.reset({
      name: row.name ?? '',
      position: row.position ?? '',
      bio: row.bio ?? '',
      photo: row.photo ?? '',
      photoMediaId: row.photoMediaId ?? '',
      order: row.order != null ? String(row.order) : '',
      companyId: row.companyId ?? '',
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
  const mediaOptions = useMemo(
    () =>
      (media.data ?? []).map((m) => ({
        value: m.id,
        label: `${m.altText || m.caption || m.url}${m.status === 'PUBLISHED' ? '' : ` (${m.status.replace('_', ' ')})`}`,
      })),
    [media.data],
  );

  // Photo preview – prefers the typed URL, falls back to the selected media item.
  const photoUrl = form.watch('photo');
  const photoMediaId = form.watch('photoMediaId');
  const photoPreview = useMemo(() => {
    if (photoUrl && photoUrl.trim()) return photoUrl.trim();
    const row = (media.data ?? []).find((m) => m.id === photoMediaId);
    return row ? (row.variants?.thumb ?? row.url) : null;
  }, [photoUrl, photoMediaId, media.data]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: LeadershipForm) {
    try {
      const input = {
        name: values.name,
        position: values.position,
        bio: optional(values.bio),
        photo: optional(values.photo),
        photoMediaId: optional(values.photoMediaId) ?? null,
        order: values.order ? Number(values.order) : undefined,
        companyId: optional(values.companyId),
        reason: values.reason,
      };
      if (isEdit) {
        await leadershipApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The profile is back in draft pending review.' });
      } else {
        await leadershipApi.create(input);
        toast({ variant: 'success', title: 'Leader created', description: 'It is saved as a draft.' });
      }
      // The list query (shared with the editor option lists) would otherwise
      // serve its pre-save snapshot on the way back.
      void queryClient.invalidateQueries({ queryKey: ['admin-leadership'] });
      navigate('/app/leadership');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create leader',
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
          <p className="text-sm font-medium text-ink">Could not load this leader</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/leadership" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to leadership
          </Link>
        </CardContent>
      </Card>
    );
  }

  const leaderName = detail.data?.leadership?.name;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="leader-name" label="Name" required error={form.formState.errors.name?.message}>
              <Input
                id="leader-name"
                placeholder="e.g. Ally Edha Awadh"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register('name')}
              />
            </Field>
            <Field
              id="leader-position"
              label="Position"
              required
              error={form.formState.errors.position?.message}
            >
              <Input
                id="leader-position"
                placeholder="e.g. Group Managing Director"
                aria-invalid={Boolean(form.formState.errors.position)}
                {...form.register('position')}
              />
            </Field>
          </div>
          <Field
            id="leader-bio"
            label="Biography"
            hint="Profile text – shown on the leadership page. Max 4000 characters."
            error={form.formState.errors.bio?.message}
          >
            <Textarea
              id="leader-bio"
              rows={5}
              placeholder="Career background, responsibilities and achievements…"
              aria-invalid={Boolean(form.formState.errors.bio)}
              {...form.register('bio')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="leader-company" label="Company" hint="Blank for a group-level leader." error={form.formState.errors.companyId?.message}>
              <Select
                id="leader-company"
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
            <Field id="leader-order" label="Display order" hint="Lower numbers appear first." error={form.formState.errors.order?.message}>
              <Input
                id="leader-order"
                type="number"
                min={0}
                placeholder="0"
                aria-invalid={Boolean(form.formState.errors.order)}
                {...form.register('order')}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start gap-4">
            <Field
              id="leader-photo"
              label="Photo URL"
              hint="Directly hosted photo."
              error={form.formState.errors.photo?.message}
              className="min-w-0 flex-1"
            >
              <Input
                id="leader-photo"
                placeholder="https://cdn.lake-group.com/leadership/…"
                aria-invalid={Boolean(form.formState.errors.photo)}
                {...form.register('photo')}
              />
            </Field>
            {photoPreview && (
              <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-strong bg-surface-muted">
                <img
                  src={photoPreview}
                  alt="Leader photo preview"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <Field
            id="leader-photo-media"
            label="Photo media"
            hint="Optional link to the media library – usage is tracked on the media item."
            error={form.formState.errors.photoMediaId?.message}
          >
            <Select
              id="leader-photo-media"
              aria-invalid={Boolean(form.formState.errors.photoMediaId)}
              {...form.register('photoMediaId')}
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
          <CardTitle>Change reason</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            id="leader-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="leader-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the biography' : 'e.g. Drafting the leadership profile for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/leadership')}>
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
        title={isEdit ? `Edit ${leaderName ?? 'leader'}` : 'New leader'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The appointment timeline and workflow live on the other tabs.'
            : 'Create a leadership profile draft for review.'
        }
      />
      <BackLink to="/app/leadership">Back to leadership</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Leadership editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'timeline',
              label: 'Timeline',
              content: <LeadershipTimelineTab leaderId={id as string} />,
            },
            {
              value: 'workflow',
              label: 'Workflow',
              content: <LeadershipWorkflowTab leaderId={id as string} />,
            },
          ]}
        />
      ) : (
        detailsForm
      )}
    </>
  );
}
