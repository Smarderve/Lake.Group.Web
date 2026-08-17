import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import pencilOutline from '@iconify-icons/mdi/pencil-outline';
import { Icon } from '@iconify/react';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../../components/ui/PageHeader';
import { BackLink } from '../../components/ui/BackLink';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { relativeTime } from '../../utils/format';
import { canEdit } from '../../utils/permissions';
import { WORKFLOW_STATUSES } from '../../types/api';
import { countryApi, locationApi, regionApi, type LocationRow, type RegionRow } from './api';

/**
 * Country drill-down (spec §17) – one country with its regions and the
 * locations hanging off them, so administrators never manage the registry as
 * unrelated records. Data comes from the real governed lists; names are
 * resolved client-side exactly like the collection pages. Region rows link to
 * the region editor; location rows link to the location editor.
 */
export function CountryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const country = useQuery({
    queryKey: ['admin-countries', id],
    queryFn: () => countryApi.get(id as string),
  });
  const regions = useQuery({
    queryKey: ['admin-regions'],
    queryFn: regionApi.list,
    select: (data) => data.regions,
  });
  const locations = useQuery({
    queryKey: ['admin-locations'],
    queryFn: locationApi.list,
    select: (data) => data.locations,
  });

  const countryRegions = useMemo(
    () => (regions.data ?? []).filter((region) => region.countryId === id),
    [regions.data, id],
  );
  const countryRegionIds = useMemo(() => new Set(countryRegions.map((r) => r.id)), [countryRegions]);
  const countryLocations = useMemo(
    () =>
      (locations.data ?? []).filter(
        (location) => location.countryId === id || (location.regionId && countryRegionIds.has(location.regionId)),
      ),
    [locations.data, id, countryRegionIds],
  );

  if (country.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (country.isError || !country.data?.country) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-ink">Could not load this country</p>
          <Link to="/app/countries" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Back to countries
          </Link>
        </CardContent>
      </Card>
    );
  }

  const row = country.data.country;
  const role = user?.role;

  const regionColumns: Column<RegionRow>[] = [
    {
      key: 'name',
      header: 'Region',
      sortValue: (r) => r.name,
      cell: (r) => <span className="text-sm font-medium text-ink">{r.name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => WORKFLOW_STATUSES.indexOf(r.status),
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      align: 'right',
      sortValue: (r) => new Date(r.updatedAt).getTime(),
      cell: (r) => (
        <time dateTime={r.updatedAt} className="text-xs tabular-nums text-ink-muted">
          {relativeTime(r.updatedAt)}
        </time>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      className: 'w-16',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${r.name}`}
            onClick={() => navigate(`/app/regions/${r.id}/edit`)}
            disabled={!canEdit(role)}
          >
            <Icon icon={pencilOutline} className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  const locationColumns: Column<LocationRow>[] = [
    {
      key: 'name',
      header: 'Location',
      sortValue: (l) => l.name,
      cell: (l) => (
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{l.name}</span>
          {l.type && <p className="truncate text-xs text-ink-faint">{l.type}</p>}
        </div>
      ),
    },
    {
      key: 'region',
      header: 'Region',
      hideBelow: 'md',
      cell: (l) => {
        const region = countryRegions.find((r) => r.id === l.regionId);
        return <span className="text-sm text-ink-muted">{region?.name ?? '–'}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (l) => WORKFLOW_STATUSES.indexOf(l.status),
      cell: (l) => <StatusBadge status={l.status} />,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      align: 'right',
      sortValue: (l) => new Date(l.updatedAt).getTime(),
      cell: (l) => (
        <time dateTime={l.updatedAt} className="text-xs tabular-nums text-ink-muted">
          {relativeTime(l.updatedAt)}
        </time>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      className: 'w-16',
      cell: (l) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${l.name}`}
            onClick={() => navigate(`/app/locations/${l.id}/edit`)}
            disabled={!canEdit(role)}
          >
            <Icon icon={pencilOutline} className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={row.name}
        description="The country with its regions and locations – drill into either to manage the registry."
      />
      <BackLink to="/app/countries">Back to countries</BackLink>

      <Card>
        <CardHeader>
          <CardTitle>Country</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">ISO code</p>
            <p className="mt-1 text-sm text-ink">{row.isoCode || '–'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Region grouping</p>
            <p className="mt-1 text-sm text-ink">{row.regionGrouping || '–'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Status</p>
            <div className="mt-1">
              <StatusBadge status={row.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Regions</CardTitle>
          {canEdit(role) && (
            <Link
              to="/app/regions/new"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Add region
            </Link>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable
            rows={countryRegions}
            columns={regionColumns}
            rowKey={(r) => r.id}
            emptyTitle="No regions in this country"
            emptyDescription="Regions appear here once they're created against this country."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Locations</CardTitle>
          {canEdit(role) && (
            <Link
              to="/app/locations/new"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Add location
            </Link>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable
            rows={countryLocations}
            columns={locationColumns}
            rowKey={(l) => l.id}
            emptyTitle="No locations in this country"
            emptyDescription="Locations appear here once they're created against this country or one of its regions."
          />
        </CardContent>
      </Card>
    </>
  );
}
