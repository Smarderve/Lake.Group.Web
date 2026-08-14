import type { IconifyIcon } from '@iconify/react';
import accountCogOutline from '@iconify-icons/mdi/account-cog-outline';
import bellOutline from '@iconify-icons/mdi/bell-outline';
import briefcaseOutline from '@iconify-icons/mdi/briefcase-outline';
import calendarClockOutline from '@iconify-icons/mdi/calendar-clock-outline';
import chartBar from '@iconify-icons/mdi/chart-bar';
import clipboardCheckOutline from '@iconify-icons/mdi/clipboard-check-outline';
import cogOutline from '@iconify-icons/mdi/cog-outline';
import emailOutline from '@iconify-icons/mdi/email-outline';
import factory from '@iconify-icons/mdi/factory';
import fileDocumentOutline from '@iconify-icons/mdi/file-document-outline';
import folderMultipleOutline from '@iconify-icons/mdi/folder-multiple-outline';
import folderOutline from '@iconify-icons/mdi/folder-outline';
import globeModel from '@iconify-icons/mdi/globe-model';
import handshakeOutline from '@iconify-icons/mdi/handshake-outline';
import imageOutline from '@iconify-icons/mdi/image-outline';
import inboxOutline from '@iconify-icons/mdi/inbox-outline';
import mapMarkerOutline from '@iconify-icons/mdi/map-marker-outline';
import mapOutline from '@iconify-icons/mdi/map-outline';
import medalOutline from '@iconify-icons/mdi/medal-outline';
import newspaperVariantOutline from '@iconify-icons/mdi/newspaper-variant-outline';
import officeBuildingOutline from '@iconify-icons/mdi/office-building-outline';
import packageVariantClosed from '@iconify-icons/mdi/package-variant-closed';
import scriptTextOutline from '@iconify-icons/mdi/script-text-outline';
import tag from '@iconify-icons/mdi/tag';
import viewDashboardOutline from '@iconify-icons/mdi/view-dashboard-outline';
import viewGridOutline from '@iconify-icons/mdi/view-grid-outline';

export interface NavItem {
  label: string;
  to: string;
  icon: IconifyIcon;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Main CMS navigation (spec §7). Permission-aware filtering is applied at
 * render time by the authenticated user's role (Phase 2) – this config only
 * declares the full tree.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/app', icon: viewDashboardOutline }],
  },
  {
    label: 'Corporate',
    items: [
      { label: 'Companies', to: '/app/companies', icon: officeBuildingOutline },
      { label: 'Products & Services', to: '/app/products', icon: packageVariantClosed },
      { label: 'Leadership', to: '/app/leadership', icon: medalOutline },
      { label: 'Countries', to: '/app/countries', icon: globeModel },
      { label: 'Regions', to: '/app/regions', icon: mapOutline },
      { label: 'Locations', to: '/app/locations', icon: mapMarkerOutline },
      { label: 'Facilities', to: '/app/facilities', icon: factory },
      { label: 'Projects', to: '/app/projects', icon: folderMultipleOutline },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'News', to: '/app/news', icon: newspaperVariantOutline },
      { label: 'Categories', to: '/app/categories', icon: tag },
      { label: 'Careers', to: '/app/careers', icon: briefcaseOutline },
      { label: 'CSR', to: '/app/csr', icon: handshakeOutline },
      { label: 'Contacts', to: '/app/contacts', icon: emailOutline },
      { label: 'Content Blocks', to: '/app/content-blocks', icon: viewGridOutline },
    ],
  },
  {
    label: 'Media',
    items: [
      { label: 'Media Library', to: '/app/media', icon: imageOutline },
      { label: 'Folders', to: '/app/media-folders', icon: folderOutline },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { label: 'Review Queue', to: '/app/review', icon: clipboardCheckOutline },
      { label: 'Scheduled Publishing', to: '/app/scheduled', icon: calendarClockOutline },
      { label: 'Published Content', to: '/app/published', icon: fileDocumentOutline },
      { label: 'Drafts', to: '/app/drafts', icon: inboxOutline },
    ],
  },
  {
    label: 'Data',
    items: [{ label: 'Corporate Metrics', to: '/app/metrics', icon: chartBar }],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users & Roles', to: '/app/users', icon: accountCogOutline },
      { label: 'Notifications', to: '/app/notifications', icon: bellOutline },
      { label: 'Audit Log', to: '/app/audit', icon: scriptTextOutline },
    ],
  },
  {
    label: 'Settings',
    items: [{ label: 'Settings Center', to: '/app/settings', icon: cogOutline }],
  },
];

/** Resolve a pathname to its nav label (used for the top bar context/title). */
export function navTitleForPath(pathname: string): string | null {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.to === '/app') {
        if (pathname === '/app') return item.label;
      } else if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        return item.label;
      }
    }
  }
  return null;
}
