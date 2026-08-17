import { useLocation, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import hammerWrench from '@iconify-icons/mdi/hammer-wrench';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { navTitleForPath } from '../config/nav';

function humanize(slug: string): string {
  const words = slug.replace(/[-_]/g, ' ').trim();
  if (!words) return 'Section';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Temporary route for sections scaffolded in Phase 1 – each feature replaces it. */
export function PlaceholderPage() {
  const { slug } = useParams();
  const location = useLocation();
  const title = navTitleForPath(location.pathname) ?? humanize(slug ?? '');

  return (
    <>
      <PageHeader
        title={title}
        description="This section is not built yet."
      />
      <EmptyState
        icon={<Icon icon={hammerWrench} className="h-5 w-5" aria-hidden="true" />}
        title={`${title} is not available yet`}
        description="The screens for this section are built in a later phase."
      />
    </>
  );
}
