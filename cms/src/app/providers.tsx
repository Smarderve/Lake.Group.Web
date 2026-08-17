import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '../components/ui/toast';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { AuthProvider } from '../features/auth/AuthProvider';
import { SettingsProvider } from '../features/settings/SettingsProvider';
import { ErrorBoundary } from './error-boundary';
import { router } from './router';

/**
 * Provider stack (spec §5): TanStack Query for server state, toast system for
 * feedback, router for URL/navigation, and the error boundary at the root.
 */
export function AppProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary>
          <AuthProvider>
            <SettingsProvider>
              <RouterProvider router={router} />
            </SettingsProvider>
          </AuthProvider>
        </ErrorBoundary>
        <OfflineBanner />
      </ToastProvider>
    </QueryClientProvider>
  );
}
