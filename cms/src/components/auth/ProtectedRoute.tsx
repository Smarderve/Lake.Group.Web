import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { Spinner } from '../ui/Spinner';

/**
 * Route guard (spec §36): while the session restores we show a loading state;
 * unauthenticated users are sent to /login (carrying the destination so login
 * can return them). Protected layout renders once authenticated.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, isRestoring } = useAuth();
  const location = useLocation();

  if (isRestoring || status === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
        <Spinner label="Restoring session" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    const from = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <>{children}</>;
}
