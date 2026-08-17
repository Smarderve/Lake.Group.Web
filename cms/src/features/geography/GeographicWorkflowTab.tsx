import { WorkflowTab } from '../../components/workflow/WorkflowTab';
import { projectApi } from '../projects/api';
import {
  GEOGRAPHIC_ENTITY_KEY,
  getGeographicDetail,
  countryApi,
  regionApi,
  locationApi,
  facilityApi,
  type GeographicRoute,
} from './api';

/** Route-scoped workflow actions – every entity exposes the same transitions. */
const ENTITY_API: Record<
  GeographicRoute,
  {
    submit: (id: string) => Promise<unknown>;
    approve: (id: string) => Promise<unknown>;
    publish: (id: string) => Promise<unknown>;
    archive: (id: string) => Promise<unknown>;
  }
> = {
  countries: countryApi,
  regions: regionApi,
  locations: locationApi,
  facilities: facilityApi,
  projects: projectApi,
};

export interface GeographicWorkflowTabProps {
  route: GeographicRoute;
  id: string;
  /** Human label for copy, e.g. "Country". */
  label: string;
  /** Where to go after archive (defaults to the collection list). */
  onArchived?: () => void;
}

/**
 * Governed workflow tab (Phases 13-14) – shared by the country/region/location
 * editors, the facility/project editors and the country drill-down. Thin
 * delegation to the generic WorkflowTab (components/workflow) – status +
 * role-gated transitions against the real governed endpoints and the version
 * history the backend records on every transition.
 */
export function GeographicWorkflowTab({ route, id, label, onArchived }: GeographicWorkflowTabProps) {
  return (
    <WorkflowTab
      route={route}
      id={id}
      label={label}
      entityKey={GEOGRAPHIC_ENTITY_KEY[route]}
      getDetail={(detailId) => getGeographicDetail(route, detailId)}
      entityApi={ENTITY_API[route]}
      onArchived={onArchived}
    />
  );
}
