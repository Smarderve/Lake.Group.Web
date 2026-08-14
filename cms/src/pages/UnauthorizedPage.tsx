import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import shieldAlertOutline from '@iconify-icons/mdi/shield-alert-outline';
import { buttonVariants } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

/** Authenticated but not permitted (spec §36 "handle unauthorized users"). */
export function UnauthorizedPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas p-4">
      <EmptyState
        icon={<Icon icon={shieldAlertOutline} className="h-5 w-5" aria-hidden="true" />}
        title="You don't have access to this area"
        description="Your role does not include the permissions this section requires. Contact a Lake Group administrator if you believe this is a mistake."
        action={
          <Link to="/app" className={buttonVariants({ variant: 'outline' })}>
            Back to Dashboard
          </Link>
        }
      />
    </div>
  );
}
