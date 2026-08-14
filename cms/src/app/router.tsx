import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RequireRole } from '../components/auth/RequireRole';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';

function lazyRoute<K extends string>(
  loader: () => Promise<Record<K, ComponentType>>,
  exportName: K,
) {
  return {
    lazy: async () => ({ Component: (await loader())[exportName] }),
    hydrateFallbackElement: <div role="status" className="p-6 text-sm text-ink-muted">Loading…</div>,
  };
}

/**
 * Route tree (spec §8/§13/§36). /app sits behind ProtectedRoute (session
 * restore + login redirect); administration routes are additionally gated by
 * role. The backend remains the authority – these guards are UX.
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        ...lazyRoute(() => import('../features/auth/pages/LoginPage'), 'LoginPage'),
      },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, ...lazyRoute(() => import('../features/dashboard/pages/DashboardPage'), 'DashboardPage') },
      { path: 'companies', ...lazyRoute(() => import('../features/companies/CompaniesPage'), 'CompaniesPage') },
      { path: 'companies/new', ...lazyRoute(() => import('../features/companies/CompanyEditorPage'), 'CompanyEditorPage') },
      { path: 'companies/:id/edit', ...lazyRoute(() => import('../features/companies/CompanyEditorPage'), 'CompanyEditorPage') },
      { path: 'products', ...lazyRoute(() => import('../features/products/ProductsPage'), 'ProductsPage') },
      { path: 'products/new', ...lazyRoute(() => import('../features/products/ProductServiceEditorPage'), 'ProductServiceEditorPage') },
      { path: 'products/:id/edit', ...lazyRoute(() => import('../features/products/ProductServiceEditorPage'), 'ProductServiceEditorPage') },
      { path: 'leadership', ...lazyRoute(() => import('../features/leadership/LeadershipPage'), 'LeadershipPage') },
      { path: 'leadership/new', ...lazyRoute(() => import('../features/leadership/LeadershipEditorPage'), 'LeadershipEditorPage') },
      { path: 'leadership/:id/edit', ...lazyRoute(() => import('../features/leadership/LeadershipEditorPage'), 'LeadershipEditorPage') },
      { path: 'countries', ...lazyRoute(() => import('../features/geography/CountriesPage'), 'CountriesPage') },
      { path: 'countries/new', ...lazyRoute(() => import('../features/geography/CountryEditorPage'), 'CountryEditorPage') },
      { path: 'countries/:id', ...lazyRoute(() => import('../features/geography/CountryDetailPage'), 'CountryDetailPage') },
      { path: 'countries/:id/edit', ...lazyRoute(() => import('../features/geography/CountryEditorPage'), 'CountryEditorPage') },
      { path: 'regions', ...lazyRoute(() => import('../features/geography/RegionsPage'), 'RegionsPage') },
      { path: 'regions/new', ...lazyRoute(() => import('../features/geography/RegionEditorPage'), 'RegionEditorPage') },
      { path: 'regions/:id/edit', ...lazyRoute(() => import('../features/geography/RegionEditorPage'), 'RegionEditorPage') },
      { path: 'locations', ...lazyRoute(() => import('../features/geography/LocationsPage'), 'LocationsPage') },
      { path: 'locations/new', ...lazyRoute(() => import('../features/geography/LocationEditorPage'), 'LocationEditorPage') },
      { path: 'locations/:id/edit', ...lazyRoute(() => import('../features/geography/LocationEditorPage'), 'LocationEditorPage') },
      { path: 'facilities', ...lazyRoute(() => import('../features/geography/FacilitiesPage'), 'FacilitiesPage') },
      { path: 'facilities/new', ...lazyRoute(() => import('../features/geography/FacilityEditorPage'), 'FacilityEditorPage') },
      { path: 'facilities/:id/edit', ...lazyRoute(() => import('../features/geography/FacilityEditorPage'), 'FacilityEditorPage') },
      { path: 'projects', ...lazyRoute(() => import('../features/projects/ProjectsPage'), 'ProjectsPage') },
      { path: 'projects/new', ...lazyRoute(() => import('../features/projects/ProjectEditorPage'), 'ProjectEditorPage') },
      { path: 'projects/:id/edit', ...lazyRoute(() => import('../features/projects/ProjectEditorPage'), 'ProjectEditorPage') },
      { path: 'careers', ...lazyRoute(() => import('../features/careers/CareersPage'), 'CareersPage') },
      { path: 'careers/new', ...lazyRoute(() => import('../features/careers/CareerListingEditorPage'), 'CareerListingEditorPage') },
      { path: 'careers/:id/edit', ...lazyRoute(() => import('../features/careers/CareerListingEditorPage'), 'CareerListingEditorPage') },
      { path: 'csr', ...lazyRoute(() => import('../features/csr/CsrPage'), 'CsrPage') },
      { path: 'csr/new', ...lazyRoute(() => import('../features/csr/CsrEditorPage'), 'CsrEditorPage') },
      { path: 'csr/:id/edit', ...lazyRoute(() => import('../features/csr/CsrEditorPage'), 'CsrEditorPage') },
      { path: 'contacts', ...lazyRoute(() => import('../features/contacts/ContactsPage'), 'ContactsPage') },
      { path: 'contacts/new', ...lazyRoute(() => import('../features/contacts/ContactEditorPage'), 'ContactEditorPage') },
      { path: 'contacts/:id/edit', ...lazyRoute(() => import('../features/contacts/ContactEditorPage'), 'ContactEditorPage') },
      { path: 'content-blocks', ...lazyRoute(() => import('../features/content-blocks/ContentBlocksPage'), 'ContentBlocksPage') },
      { path: 'content-blocks/new', ...lazyRoute(() => import('../features/content-blocks/ContentBlockEditorPage'), 'ContentBlockEditorPage') },
      { path: 'content-blocks/:id/edit', ...lazyRoute(() => import('../features/content-blocks/ContentBlockEditorPage'), 'ContentBlockEditorPage') },
      { path: 'metrics', ...lazyRoute(() => import('../features/metrics/MetricsPage'), 'MetricsPage') },
      { path: 'metrics/new', ...lazyRoute(() => import('../features/metrics/MetricEditorPage'), 'MetricEditorPage') },
      { path: 'metrics/:id/edit', ...lazyRoute(() => import('../features/metrics/MetricEditorPage'), 'MetricEditorPage') },
      { path: 'news', ...lazyRoute(() => import('../features/news/NewsPage'), 'NewsPage') },
      { path: 'news/new', ...lazyRoute(() => import('../features/news/NewsEditorPage'), 'NewsEditorPage') },
      { path: 'news/:id/edit', ...lazyRoute(() => import('../features/news/NewsEditorPage'), 'NewsEditorPage') },
      { path: 'media', ...lazyRoute(() => import('../features/media/MediaLibraryPage'), 'MediaLibraryPage') },
      { path: 'media/new', ...lazyRoute(() => import('../features/media/MediaEditorPage'), 'MediaEditorPage') },
      { path: 'media/:id', ...lazyRoute(() => import('../features/media/MediaDetailPage'), 'MediaDetailPage') },
      { path: 'media/:id/edit', ...lazyRoute(() => import('../features/media/MediaEditorPage'), 'MediaEditorPage') },
      { path: 'media-folders', ...lazyRoute(() => import('../features/media/MediaFoldersPage'), 'MediaFoldersPage') },
      {
        path: 'review',
        hydrateFallbackElement: <div role="status" className="p-6 text-sm text-ink-muted">Loading…</div>,
        lazy: async () => {
          const { ReviewQueuePage } = await import('../features/review/ReviewQueuePage');
          return {
            Component: () => <RequireRole roles={['REVIEWER', 'SUPER_ADMIN']}><ReviewQueuePage /></RequireRole>,
          };
        },
      },
      {
        path: 'review/:route/:id',
        hydrateFallbackElement: <div role="status" className="p-6 text-sm text-ink-muted">Loading…</div>,
        lazy: async () => {
          const { ReviewDetailPage } = await import('../features/review/ReviewDetailPage');
          return {
            Component: () => <RequireRole roles={['REVIEWER', 'SUPER_ADMIN']}><ReviewDetailPage /></RequireRole>,
          };
        },
      },
      {
        path: 'users',
        hydrateFallbackElement: <div role="status" className="p-6 text-sm text-ink-muted">Loading…</div>,
        lazy: async () => {
          const { UsersPage } = await import('../features/admin/UsersPage');
          return {
            Component: () => <RequireRole roles={['SUPER_ADMIN']}><UsersPage /></RequireRole>,
          };
        },
      },
      {
        path: 'audit',
        hydrateFallbackElement: <div role="status" className="p-6 text-sm text-ink-muted">Loading…</div>,
        lazy: async () => {
          const { AuditLogPage } = await import('../features/admin/AuditLogPage');
          return {
            Component: () => <RequireRole roles={['SUPER_ADMIN']}><AuditLogPage /></RequireRole>,
          };
        },
      },
      { path: 'notifications', ...lazyRoute(() => import('../features/admin/NotificationsPage'), 'NotificationsPage') },
      { path: 'scheduled', ...lazyRoute(() => import('../features/scheduled/ScheduledPublishingPage'), 'ScheduledPublishingPage') },
      { path: 'published', ...lazyRoute(() => import('../features/publishing/PublishedContentPage'), 'PublishedContentPage') },
      { path: 'drafts', ...lazyRoute(() => import('../features/publishing/DraftsPage'), 'DraftsPage') },
      { path: 'preview/:route/:id', ...lazyRoute(() => import('../features/preview/PreviewPage'), 'PreviewPage') },
      {
        path: 'settings',
        ...lazyRoute(() => import('../features/settings/SettingsPage'), 'SettingsPage'),
      },
      { path: ':slug', element: <PlaceholderPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/403', element: <UnauthorizedPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
