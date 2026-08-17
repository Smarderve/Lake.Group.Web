/**
 * Contacts API service (Phase 15). Mirrors the governed router
 * (backend/src/routes/governed.js + backend/src/lib/cms-config.js) for route
 * `contacts` – nothing invented:
 *
 *   GET    /admin/contacts              – full list (all statuses)
 *   GET    /admin/contacts/:id          – detail + versions
 *   POST   /admin/contacts              – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/contacts/:id          – edit → DRAFT         (EDITOR+)
 *   POST   /admin/contacts/:id/…        – the standard governed transitions
 *
 * The Prisma delegate for model Contact is `contact` – the detail response
 * nests the record under that key. List rows nest under the route slug
 * `contacts`. Contact verification status is a plain editor field (there is
 * no separate verify endpoint in the governed router).
 */

import { api } from '../../services/api';
import { governedWorkflow } from '../../services/governed';
import type { VersionRow, WorkflowStatus } from '../../types/api';

export type ContactType = 'HR' | 'MARKETING' | 'SUPPORT' | 'CORPORATE' | 'COMPANY_SPECIFIC';
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED';

export const CONTACT_TYPES: ContactType[] = [
  'HR',
  'MARKETING',
  'SUPPORT',
  'CORPORATE',
  'COMPANY_SPECIFIC',
];

export interface ContactRow {
  id: string;
  name: string;
  type: ContactType;
  companyId: string | null;
  locationId: string | null;
  phone: string | null;
  email: string | null;
  publicDisplay: boolean;
  order: number;
  verificationStatus: VerificationStatus;
  verificationDate: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body – mirrors contactCreateSchema (validators/cms.js). */
export interface ContactInput {
  name: string;
  type: ContactType;
  companyId?: string;
  locationId?: string;
  phone?: string;
  email?: string;
  publicDisplay?: boolean;
  order?: number;
  verificationStatus?: VerificationStatus;
  verificationDate?: string;
  reason: string;
}

export const contactApi = {
  list: () => api.get<{ contacts: ContactRow[] }>('/admin/contacts'),
  get: (id: string) =>
    api.get<{ contact: ContactRow; versions: VersionRow[] }>(`/admin/contacts/${id}`),
  create: (input: ContactInput) => api.post<{ contact: ContactRow }>('/admin/contacts', input),
  update: (id: string, input: ContactInput) =>
    api.patch<{ contact: ContactRow }>(`/admin/contacts/${id}`, input),
  ...governedWorkflow<ContactRow>('contacts'),
};
