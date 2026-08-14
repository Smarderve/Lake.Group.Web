import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import briefcaseOutline from '@iconify-icons/mdi/briefcase-outline';
import emailOutline from '@iconify-icons/mdi/email-outline';
import factory from '@iconify-icons/mdi/factory';
import folderMultipleOutline from '@iconify-icons/mdi/folder-multiple-outline';
import globeModel from '@iconify-icons/mdi/globe-model';
import handshakeOutline from '@iconify-icons/mdi/handshake-outline';
import imageOutline from '@iconify-icons/mdi/image-outline';
import mapMarkerOutline from '@iconify-icons/mdi/map-marker-outline';
import mapOutline from '@iconify-icons/mdi/map-outline';
import medalOutline from '@iconify-icons/mdi/medal-outline';
import magnify from '@iconify-icons/mdi/magnify';
import newspaperVariantOutline from '@iconify-icons/mdi/newspaper-variant-outline';
import officeBuildingOutline from '@iconify-icons/mdi/office-building-outline';
import viewGridOutline from '@iconify-icons/mdi/view-grid-outline';
import type { IconifyIcon } from '@iconify/react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import type { WorkflowStatus } from '../../types/api';

/**
 * Global search (top bar). Searches across the governed content registries
 * using the same list endpoints the collection pages use — nothing invented.
 * Rows are filtered client-side exactly like CollectionPage's SearchBar, and
 * results navigate to the entity's editor (or media detail). Lists are cached
 * by react-query, so opening search after visiting a page costs nothing.
 */

interface SearchHit {
  id: string;
  label: string;
  detail: string;
  status: WorkflowStatus;
  to: string;
}

interface SearchGroup {
  key: string;
  label: string;
  icon: IconifyIcon;
  hits: SearchHit[];
}

interface SearchIndex {
  groups: SearchGroup[];
}

const MAX_PER_GROUP = 5;

