import { useAuth } from '../../features/auth/AuthProvider';
import type { Role } from '../../types/api';
import { UnauthorizedPage } from '../../pages/UnauthorizedPage';

/**
 * Role gate (spec §30). This is UX – the backend enforces every permission.
 * Navigation, buttons and routes hide what a role cannot do; the API still
 * rejects anything unauthorized.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <UnauthorizedPage />;
  }
  return <>{children}</>;
}
