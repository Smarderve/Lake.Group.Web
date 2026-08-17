/**
 * Geographic Registry API service (Phases 13-14). Mirrors the governed router
 * (backend/src/routes/governed.js + backend/src/lib/registry-config.js for
 * `countries`/`regions`/`locations`/`facilities`, cms-config.js for
 * `projects`, map-config.js for `map-categories`) – nothing invented:
 *
 *   GET    /admin/:route                 – full list (all statuses)
 *   GET    /admin/:route/:id             – detail + versions
 *   POST   /admin/:route                 – create → DRAFT       (EDITOR+)
 *   PATCH  /admin/:route/:id             – edit → DRAFT         (EDITOR+)
 *   POST   /admin/:route/:id/submit      – DRAFT → IN_REVIEW    (EDITOR+)
 *   POST   /admin/:route/:id/approve     – IN_REVIEW → APPROVED (REVIEWER+)
 *   POST   /admin/:route/:id/reject      – IN_REVIEW → DRAFT    (REVIEWER+, reason)
 *   POST   /admin/:route/:id/publish     – APPROVED → PUBLISHED (REVIEWER+)
 *   POST   /admin/:route/:id/unpublish   – PUBLISHED → DRAFT    (REVIEWER+)
 *   POST   /admin/:route/:id/archive     – → ARCHIVED           (SUPER_ADMIN)
 *
 * List endpoints nest rows under the route slug and return raw rows – names
 * of related records (country on a region, etc.) are resolved client-side
 * from the other governed lists, exactly like CompaniesPage does.
 */

import { api } from '../../services/api';
import { governedWorkflow } from '../../services/governed';
import type { VersionRow, WorkflowStatus } from '../../types/api';

export interface CountryRow {
  id: string;
  name: string;
  isoCode: string;
  regionGrouping: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RegionRow {
  id: string;
  name: string;
  countryId: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LocationRow {
  id: string;
  name: string;
  regionId: string | null;
  countryId: string | null;
  latitude: number | null;
  longitude: number | null;
  type: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityRow {
  id: string;
  name: string;
  locationId: string;
  companyId: string;
  category: string | null;
  coordinates: string | null;
  operationalStatus: string | null;
  mapCategoryId: string | null;
  mapVisible: boolean;
  markerLabel: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

/** Create/update bodies – backend validators/registry.js. */
export interface CountryInput {
  name: string;
  /** Create only – immutable after creation (countryUpdateSchema omits it). */
  isoCode?: string;
  regionGrouping?: string;
  reason: string;
}

export interface RegionInput {
  name: string;
  countryId: string;
  reason: string;
}

export interface LocationInput {
  name: string;
  /** At least one of regionId/countryId is required (backend superRefine). */
  regionId?: string;
  countryId?: string;
  latitude?: number;
  longitude?: number;
  type?: string;
  reason: string;
}

export type GeographicRoute =
  | 'countries'
  | 'regions'
  | 'locations'
  | 'facilities'
  | 'projects';

/** Detail responses key records under the singular entity name. */
export const GEOGRAPHIC_ENTITY_KEY: Record<GeographicRoute, string> = {
  countries: 'country',
  regions: 'region',
  locations: 'location',
  facilities: 'facility',
  projects: 'project',
};

/** Generic detail read (shared workflow tab + drill-down page). */
export function getGeographicDetail(route: GeographicRoute, id: string) {
  return api.get<{ versions: VersionRow[] } & Record<string, unknown>>(`/admin/${route}/${id}`);
}

export const countryApi = {
  list: () => api.get<{ countries: CountryRow[] }>('/admin/countries'),
  get: (id: string) =>
    api.get<{ country: CountryRow; versions: VersionRow[] }>(`/admin/countries/${id}`),
  create: (input: CountryInput) => api.post<{ country: CountryRow }>('/admin/countries', input),
  update: (id: string, input: CountryInput) =>
    api.patch<{ country: CountryRow }>(`/admin/countries/${id}`, input),
  ...governedWorkflow<CountryRow>('countries'),
};

export const regionApi = {
  list: () => api.get<{ regions: RegionRow[] }>('/admin/regions'),
  get: (id: string) =>
    api.get<{ region: RegionRow; versions: VersionRow[] }>(`/admin/regions/${id}`),
  create: (input: RegionInput) => api.post<{ region: RegionRow }>('/admin/regions', input),
  update: (id: string, input: RegionInput) =>
    api.patch<{ region: RegionRow }>(`/admin/regions/${id}`, input),
  ...governedWorkflow<RegionRow>('regions'),
};

export const locationApi = {
  list: () => api.get<{ locations: LocationRow[] }>('/admin/locations'),
  get: (id: string) =>
    api.get<{ location: LocationRow; versions: VersionRow[] }>(`/admin/locations/${id}`),
  create: (input: LocationInput) => api.post<{ location: LocationRow }>('/admin/locations', input),
  update: (id: string, input: LocationInput) =>
    api.patch<{ location: LocationRow }>(`/admin/locations/${id}`, input),
  ...governedWorkflow<LocationRow>('locations'),
};

export const facilityApi = {
  list: () => api.get<{ facilities: FacilityRow[] }>('/admin/facilities'),
  get: (id: string) =>
    api.get<{ facility: FacilityRow; versions: VersionRow[] }>(`/admin/facilities/${id}`),
  create: (input: FacilityInput) => api.post<{ facility: FacilityRow }>('/admin/facilities', input),
  update: (id: string, input: FacilityInput) =>
    api.patch<{ facility: FacilityRow }>(`/admin/facilities/${id}`, input),
  ...governedWorkflow<FacilityRow>('facilities'),
};

/** Facility editor input – mirrors facilityCreateSchema/facilityUpdateSchema
 *  (validators/registry.js). mapCategoryId null clears the map layer. */
export interface FacilityInput {
  name: string;
  locationId: string;
  companyId: string;
  category?: string;
  coordinates?: string;
  operationalStatus?: string;
  mapCategoryId?: string | null;
  mapVisible?: boolean;
  markerLabel?: string;
  reason: string;
}

/** Map layers for the facilities map – governed route (map-config.js). */
export interface MapCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export const mapCategoryApi = {
  list: () => api.get<{ 'map-categories': MapCategoryRow[] }>('/admin/map-categories'),
};

// Re-exported for the collection pages (they import runPerRow from './api').
export { runPerRow } from '../../services/governed';
