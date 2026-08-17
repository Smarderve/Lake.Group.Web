import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import accountOutline from '@iconify-icons/mdi/account-outline';
import backburger from '@iconify-icons/mdi/backburger';
import bellOutline from '@iconify-icons/mdi/bell-outline';
import forwardburger from '@iconify-icons/mdi/forwardburger';
import logoutIcon from '@iconify-icons/mdi/logout';
import menu from '@iconify-icons/mdi/menu';
import { navTitleForPath } from '../../config/nav';
import { useAuth } from '../../features/auth/AuthProvider';
import { useSettings } from '../../features/settings/SettingsProvider';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel } from '../ui/DropdownMenu';
import { Tooltip } from '../ui/Tooltip';
import { GlobalSearch } from '../../features/search/GlobalSearch';
import { useToast } from '../ui/toast';

export interface TopBarProps {
  onMenuClick: () => void;
}

/** Initials for the account avatar (fallback: single letter of the email). */
function initialsFor(user: { name?: string | null; email: string }): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { preferences, updatePreferences } = useSettings();
  const title = navTitleForPath(location.pathname) ?? 'Dashboard';
  const sidebarCollapsed = preferences.sidebarCollapsed;

  function toggleSidebar() {
    updatePreferences({ sidebarCollapsed: !sidebarCollapsed }).catch(() => {
      toast({
        variant: 'error',
        title: 'Could not update sidebar',
        description: 'Your sidebar preference could not be saved. Please try again.',
      });
    });
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      toast({ variant: 'error', title: 'Could not sign out', description: 'Please try again.' });
    }
  }

  return (
    <header className="cms-topbar flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="rounded-md p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
      >
        <Icon icon={menu} className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden rounded-md p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 lg:inline-flex"
      >
        <Icon icon={sidebarCollapsed ? forwardburger : backburger} className="h-5 w-5" />
      </button>
      <p className="min-w-0 truncate text-sm font-medium text-ink">{title}</p>
      <div className="ml-auto flex items-center gap-1">
        <GlobalSearch />
        <Tooltip label="Notifications" side="bottom">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => navigate('/app/notifications')}
            className="relative rounded-md p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <Icon icon={bellOutline} className="h-4 w-4" />
          </button>
        </Tooltip>
        <DropdownMenu
          label="Account menu"
          align="end"
          trigger={
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {user ? initialsFor(user) : '?'}
            </span>
          }
        >
          {user && (
            <DropdownMenuLabel>
              <span className="block truncate text-sm font-medium text-ink">{user.name ?? user.email}</span>
              <span className="block text-xs font-normal text-ink-muted">{user.role}</span>
            </DropdownMenuLabel>
          )}
          <DropdownMenuItem onSelect={() => navigate('/app/settings')}>
            <Icon icon={accountOutline} className="h-4 w-4" aria-hidden="true" />
            Account &amp; sessions
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => void handleLogout()}>
            <Icon icon={logoutIcon} className="h-4 w-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </header>
  );
}
