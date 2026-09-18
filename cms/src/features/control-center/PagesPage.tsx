import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconExternalLink, IconSearch } from '@tabler/icons-react';
import { apiErrorMessage } from '../../services/api';
import { controlApi, publicSiteBase } from './api';

export function PagesPage() {
  const pages = useQuery({ queryKey: ['control-pages'], queryFn: controlApi.pages });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('name');
  const visible = useMemo(() => {
    const rows = (pages.data?.pages ?? []).filter((page) => {
      const state = !page.draftRevisionId ? 'unimported' : page.draftRevisionId !== page.publishedRevisionId ? 'changed' : 'published';
      return (status === 'all' || state === status) && `${page.label} ${page.route} ${page.title}`.toLowerCase().includes(search.toLowerCase());
    });
    return rows.sort((a, b) => sort === 'recent' ? new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime() : a.label.localeCompare(b.label));
  }, [pages.data, search, status, sort]);
  return <div className="control-page"><div className="control-page-heading"><div><p className="control-eyebrow">Website / Pages</p><h1>Pages</h1><p>Browse the site's registered public pages and their CMS revisions.</p></div></div>
    <div className="control-panel"><div className="control-filters"><label className="control-filter-search"><IconSearch size={18} /><input aria-label="Search pages" placeholder="Search pages" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Status <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="changed">Changed draft</option><option value="unimported">Not imported</option></select></label><label>Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Name</option><option value="recent">Recently edited</option></select></label></div>
      {pages.isLoading ? <div className="control-loading" role="status">Loading pages…</div> : pages.error ? <div className="control-error" role="alert">{apiErrorMessage(pages.error)} <button onClick={() => void pages.refetch()}>Retry</button></div> : visible.length ? <div className="control-table-wrap"><table className="control-table"><thead><tr><th>Page</th><th>CMS state</th><th>Last edited</th><th>Public page</th><th><span className="sr-only">Edit</span></th></tr></thead><tbody>{visible.map((page) => { const state = !page.draftRevisionId ? 'Not imported' : page.draftRevisionId !== page.publishedRevisionId ? 'Changed draft' : 'Published'; return <tr key={page.key}><td><Link to={`/control/pages/${page.key}`} className="control-page-name">{page.label}</Link><small>{page.route}</small></td><td><span className={`control-status ${state === 'Published' ? 'published' : state === 'Changed draft' ? 'changed' : 'unimported'}`}>{state}</span></td><td>{page.updatedAt ? new Date(page.updatedAt).toLocaleString() : '—'}</td><td><a href={`${publicSiteBase}/${page.route}`} target="_blank" rel="noreferrer" aria-label={`Open ${page.label} public page`}><IconExternalLink size={17} /></a></td><td><Link to={`/control/pages/${page.key}`} aria-label={`Edit ${page.label}`}><IconArrowRight size={18} /></Link></td></tr>; })}</tbody></table></div> : <div className="control-empty">No pages match this search.</div>}
    </div>
  </div>;
}
