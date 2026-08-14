import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import eyeOutline from '@iconify-icons/mdi/eye-outline';
import { buttonVariants } from '../../components/ui/Button';

export function PreviewLink({
  route,
  id,
  label = 'Preview',
}: {
  route: string;
  id: string;
  label?: string;
}) {
  return (
    <Link
      to={`/app/preview/${encodeURIComponent(route)}/${encodeURIComponent(id)}`}
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      <Icon icon={eyeOutline} className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
