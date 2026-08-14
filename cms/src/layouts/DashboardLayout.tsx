import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import close from '@iconify-icons/mdi/close';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopBar } from '../components/navigation/TopBar';
import { useSettings } from '../features/settings/SettingsProvider';
import { useAuth } from '../features/auth/AuthProvider';
import { cn } from '../utils/cn';
import { canReview } from '../utils/permissions';

export function DashboardLayout() {
  const { user } = useAuth();
  const { preferences } = useSettings();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  // Settings → Dashboard → Default landing page. Applied after preferences
  // load (default '' = stay on the dashboard). Role-gated targets are skipped
  // for users who could not open them, so a viewer is never bounced to a 403.
  const landing = preferences.dashboardSettings.landingPage;
  const landingAllowed =
    landing === '/app/review' ? canReview(user?.role) : true;
  if (location.pathname === '/app' && landing && landing !== '/app' && landingAllowed) {
    return <Navigate to={landing} replace />;
  }

  const collapsed = preferences.sidebarCollapsed;

  useEffect(() => {
    if (!mobileNavOpen) return;
    const drawer = mobileDrawerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    drawer?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawer) return;
      const focusables = drawer.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-[100dvh]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white shadow-pop transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <aside
        className={cn(
          'sticky top-0 hidden h-[100dvh] shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:block',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="cms-animate-fade absolute inset-0 bg-ink/40"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            tabIndex={-1}
            className="cms-animate-toast absolute inset-y-0 left-0 w-64 bg-surface shadow-dialog outline-none"
          >
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Icon icon={close} className="h-5 w-5" aria-hidden="true" />
            </button>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />
        <main id="main-content" tabIndex={-1} className="cms-shell-main mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
