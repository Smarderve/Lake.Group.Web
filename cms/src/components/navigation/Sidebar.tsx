import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import logoutIcon from '@iconify-icons/mdi/logout';
import openInNew from '@iconify-icons/mdi/open-in-new';
import { cn } from '../../utils/cn';
import { NAV_SECTIONS, type NavSection } from '../../config/nav';
import { BrandMark } from '../brand/BrandMark';
import { useAuth } from '../../features/auth/AuthProvider';
import type { Role } from '../../types/api';

/** Initials for the account avatar (fallback: single letter of the email). */
function initialsFor(user: { name?: string | null; email: string }): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export interface SidebarProps {
  /** Close the mobile drawer after navigation. */
  onNavigate?: () => void;
  /** Icon-only rail (Settings → Appearance → Collapsed sidebar). */
  collapsed?: boolean;
}

/**
 * Sections visible per role (spec §30 – UX only; the backend enforces every
 * permission). Administration + system sections are SUPER_ADMIN-only.
 */
const ADMIN_SECTIONS = new Set(['Administration', 'System']);

function sectionVisible(section: NavSection, role: Role): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return !ADMIN_SECTIONS.has(section.label);
}

export function Sidebar({ onNavigate, collapsed = false }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const visibleSections = user ? NAV_SECTIONS.filter((s) => sectionVisible(s, user.role)) : [];

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-3 border-b border-border',
          collapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <BrandMark size="md" iconOnly />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight text-ink">Lake Group</p>
            <p className="truncate text-[10px] font-medium tracking-wide text-ink-faint uppercase">
              Content Management System
            </p>
          </div>
        )}
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.label} className="mb-5">
            {section.label !== 'Overview' && !collapsed && (
              <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wider text-ink-faint uppercase">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/app'}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'cms-nav-row flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-brand-50 text-brand-800'
                          : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                      )
                    }
                  >
                    <Icon icon={item.icon} className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        {user && (
          <div
            className={cn(
              'mb-2 flex items-center gap-2.5 rounded-md px-2 py-1.5',
              collapsed && 'justify-center px-0',
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initialsFor(user)}
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">{user.name ?? user.email}</span>
                <span className="block truncate text-xs text-ink-faint">{user.role}</span>
              </span>
            )}
          </div>
        )}
        <div className="space-y-0.5">
          <a
            href="https://lake-group.vercel.app"
            target="_blank"
            rel="noreferrer"
            title={collapsed ? 'Visit Website' : undefined}
            aria-label={collapsed ? 'Visit Website' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink',
              collapsed && 'justify-center px-0',
            )}
          >
            <Icon icon={openInNew} className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Visit Website</span>}
          </a>
          <button
            type="button"
            onClick={() => void handleLogout()}
            title={collapsed ? 'Logout' : undefined}
            aria-label={collapsed ? 'Logout' : undefined}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink',
              collapsed && 'justify-center px-0',
            )}
          >
            <Icon icon={logoutIcon} className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
