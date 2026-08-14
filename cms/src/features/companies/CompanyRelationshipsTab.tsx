import type { ReactNode } from 'react';
import type { IconifyIcon } from '@iconify/react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import sourceBranch from '@iconify-icons/mdi/source-branch';
import cubeOutline from '@iconify-icons/mdi/cube-outline';
import folderMultipleOutline from '@iconify-icons/mdi/folder-multiple-outline';
import accountGroupOutline from '@iconify-icons/mdi/account-group-outline';
import emailOutline from '@iconify-icons/mdi/email-outline';
import factory from '@iconify-icons/mdi/factory';
import linkVariant from '@iconify-icons/mdi/link-variant';
import newspaperVariantOutline from '@iconify-icons/mdi/newspaper-variant-outline';
import briefcaseOutline from '@iconify-icons/mdi/briefcase-outline';
import handshakeOutline from '@iconify-icons/mdi/handshake-outline';
import officeBuildingOutline from '@iconify-icons/mdi/office-building-outline';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { apiErrorMessage } from '../../services/api';
import type { WorkflowStatus } from '../../types/api';
import {
  RELATIONSHIP_TYPE_LABELS,
  companyApi,
  type CareerListingRow,
  type CompanyListResponse,
  type CompanyRelationshipRow,
  type ContactRow,
  type CsrEntryRow,
  type FacilityRow,
  type LeadershipRow,
  type NewsRow,
  type ProductServiceRow,
  type ProjectRow,
} from './api';

/** One rendered relationship row. */
interface RelItem {
  key: string;
  primary: ReactNode;
  secondary?: ReactNode;
  status?: WorkflowStatus;
  /** When set, the row links to that record's editor (only where one exists). */
  to?: string;
}

interface RelSectionProps {
  icon: IconifyIcon;
  title: string;
  items: RelItem[];
  emptyText: string;
}

