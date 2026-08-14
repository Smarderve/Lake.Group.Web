/**
 * Careers API service (Phase 15). Mirrors the governed router
 * (backend/src/routes/governed.js + backend/src/lib/cms-config.js) for route
 * `career-listings` – nothing invented:
 *
 *   GET    /admin/career-listings          – full list (all statuses)
 *   GET    /admin/career-listings/:id      – detail + versions
 *   POST   /admin/career-listings          – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/career-listings/:id      – edit → DRAFT         (EDITOR+)
 *   POST   /admin/career-listings/:id/…    – the standard governed transitions
 *
 * List endpoints nest rows under the route slug (`{ 'career-listings': [...] }`);
 * company/location names resolve client-side from the other governed lists.
 * listingStatus (OPEN/CLOSED) is orthogonal to the workflow lifecycle and
 * drives public visibility server-side (careerVisible in cms-config.js).
 */

import { api } from '../../services/api';
import { governedWorkflow } from '../../services/governed';
import type { VersionRow, WorkflowStatus } from '../../types/api';

export type ListingStatus = 'OPEN' | 'CLOSED';

export interface CareerListingRow {
  id: string;
  jobTitle: string;
  department: string | null;
  companyId: string | null;
  locationId: string | null;
  description: string | null;
  requirements: string | null;
  employmentType: string | null;
  postedDate: string | null;
  closingDate: string | null;
  listingStatus: ListingStatus;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body – mirrors careerListingCreateSchema (validators/cms.js). */
export interface CareerListingInput {
  jobTitle: string;
  department?: string;
  companyId?: string;
  locationId?: string;
  description?: string;
  requirements?: string;
  employmentType?: string;
  postedDate?: string;
  closingDate?: string;
  listingStatus?: ListingStatus;
  reason: string;
}

export const careerListingApi = {
  list: () => api.get<{ 'career-listings': CareerListingRow[] }>('/admin/career-listings'),
  get: (id: string) =>
    api.get<{ careerListing: CareerListingRow; versions: VersionRow[] }>(
      `/admin/career-listings/${id}`,
    ),
  create: (input: CareerListingInput) =>
    api.post<{ careerListing: CareerListingRow }>('/admin/career-listings', input),
  update: (id: string, input: CareerListingInput) =>
    api.patch<{ careerListing: CareerListingRow }>(`/admin/career-listings/${id}`, input),
  ...governedWorkflow<CareerListingRow>('career-listings'),
};
