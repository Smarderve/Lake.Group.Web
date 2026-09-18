import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { IconDashboard, IconFileText, IconPhoto, IconSitemap, IconDatabase, IconSearch, IconSettings, IconHistory, IconMenu2, IconChevronLeft, IconExternalLink, IconLogout } from '@tabler/icons-react';
import { useAuth } from '../auth/AuthProvider';
import { controlApi, publicSiteBase, type ControlPage } from './api';
import './control.css';

const groups = [
  { label: 'Overview', links: [{ label: 'Overview', path: '/control', icon: IconDashboard }] },
  { label: 'Website', links: [{ label: 'Pages', path: '/control/pages', icon: IconFileText }, { label: 'Navigation', path: '/control/navigation', icon: IconSitemap }] },
  { label: 'Content', links: [{ label: 'Global data', path: '/control/global-data', icon: IconDatabase }] },
  { label: 'Assets', links: [{ label: 'Media library', path: '/app/media', icon: IconPhoto }] },
  { label: 'System', links: [{ label: 'Version history', path: '/control/history', icon: IconHistory }, { label: 'Settings', path: '/app/settings', icon: IconSettings }] },
];

export function ControlLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lake-control-collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pages, setPages] = useState<ControlPage[]>([]);

  useEffect(() => { localStorage.setItem('lake-control-collapsed', String(collapsed)); }, [collapsed]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
      if (event.key === 'Escape') { setSearchOpen(false); setMobileOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (searchOpen && !pages.length) void controlApi.pages().then((result) => setPages(result.pages)).catch(() => {}); }, [searchOpen, pages.length]);

  return <div className={`control-shell${collapsed ? ' control-collapsed' : ''}`}>
    <a className="control-skip" href="#control-main">Skip to main content</a>
    {mobileOpen && <button className="control-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`control-sidebar${mobileOpen ? ' is-open' : ''}`} aria-label="Control center navigation">
      <div className="control-brand"><span className="control-brand-drop">◈</span>{!collapsed && <span><strong>Lake</strong><small>GROUP · CONTROL CENTER</small></span>}</div>
      <button className="control-search-trigger" onClick={() => setSearchOpen(true)} title="Search CMS (Ctrl K)"><IconSearch size={18} />{!collapsed && <><span>Search CMS</span><kbd>Ctrl K</kbd></>}</button>
      <nav className="control-nav">{groups.map((group) => <div className="control-nav-group" key={group.label}>{!collapsed && <p>{group.label}</p>}{group.links.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/control'} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} className={({ isActive }) => `control-nav-link${isActive ? ' is-active' : ''}`}><Icon size={19} stroke={1.8} /><span>{label}</span></NavLink>)}</div>)}</nav>
      <div className="control-sidebar-footer"><button onClick={() => setCollapsed(!collapsed)} className="control-collapse" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><IconChevronLeft size={18} className={collapsed ? 'flipped' : ''} /><span>{collapsed ? '' : 'Collapse sidebar'}</span></button><div className="control-user"><span className="control-avatar">{(user?.name || user?.email || 'IT').slice(0, 2).toUpperCase()}</span>{!collapsed && <span><strong>{user?.name || user?.email || 'IT administrator'}</strong><small>Control center</small></span>}<button title="Sign out" aria-label="Sign out" onClick={() => void logout().then(() => navigate('/login'))}><IconLogout size={18} /></button></div></div>
    </aside>
    <div className="control-body"><header className="control-topbar"><button className="control-mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><IconMenu2 size={21} /></button><div className="control-topbar-title">Lake Group <span>/</span> Website control center</div><div className="control-topbar-actions"><button onClick={() => setSearchOpen(true)} className="control-top-search"><IconSearch size={16} /> Search <kbd>Ctrl K</kbd></button><a href={publicSiteBase} target="_blank" rel="noreferrer" className="control-button">View website <IconExternalLink size={16} /></a><Link to="/app" className="control-legacy-link">Previous CMS</Link></div></header><main id="control-main" className="control-main"><Outlet /></main></div>
    {searchOpen && <div className="control-command-backdrop" onMouseDown={() => setSearchOpen(false)}><div role="dialog" aria-modal="true" aria-label="Search CMS" className="control-command" onMouseDown={(event) => event.stopPropagation()}><div className="control-command-input"><IconSearch size={20} /><input autoFocus placeholder="Search pages and workspaces" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="control-command-results">{[...groups.flatMap((group) => group.links), ...pages.map((page) => ({ label: page.label, path: `/control/pages/${page.key}`, icon: IconFileText }))].filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(0, 12).map((item) => <button key={item.path} onClick={() => { navigate(item.path); setSearchOpen(false); setQuery(''); }}><item.icon size={17} />{item.label}</button>)}</div><p>Press Escape to close</p></div></div>}
  </div>;
}