function RelSection({ icon, title, items, emptyText }: RelSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon={icon} className="h-4 w-4 text-ink-faint" aria-hidden="true" />
          {title}
        </CardTitle>
        <span className="text-xs tabular-nums text-ink-faint">{items.length}</span>
      </CardHeader>
      <CardContent className="py-2">
        {items.length === 0 ? (
          <p className="py-2 text-sm text-ink-muted">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border-strong">
            {items.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  {item.to ? (
                    <Link
                      to={item.to}
                      className="truncate text-sm font-medium text-ink hover:text-brand-700 hover:underline underline-offset-2"
                    >
                      {item.primary}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium text-ink">{item.primary}</p>
                  )}
                  {item.secondary && <p className="truncate text-xs text-ink-muted">{item.secondary}</p>}
                </div>
                {item.status && <StatusBadge status={item.status} />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Company Relationships tab (spec §10 – backend relationships only).
 *
 * Every related entity is read from the real governed list endpoints and
 * filtered client-side by the company's id (the governed router returns the
 * full table – no query params yet). Rows link through to an editor only
 * where one exists today (companies, news); the rest are reference-only
 * until their own phases land. History events are not listed: their
 * company join lives in a side table the list endpoint does not expose.
 */
export function CompanyRelationshipsTab({ companyId }: { companyId: string }) {
  const [
    companiesQ,
    productsQ,
    projectsQ,
    leadershipQ,
    contactsQ,
    facilitiesQ,
    relsQ,
    newsQ,
    careersQ,
    csrQ,
  ] = useQueries({
    queries: [
      {
        queryKey: ['admin-companies'],
        queryFn: companyApi.list,
        select: (data: CompanyListResponse) => data.companies,
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['admin-product-services'],
        queryFn: companyApi.productServices,
        select: (data: { 'product-services': ProductServiceRow[] }) => data['product-services'],
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['admin-projects'],
        queryFn: companyApi.projects,
        select: (data: { projects: ProjectRow[] }) => data.projects,
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['admin-leadership'],
        queryFn: companyApi.leadership,
        select: (data: { leadership: LeadershipRow[] }) => data.leadership,
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['admin-contacts'],
        queryFn: companyApi.contacts,
        select: (data: { contacts: ContactRow[] }) => data.contacts,
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['admin-facilities'],
        queryFn: companyApi.facilities,
        select: (data: { facilities: FacilityRow[] }) => data.facilities,
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['admin-company-relationships'],
        queryFn: companyApi.companyRelationships,
        select: (data: { 'company-relationships': CompanyRelationshipRow[] }) =>
          data['company-relationships'],
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['admin-news'],
        queryFn: companyApi.news,
        select: (data: { news: NewsRow[] }) => data.news,
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['admin-career-listings'],
        queryFn: companyApi.careerListings,
        select: (data: { 'career-listings': CareerListingRow[] }) => data['career-listings'],
        staleTime: 30 * 1000,
      },
      {
        queryKey: ['admin-csr-entries'],
        queryFn: companyApi.csrEntries,
        select: (data: { 'csr-entries': CsrEntryRow[] }) => data['csr-entries'],
        staleTime: 30 * 1000,
      },
    ],
  });

  const loading = [
    companiesQ,
    productsQ,
    projectsQ,
    leadershipQ,
    contactsQ,
    facilitiesQ,
    relsQ,
    newsQ,
    careersQ,
    csrQ,
  ].some((query) => query.isLoading);
  const failed = [
    companiesQ,
    productsQ,
    projectsQ,
    leadershipQ,
    contactsQ,
    facilitiesQ,
    relsQ,
    newsQ,
    careersQ,
    csrQ,
  ].find((query) => query.isError);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (failed) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-ink">Could not load relationships</p>
          <p className="mt-1 text-sm text-ink-muted">{apiErrorMessage(failed.error)}</p>
          <Button variant="outline" className="mt-4" onClick={() => void failed.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const companies = companiesQ.data ?? [];
  const companyName = companies.find((c) => c.id === companyId)?.name ?? 'this company';
  const nameOf = (id: string | null | undefined): string | undefined =>
    companies.find((c) => c.id === id)?.name;

  // --- Parent + subsidiaries (the Company self-relation) ---
  const row = companies.find((c) => c.id === companyId);
  const parent = row?.parentCompanyId ? companies.find((c) => c.id === row.parentCompanyId) : undefined;
  const subsidiaries = companies.filter((c) => c.parentCompanyId === companyId);

  // --- Products, projects, leadership, contacts, facilities ---
  const products = (productsQ.data ?? []).filter((p) => p.companyId === companyId);
  const projects = (projectsQ.data ?? []).filter((p) => p.companyId === companyId);
  const leadership = (leadershipQ.data ?? []).filter((l) => l.companyId === companyId);
  const contacts = (contactsQ.data ?? []).filter((c) => c.companyId === companyId);
  const facilities = (facilitiesQ.data ?? []).filter((f) => f.companyId === companyId);

  // --- Company relationships (either side) ---
  const relationships = (relsQ.data ?? []).filter(
    (r) => r.companyId === companyId || r.relatedCompanyId === companyId,
  );

  // --- News, careers, CSR ---
  const news = (newsQ.data ?? []).filter((n) => n.relatedCompanyId === companyId);
  const careers = (careersQ.data ?? []).filter((c) => c.companyId === companyId);
  const csrEntries = (csrQ.data ?? []).filter((c) => c.companyId === companyId);

  const totalRows =
    (parent ? 1 : 0) +
    subsidiaries.length +
    products.length +
    projects.length +
    leadership.length +
    contacts.length +
    facilities.length +
    relationships.length +
    news.length +
    careers.length +
    csrEntries.length;

  const sections: { icon: IconifyIcon; title: string; items: RelItem[]; emptyText: string }[] = [
    {
      icon: officeBuildingOutline,
      title: 'Parent company',
      emptyText: 'Group-level company – no parent.',
      items: parent
        ? [
            {
              key: parent.id,
              primary: parent.name,
              secondary: parent.slug,
              status: parent.status,
              to: `/app/companies/${parent.id}/edit`,
            },
          ]
        : [],
    },
    {
      icon: sourceBranch,
      title: 'Subsidiaries',
      emptyText: 'No subsidiaries under this company.',
      items: subsidiaries.map((sub) => ({
        key: sub.id,
        primary: sub.name,
        secondary: sub.slug,
        status: sub.status,
        to: `/app/companies/${sub.id}/edit`,
      })),
    },
    {
      icon: cubeOutline,
      title: 'Products & services',
      emptyText: 'No products or services listed.',
      items: products.map((p) => ({
        key: p.id,
        primary: p.name,
        secondary: p.description || undefined,
        status: p.status,
      })),
    },
    {
      icon: folderMultipleOutline,
      title: 'Projects',
      emptyText: 'No projects attached.',
      items: projects.map((p) => ({
        key: p.id,
        primary: p.title,
        secondary: p.sector || undefined,
        status: p.status,
      })),
    },
    {
      icon: accountGroupOutline,
      title: 'Leadership',
      emptyText: 'No leadership profiles attached.',
      items: leadership.map((l) => ({
        key: l.id,
        primary: l.name,
        secondary: l.position || undefined,
        status: l.status,
      })),
    },
    {
      icon: emailOutline,
      title: 'Contacts',
      emptyText: 'No contacts attached.',
      items: contacts.map((c) => ({
        key: c.id,
        primary: c.name,
        secondary: [c.type, c.email, c.phone].filter(Boolean).join(' · ') || undefined,
        status: c.status,
      })),
    },
    {
      icon: factory,
      title: 'Facilities',
      emptyText: 'No facilities attached.',
      items: facilities.map((f) => ({
        key: f.id,
        primary: f.name,
        secondary: [f.category, f.operationalStatus].filter(Boolean).join(' · ') || undefined,
        status: f.status,
      })),
    },
    {
      icon: linkVariant,
      title: 'Company relationships',
      emptyText: 'No relationships with other companies.',
      items: relationships.map((r) => {
        const counterpartId = r.companyId === companyId ? r.relatedCompanyId : r.companyId;
        return {
          key: r.id,
          primary: nameOf(counterpartId) ?? counterpartId,
          secondary: RELATIONSHIP_TYPE_LABELS[r.relationshipType] ?? r.relationshipType,
          status: r.status,
        };
      }),
    },
    {
      icon: newspaperVariantOutline,
      title: 'News',
      emptyText: 'No news articles reference this company.',
      items: news.map((n) => ({
        key: n.id,
        primary: n.title,
        secondary: n.slug,
        status: n.status,
        to: `/app/news/${n.id}/edit`,
      })),
    },
    {
      icon: briefcaseOutline,
      title: 'Career listings',
      emptyText: 'No career listings attached.',
      items: careers.map((c) => ({
        key: c.id,
        primary: c.jobTitle,
        secondary: [c.department, c.listingStatus].filter(Boolean).join(' · ') || undefined,
        status: c.status,
      })),
    },
    {
      icon: handshakeOutline,
      title: 'CSR entries',
      emptyText: 'No CSR entries attached.',
      items: csrEntries.map((c) => ({
        key: c.id,
        primary: c.title,
        secondary: c.category || undefined,
        status: c.status,
      })),
    },
  ];

  const populated = sections.filter((section) => section.items.length > 0).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        <span className="font-medium text-ink">{totalRows}</span>{' '}
        {totalRows === 1 ? 'related record' : 'related records'} across{' '}
        <span className="font-medium text-ink">{populated}</span>{' '}
        {populated === 1 ? 'type' : 'types'} referencing {companyName}. Everything below comes
        from the live governed endpoints – the backend stays the source of truth.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <RelSection key={section.title} {...section} />
        ))}
      </div>
    </div>
  );
}
