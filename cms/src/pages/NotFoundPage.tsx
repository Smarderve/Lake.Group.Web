import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import fileQuestionOutline from '@iconify-icons/mdi/file-question-outline';
import { buttonVariants } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[80dvh] flex-col justify-center px-4 py-10">
      <EmptyState
        icon={<Icon icon={fileQuestionOutline} className="h-5 w-5" aria-hidden="true" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or you may not have access to it."
        action={
          <Link to="/app" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            Back to Dashboard
          </Link>
        }
      />
    </div>
  );
}