async function loadIndex(): Promise<SearchIndex> {
  const [
    companies,
    news,
    leadership,
    projects,
    media,
    countries,
    regions,
    locations,
    facilities,
    careerListings,
    csrEntries,
    contacts,
    contentBlocks,
  ] = await Promise.all([
    api.get<{ companies: { id: string; name: string; slug: string; description: string | null; status: WorkflowStatus }[] }>('/admin/companies'),
    api.get<{ news: { id: string; title: string; slug: string; status: WorkflowStatus }[] }>('/admin/news'),
    api.get<{ leadership: { id: string; name: string; position: string | null; status: WorkflowStatus }[] }>('/admin/leadership'),
    api.get<{ projects: { id: string; title: string; sector: string | null; status: WorkflowStatus }[] }>('/admin/projects'),
    api.get<{ media: { id: string; url: string; altText: string | null; caption: string | null; status: WorkflowStatus }[] }>('/admin/media'),
    api.get<{ countries: { id: string; name: string; isoCode: string; status: WorkflowStatus }[] }>('/admin/countries'),
    api.get<{ regions: { id: string; name: string; status: WorkflowStatus }[] }>('/admin/regions'),
    api.get<{ locations: { id: string; name: string; type: string | null; status: WorkflowStatus }[] }>('/admin/locations'),
    api.get<{ facilities: { id: string; name: string; category: string | null; status: WorkflowStatus }[] }>('/admin/facilities'),
    api.get<{ 'career-listings': { id: string; jobTitle: string; department: string | null; listingStatus: string | null; status: WorkflowStatus }[] }>('/admin/career-listings'),
    api.get<{ 'csr-entries': { id: string; title: string; category: string | null; status: WorkflowStatus }[] }>('/admin/csr-entries'),
    api.get<{ contacts: { id: string; name: string; email: string | null; phone: string | null; status: WorkflowStatus }[] }>('/admin/contacts'),
    api.get<{ 'content-blocks': { id: string; key: string; type: string; status: WorkflowStatus }[] }>('/admin/content-blocks'),
  ]);

  const groups: SearchGroup[] = [
    {
      key: 'companies',
      label: 'Companies',
      icon: officeBuildingOutline,
      hits: companies.companies.map((row) => ({
        id: row.id,
        label: row.name,
        detail: row.slug,
        status: row.status,
        to: `/app/companies/${row.id}/edit`,
      })),
    },
    {
      key: 'news',
      label: 'News',
      icon: newspaperVariantOutline,
      hits: news.news.map((row) => ({
        id: row.id,
        label: row.title,
        detail: row.slug,
        status: row.status,
        to: `/app/news/${row.id}/edit`,
      })),
    },
    {
      key: 'leadership',
      label: 'Leadership',
      icon: medalOutline,
      hits: leadership.leadership.map((row) => ({
        id: row.id,
        label: row.name,
        detail: row.position ?? '',
        status: row.status,
        to: `/app/leadership/${row.id}/edit`,
      })),
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: folderMultipleOutline,
      hits: projects.projects.map((row) => ({
        id: row.id,
        label: row.title,
        detail: row.sector ?? '',
        status: row.status,
        to: `/app/projects/${row.id}/edit`,
      })),
    },
    {
      key: 'media',
      label: 'Media',
      icon: imageOutline,
      hits: media.media.map((row) => ({
        id: row.id,
        label: row.altText || row.url.split('/').pop() || 'Media item',
        detail: row.caption ?? row.url,
        status: row.status,
        to: `/app/media/${row.id}`,
      })),
    },
    {
      key: 'countries',
      label: 'Countries',
      icon: globeModel,
      hits: countries.countries.map((row) => ({
        id: row.id,
        label: row.name,
        detail: row.isoCode,
        status: row.status,
        to: `/app/countries/${row.id}/edit`,
      })),
    },
    {
      key: 'regions',
      label: 'Regions',
      icon: mapOutline,
      hits: regions.regions.map((row) => ({
        id: row.id,
        label: row.name,
        detail: '',
        status: row.status,
        to: `/app/regions/${row.id}/edit`,
      })),
    },
    {
      key: 'locations',
      label: 'Locations',
      icon: mapMarkerOutline,
      hits: locations.locations.map((row) => ({
        id: row.id,
        label: row.name,
        detail: row.type ?? '',
        status: row.status,
        to: `/app/locations/${row.id}/edit`,
      })),
    },
    {
      key: 'facilities',
      label: 'Facilities',
      icon: factory,
      hits: facilities.facilities.map((row) => ({
        id: row.id,
        label: row.name,
        detail: row.category ?? '',
        status: row.status,
        to: `/app/facilities/${row.id}/edit`,
      })),
    },
    {
      key: 'careers',
      label: 'Careers',
      icon: briefcaseOutline,
      hits: careerListings['career-listings'].map((row) => ({
        id: row.id,
        label: row.jobTitle,
        detail: row.department ?? row.listingStatus ?? '',
        status: row.status,
        to: `/app/careers/${row.id}/edit`,
      })),
    },
    {
      key: 'csr',
      label: 'CSR',
      icon: handshakeOutline,
      hits: csrEntries['csr-entries'].map((row) => ({
        id: row.id,
        label: row.title,
        detail: row.category ?? '',
        status: row.status,
        to: `/app/csr/${row.id}/edit`,
      })),
    },
    {
      key: 'contacts',
      label: 'Contacts',
      icon: emailOutline,
      hits: contacts.contacts.map((row) => ({
        id: row.id,
        label: row.name,
        detail: row.email ?? row.phone ?? '',
        status: row.status,
        to: `/app/contacts/${row.id}/edit`,
      })),
    },
    {
      key: 'content-blocks',
      label: 'Content Blocks',
      icon: viewGridOutline,
      hits: contentBlocks['content-blocks'].map((row) => ({
        id: row.id,
        label: row.key,
        detail: row.type,
        status: row.status,
        to: `/app/content-blocks/${row.id}/edit`,
      })),
    },
  ];

  return { groups };
}

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => (field ?? '').toLowerCase().includes(q));
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  const index = useQuery({
    queryKey: ['global-search-index'],
    queryFn: loadIndex,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // Close on outside click and Escape; focus the input when opening.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const results = useMemo(() => {
    if (!index.data) return [];
    const groups: SearchGroup[] = [];
    for (const group of index.data.groups) {
      const hits = group.hits.filter((hit) => matches(query, hit.label, hit.detail)).slice(0, MAX_PER_GROUP);
      if (hits.length > 0) groups.push({ ...group, hits });
    }
    return groups;
  }, [index.data, query]);

  const firstHit = results[0]?.hits[0];

  function go(to: string) {
    setOpen(false);
    setQuery('');
    navigate(to);
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-label="Search"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <Icon icon={magnify} className="h-4 w-4" />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Search content"
          className="cms-animate-fade absolute right-0 top-full z-40 mt-1 w-80 overflow-hidden rounded-lg border border-border bg-surface shadow-pop sm:w-96"
        >
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
              <Icon icon={magnify} className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && firstHit) {
                    event.preventDefault();
                    go(firstHit.to);
                  }
                }}
                placeholder="Search companies, news, media…"
                aria-label="Search query"
                className="h-9 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto p-1" role="listbox" aria-live="polite">
            {index.isLoading && (
              <div className="space-y-2 p-2" aria-busy="true">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}

            {index.isError && (
              <div className="p-4 text-center">
                <p className="text-sm font-medium text-ink">Search is unavailable</p>
                <p className="mt-0.5 text-xs text-ink-muted">Could not load the content lists.</p>
                <button
                  type="button"
                  onClick={() => void index.refetch()}
                  className="mt-2 text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {index.isSuccess && !query.trim() && (
              <p className="px-3 py-6 text-center text-xs text-ink-muted">
                Type to search across companies, news, media, projects and more.
              </p>
            )}

            {index.isSuccess && query.trim() && results.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-ink-muted">
                No matches for “{query.trim()}”.
              </p>
            )}

            {results.map((group) => (
              <div key={group.key} className="mb-1">
                <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                  <Icon icon={group.icon} className="h-3.5 w-3.5" aria-hidden="true" />
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.hits.map((hit) => (
                    <li key={`${group.key}-${hit.id}`}>
                      <button
                        type="button"
                        role="option"
                        onClick={() => go(hit.to)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-surface-muted"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{hit.label}</span>
                          {hit.detail && (
                            <span className="block truncate text-xs text-ink-faint">{hit.detail}</span>
                          )}
                        </span>
                        <StatusBadge status={hit.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
