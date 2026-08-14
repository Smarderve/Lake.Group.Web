import { useEffect, useState } from 'react';
import { Link, isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { ErrorState } from '../components/ui/ErrorState';
import { ErrorReference } from '../components/ui/ErrorReference';
import { buttonVariants } from '../components/ui/Button';
import { logError, makeErrorReference } from '../services/errors';
import { NotFoundPage } from './NotFoundPage';
import { UnauthorizedPage } from './UnauthorizedPage';

/**
 * Route-level error handling (errorElement). Distinguishes real statuses the
 * user can recover from (404 / 401 / 403 / 503) from unexpected failures
 * (500, lazy-chunk load errors) – which get a sanitized screen, a retry that
 * reloads, and a log-lookup reference. Raw status text and internals never
 * reach the user.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    const ref = makeErrorReference();
    setReference(ref);
    logError({ reference: ref, error, context: 'RouteErrorPage' });
  }, [error]);

  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 404:
        return <NotFoundPage />;
      case 403:
        return <UnauthorizedPage />;
      case 401:
        return (
          <div className="flex min-h-[100dvh] items-center justify-center bg-canvas p-4">
            <ErrorState
              variant="session"
              action={
                <Link to="/login" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                  Sign in
                </Link>
              }
            />
          </div>
        );
      case 503:
        return (
          <div className="flex min-h-[100dvh] items-center justify-center bg-canvas p-4">
            <ErrorState variant="maintenance" onRetry={() => window.location.reload()} />
          </div>
        );
      default:
        break;
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas p-4">
      <ErrorState
        variant="server"
        title="Something went wrong"
        message="We're having trouble loading this page. Please try again."
        onRetry={() => window.location.reload()}
        action={
          <button type="button" className={buttonVariants({ variant: 'outline', size: 'sm' })} onClick={() => navigate('/app')}>
            Go to Dashboard
          </button>
        }
      />
      {reference && <ErrorReference reference={reference} />}
    </div>
  );
}
