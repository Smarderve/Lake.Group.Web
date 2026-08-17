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
import { optionalRef } from '../../services/governed';
import { WorkflowTab } from '../../components/workflow/WorkflowTab';
import { companyApi } from '../companies/api';
import { locationApi } from '../geography/api';
import { contactApi, CONTACT_TYPES, type ContactType, type VerificationStatus } from './api';

/** Mirrors backend contactCreateSchema (validators/cms.js). */
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(CONTACT_TYPES),
  companyId: z.string().optional(),
  locationId: z.string().optional(),
  phone: z.string().max(60, 'Keep the phone number under 60 characters').optional(),
  email: z
    .string()
    .max(120)
    .optional()
    .refine((value) => !value || value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Enter a valid email address',
    }),
  publicDisplay: z.boolean().optional(),
  order: z.string().optional(),
  verificationStatus: z.enum(['UNVERIFIED', 'VERIFIED']).optional(),
  verificationDate: z.string().optional(),
  reason: z.string().min(1, 'Reason is required – why is this changing?'),
});

type ContactForm = z.infer<typeof contactSchema>;

const empty: ContactForm = {
  name: '',
  type: 'CORPORATE',
  companyId: '',
  locationId: '',
  phone: '',
  email: '',
  publicDisplay: true,
  order: '',
  verificationStatus: 'UNVERIFIED',
  verificationDate: '',
  reason: '',
};

/**
 * Contact editor (Phase 15) – create (/app/contacts/new) and edit
 * (/app/contacts/:id/edit) against the real governed endpoint. Verification
 * status is a plain field on the record (the governed router has no separate
 * verify endpoint). Editing is a tabbed editor: Details (form) / Workflow
 * (status + actions + version history).
 */
