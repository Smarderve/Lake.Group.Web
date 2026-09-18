import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconHistory, IconSitemap, IconDatabase } from '@tabler/icons-react';
import { apiErrorMessage } from '../../services/api';
import { controlApi } from './api';

export function NavigationWorkspace() {
  return <div className="control-page"><div className="control-page-heading"><div><p className="control-eyebrow">Website</p><h1>Navigation</h1><p>The public site's menu is currently defined in the static pages.</p></div></div><div className="control-panel control-empty"><IconSitemap size={25} /><strong>Navigation editing is not connected yet</strong><span>A shared navigation model and public delivery adapter are required before edits can be published safely.</span><Link to="/control/pages">Browse pages <IconArrowRight size={15} /></Link></div></div>;
}

export function GlobalDataWorkspace() {
  const global = useQuery({ queryKey: ['control-global'], queryFn: () => controlApi.document('global') });
  const data = global.data?.document.currentDraftRevision?.data as unknown as { organization?: Record<string, string>; statistics?: Array<{ label: string; value: string; scope: string }>; socialLinks?: Array<{ label: string; href: string }> } | undefined;
  return <div className="control-page"><div className="control-page-heading"><div><p className="control-eyebrow">Content</p><h1>Global data</h1><p>Imported shared data. Reference tracking and selective updates are still being built.</p></div></div>{global.isLoading ? <div className="control-loading">Loading global data…</div> : global.error ? <div className="control-error" role="alert">{apiErrorMessage(global.error)} <button onClick={() => void global.refetch()}>Retry</button></div> : !data ? <div className="control-panel control-empty"><IconDatabase size={24} /><strong>No imported global data</strong><span>Run the CMS V2 content import to populate this workspace.</span></div> : <div className="control-overview-grid"><section className="control-panel"><div className="control-panel-heading"><div><h2>Corporate information</h2><p>Current draft values</p></div></div><div className="control-list">{Object.entries(data.organization ?? {}).map(([name, value]) => <div className="control-list-row" key={name}><IconDatabase size={18} /><span><strong>{name.replace(/([A-Z])/g, ' $1')}</strong><small>{value}</small></span></div>)}</div></section><section className="control-panel"><div className="control-panel-heading"><div><h2>Statistics</h2><p>Current draft values</p></div></div><div className="control-list">{(data.statistics ?? []).map((stat, index) => <div className="control-list-row" key={`${stat.label}-${index}`}><IconDatabase size={18} /><span><strong>{stat.label}: {stat.value}</strong><small>{stat.scope}</small></span></div>)}</div></section></div>}</div>;
}

export function HistoryWorkspace() {
  const releases = useQuery({ queryKey: ['control-releases'], queryFn: controlApi.releases });
  return <div className="control-page"><div className="control-page-heading"><div><p className="control-eyebrow">System</p><h1>Version history</h1><p>Immutable CMS content releases.</p></div></div><div className="control-panel">{releases.isLoading ? <div className="control-loading">Loading releases…</div> : releases.error ? <div className="control-error" role="alert">{apiErrorMessage(releases.error)} <button onClick={() => void releases.refetch()}>Retry</button></div> : releases.data?.releases.length ? <div className="control-list">{releases.data.releases.map((release) => <div className="control-list-row" key={release.id}><IconHistory size={18} /><span><strong>{new Date(release.publishedAt).toLocaleString()}</strong><small>{release.id}</small></span><small>{release.integrity.slice(0, 19)}…</small></div>)}</div> : <div className="control-empty"><IconHistory size={24} /><strong>No CMS V2 releases yet</strong><span>Published content revisions will appear here.</span></div>}</div></div>;
}