export function ContactEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('details');

  const detail = useQuery({
    queryKey: ['admin-contacts', id],
    queryFn: () => contactApi.get(id as string),
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

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    const row = detail.data?.contact;
    if (!row) return;
    form.reset({
      name: row.name ?? '',
      type: row.type,
      companyId: row.companyId ?? '',
      locationId: row.locationId ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      publicDisplay: row.publicDisplay,
      order: row.order ? String(row.order) : '',
      verificationStatus: row.verificationStatus,
      verificationDate: row.verificationDate ? row.verificationDate.slice(0, 10) : '',
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
  // Re-apply the stored refs once the option lists are populated (same shared
  // editor fix as the project/location/facility/career/csr editors).
  useEffect(() => {
    const row = detail.data?.contact;
    if (!row) return;
    if (row.companyId && companyOptions.some((o) => o.value === row.companyId)) {
      form.setValue('companyId', row.companyId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
    if (row.locationId && locationOptions.some((o) => o.value === row.locationId)) {
      form.setValue('locationId', row.locationId, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [companyOptions, locationOptions, detail.data, form]);

  const isBusy = isEdit ? detail.isLoading : false;

  async function onSubmit(values: ContactForm) {
    try {
      const input = {
        name: values.name,
        type: values.type as ContactType,
        companyId: optionalRef(values.companyId),
        locationId: optionalRef(values.locationId),
        phone: optionalRef(values.phone),
        email: optionalRef(values.email),
        publicDisplay: values.publicDisplay ?? true,
        order: values.order ? Number(values.order) : undefined,
        verificationStatus: (values.verificationStatus ?? 'UNVERIFIED') as VerificationStatus,
        verificationDate: optionalRef(values.verificationDate),
        reason: values.reason,
      };
      if (isEdit) {
        await contactApi.update(id as string, input);
        toast({ variant: 'success', title: 'Changes saved', description: 'The contact is back in draft pending review.' });
      } else {
        await contactApi.create(input);
        toast({ variant: 'success', title: 'Contact created', description: 'It is saved as a draft.' });
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
      navigate('/app/contacts');
    } catch (err) {
      toast({
        variant: 'error',
        title: isEdit ? 'Could not save changes' : 'Could not create contact',
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
          <p className="text-sm font-medium text-ink">Could not load this contact</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(detail.error)}</p>
          <Link to="/app/contacts" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to contacts
          </Link>
        </CardContent>
      </Card>
    );
  }

  const contactName = detail.data?.contact?.name;

  const detailsForm = (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="contact-name" label="Name" required error={form.formState.errors.name?.message}>
              <Input
                id="contact-name"
                placeholder="e.g. Amina Hassan"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register('name')}
              />
            </Field>
            <Field id="contact-type" label="Type" hint="Which audience this contact serves." error={form.formState.errors.type?.message}>
              <Select
                id="contact-type"
                aria-invalid={Boolean(form.formState.errors.type)}
                {...form.register('type')}
              >
                {CONTACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="contact-company"
              label="Company"
              hint="The company this contact belongs to."
              error={form.formState.errors.companyId?.message}
            >
              <Select
                id="contact-company"
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
            <Field id="contact-location" label="Location" error={form.formState.errors.locationId?.message}>
              <Select
                id="contact-location"
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
            <Field id="contact-phone" label="Phone" error={form.formState.errors.phone?.message}>
              <Input
                id="contact-phone"
                placeholder="e.g. +255 22 000 0000"
                aria-invalid={Boolean(form.formState.errors.phone)}
                {...form.register('phone')}
              />
            </Field>
            <Field id="contact-email" label="Email" error={form.formState.errors.email?.message}>
              <Input
                id="contact-email"
                type="email"
                placeholder="e.g. name@lakegroup.co.tz"
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register('email')}
              />
            </Field>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                id="contact-public"
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                {...form.register('publicDisplay')}
              />
              <label htmlFor="contact-public" className="text-[13px] font-medium text-ink">
                Show on the public site
              </label>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Turn this off to keep the contact internal to the CMS.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="contact-order" label="Display order" hint="Lower numbers appear first." error={form.formState.errors.order?.message}>
              <Input
                id="contact-order"
                type="number"
                placeholder="0"
                aria-invalid={Boolean(form.formState.errors.order)}
                {...form.register('order')}
              />
            </Field>
            <Field
              id="contact-verification"
              label="Verification"
              hint="Whether the contact details have been checked."
              error={form.formState.errors.verificationStatus?.message}
            >
              <Select
                id="contact-verification"
                aria-invalid={Boolean(form.formState.errors.verificationStatus)}
                {...form.register('verificationStatus')}
              >
                <option value="UNVERIFIED">Unverified</option>
                <option value="VERIFIED">Verified</option>
              </Select>
            </Field>
            <Field id="contact-verified-date" label="Verified on" error={form.formState.errors.verificationDate?.message}>
              <Input
                id="contact-verified-date"
                type="date"
                aria-invalid={Boolean(form.formState.errors.verificationDate)}
                {...form.register('verificationDate')}
              />
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
            id="contact-reason"
            label="Why is this changing?"
            required
            hint="Saved to the version history for the audit trail."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="contact-reason"
              rows={2}
              placeholder={isEdit ? 'e.g. Updated the phone number' : 'e.g. Drafting the contact for review'}
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register('reason')}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/app/contacts')}>
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
        title={isEdit ? `Edit ${contactName ?? 'contact'}` : 'New contact'}
        description={
          isEdit
            ? 'Changes save as a draft and reopen the workflow. The workflow lives on the Workflow tab.'
            : 'Create a contact draft for review.'
        }
      />
      <BackLink to="/app/contacts">Back to contacts</BackLink>

      {isEdit ? (
        <Tabs
          ariaLabel="Contact editor"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'details', label: 'Details', content: detailsForm },
            {
              value: 'workflow',
              label: 'Workflow',
              content: (
                <WorkflowTab
                  route="contacts"
                  id={id as string}
                  label="Contact"
                  entityKey="contact"
                  titleField="name"
                  getDetail={(detailId) => contactApi.get(detailId)}
                  entityApi={contactApi}
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
