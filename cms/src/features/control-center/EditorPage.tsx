import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconArrowLeft, IconDeviceDesktop, IconDeviceMobile, IconDeviceTablet, IconExternalLink, IconRefresh, IconDeviceFloppy } from '@tabler/icons-react';
import { apiErrorMessage, isApiError } from '../../services/api';
import { controlApi, publicSiteBase, type ContentData, type ControlPage, type ReleaseReview, type Revision } from './api';

const copy = <T,>(value: T): T => structuredClone(value);
type Field = { label: string; path: string; multiline?: boolean };
const fields: Field[] = [
  { label: 'Heading', path: 'hero.heading', multiline: true },
  { label: 'Description', path: 'hero.description', multiline: true },
  { label: 'Hero image', path: 'hero.image' },
  { label: 'Image alt text', path: 'hero.alt' },
  { label: 'Introduction heading', path: 'introduction.heading' },
  { label: 'Introduction body', path: 'introduction.body', multiline: true },
  { label: 'Button label', path: 'cta.label' },
  { label: 'Button destination', path: 'cta.href' },
];
function getField(data: ContentData, path: string): string { const [group, key] = path.split('.'); return String((data[group as 'hero' | 'introduction' | 'cta'] as unknown as Record<string, unknown>)[key] ?? ''); }
function updateField(data: ContentData, path: string, value: string): ContentData { const next = copy(data); const [group, key] = path.split('.'); (next[group as 'hero' | 'introduction' | 'cta'] as unknown as Record<string, string>)[key] = value; return next; }

export function EditorPage() {
  const { key = '' } = useParams();
  const [page, setPage] = useState<ControlPage | null>(null);
  const [data, setData] = useState<ContentData | null>(null);
  const [saved, setSaved] = useState<ContentData | null>(null);
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Revision[]>([]);
  const [selected, setSelected] = useState('hero.heading');
  const [tab, setTab] = useState<'content' | 'seo' | 'history'>('content');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [status, setStatus] = useState('Loading page…');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [releaseReview, setReleaseReview] = useState<ReleaseReview | null>(null);
  const [autosave, setAutosave] = useState(true);
  const [past, setPast] = useState<ContentData[]>([]);
  const [future, setFuture] = useState<ContentData[]>([]);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [source, setSource] = useState<{ sourceUrl: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [frameReady, setFrameReady] = useState(0);
  const dirty = Boolean(data && saved && JSON.stringify(data) !== JSON.stringify(saved));

  useEffect(() => {
    let live = true;
    setData(null); setError(''); setStatus('Loading page…');
    void Promise.all([controlApi.pages(), controlApi.document(key), controlApi.versions(key)]).then(([catalog, result, history]) => {
      if (!live) return;
      setPage(catalog.pages.find((item) => item.key === key) ?? null);
      const draft = result.document.currentDraftRevision;
      setData(draft?.data ? copy(draft.data) : null);
      setSaved(draft?.data ? copy(draft.data) : null);
      setRevisionId(draft?.id ?? null);
      setVersions(history.revisions);
      setStatus(draft ? 'Saved draft' : 'No imported draft');
    }).catch((cause) => { if (live) { setError(apiErrorMessage(cause)); setStatus('Unable to load page'); } });
    return () => { live = false; };
  }, [key]);

  useEffect(() => {
    let live = true;
    setSource(null); setPreviewError('');
    void controlApi.pageSource(key).then((result) => { if (live) setSource(result); })
      .catch((cause) => { if (live) setPreviewError(apiErrorMessage(cause)); });
    return () => { live = false; };
  }, [key]);

  const previewHtml = source?.html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<meta\b(?=[^>]*http-equiv\s*=\s*["'](?:Content-Security-Policy|refresh)["'])[^>]*>/gi, '')
    .replace(/<head([^>]*)>/i, `<head$1><base href="${source.sourceUrl.replace(/"/g, '&quot;')}">`);
  useEffect(() => {
    const document = frameRef.current?.contentDocument;
    if (!document || !data || !source || key !== 'lake-aviation') return;
    const replacements: Record<string, string> = {
      'hero.heading': data.hero.heading,
      'hero.description': data.hero.description,
      'introduction.heading': data.introduction.heading,
      'introduction.body': data.introduction.body,
    };
    for (const [field, value] of Object.entries(replacements)) {
      document.querySelectorAll(`[data-cms-field="${field}"]`).forEach((node) => { node.textContent = value; });
    }
    document.querySelectorAll<HTMLImageElement>('[data-cms-field="hero.image"]').forEach((image) => {
      image.src = new URL(data.hero.image, source.sourceUrl).toString();
      image.alt = data.hero.alt ?? '';
    });
    document.querySelectorAll<HTMLElement>('[data-cms-field]').forEach((node) => {
      node.style.outline = node.getAttribute('data-cms-field') === selected ? '2px solid #0181bb' : '';
      node.style.outlineOffset = node.getAttribute('data-cms-field') === selected ? '3px' : '';
      node.style.cursor = 'pointer';
    });
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      const target = (event.target as Element)?.closest?.('[data-cms-field]');
      if (target) select(target.getAttribute('data-cms-field') || 'hero.heading');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [data, source, frameReady, selected, key]);

  const edit = (path: string, value: string) => { if (!data) return; setPast((items) => [...items.slice(-29), copy(data)]); setFuture([]); setData(updateField(data, path, value)); setSelected(path); setStatus('Unsaved changes'); };
  const editSeo = (name: keyof ContentData['seo'], value: string | boolean) => { if (!data) return; setPast((items) => [...items.slice(-29), copy(data)]); setFuture([]); setData({ ...data, seo: { ...data.seo, [name]: value } }); setStatus('Unsaved changes'); };
  const editSection = (index: number, field: 'heading' | 'body', value: string) => {
    if (!data) return;
    const next = copy(data);
    next.sections[index][field] = value;
    setPast((items) => [...items.slice(-29), copy(data)]);
    setFuture([]);
    setData(next);
    setStatus('Unsaved changes');
  };
  const undo = () => { if (!data || !past.length) return; setFuture((items) => [copy(data), ...items]); setData(past[past.length - 1]); setPast(past.slice(0, -1)); };
  const redo = () => { if (!data || !future.length) return; setPast((items) => [...items, copy(data)]); setData(future[0]); setFuture(future.slice(1)); };

  const save = async () => {
    if (!data || !dirty || saving) return;
    const snapshot = copy(data);
    setSaving(true); setError(''); setStatus('Saving…');
    try {
      const { revision } = await controlApi.save(key, snapshot, revisionId);
      setRevisionId(revision.id); setSaved(snapshot); setStatus('Saved draft');
      const { revisions } = await controlApi.versions(key); setVersions(revisions);
    } catch (cause) { setError(isApiError(cause) && cause.code === 'REVISION_CONFLICT' ? 'This draft changed elsewhere. Reload to review the latest revision.' : apiErrorMessage(cause)); setStatus('Save failed'); }
    finally { setSaving(false); }
  };
  useEffect(() => { if (!autosave || !dirty || saving) return; const timer = window.setTimeout(() => void save(), 1800); return () => window.clearTimeout(timer); }, [data, saved, autosave, saving]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const openReview = async () => { if (!revisionId || dirty) { setError('Save the current draft before reviewing a release.'); return; } setReviewing(true); setError(''); try { const result = await controlApi.review(key, revisionId); setReleaseReview(result.review); } catch (cause) { setError(apiErrorMessage(cause)); } finally { setReviewing(false); } };
  const publish = async () => { if (!revisionId || dirty || !releaseReview?.valid) { setError('Resolve blocking issues and save the current draft before creating a release.'); return; } setPublishing(true); setError(''); try { await controlApi.publish(key, revisionId); setStatus('Release queued for website deployment'); setReleaseReview(null); } catch (cause) { setError(apiErrorMessage(cause)); setStatus('Release failed'); } finally { setPublishing(false); } };
  useEffect(() => { if (!releaseReview) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setReleaseReview(null); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [releaseReview]);
  const restore = async (id: string) => { setError(''); try { const { revision } = await controlApi.restore(key, id); setData(copy(revision.data)); setSaved(copy(revision.data)); setRevisionId(revision.id); setVersions((await controlApi.versions(key)).revisions); setStatus('Historical revision restored as a draft'); } catch (cause) { setError(apiErrorMessage(cause)); } };
  const select = (path: string) => { setSelected(path); setTab('content'); inspectorRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (!page && !error) return <div className="control-loading" role="status">{status}</div>;
  if (!page) return <div className="control-error" role="alert">{error || 'Page not found'} <Link to="/control/pages">Back to pages</Link></div>;
  return <div className="control-editor"><div className="control-editor-top"><div><Link to="/control/pages" className="control-back"><IconArrowLeft size={16} /> Pages</Link><h1>{page.label}</h1><span className={`control-save-state${dirty ? ' is-dirty' : ''}`}>{status}</span></div><div className="control-editor-actions"><label className="control-autosave"><input type="checkbox" checked={autosave} onChange={(event) => setAutosave(event.target.checked)} /> Autosave</label><button className="control-button" onClick={undo} disabled={!past.length} title="Undo">↶</button><button className="control-button" onClick={redo} disabled={!future.length} title="Redo">↷</button><button className="control-button" onClick={() => void save()} disabled={!dirty || saving}><IconDeviceFloppy size={17} /> Save draft</button><button className="control-button primary" onClick={() => void openReview()} disabled={!revisionId || dirty || reviewing}>{reviewing ? 'Checking release…' : 'Review release'}</button></div></div>
    {error && <div className="control-error" role="alert">{error}</div>}
    {!data ? <div className="control-panel control-empty">This page has no imported CMS draft. Run the CMS V2 content import before editing. <a href={`${publicSiteBase}/${page.route}`} target="_blank" rel="noreferrer">View public page</a></div> : <div className="control-editor-grid">
      <aside className="control-editor-layers"><h2>Page structure</h2><p>Approved content fields</p><div className="control-layer-group"><strong>Hero</strong>{fields.slice(0, 4).map((field) => <button key={field.path} className={selected === field.path ? 'is-selected' : ''} onClick={() => select(field.path)}>{field.label}</button>)}</div><div className="control-layer-group"><strong>Introduction</strong>{fields.slice(4, 6).map((field) => <button key={field.path} className={selected === field.path ? 'is-selected' : ''} onClick={() => select(field.path)}>{field.label}</button>)}</div><div className="control-layer-group"><strong>Call to action</strong>{fields.slice(6).map((field) => <button key={field.path} className={selected === field.path ? 'is-selected' : ''} onClick={() => select(field.path)}>{field.label}</button>)}</div><div className="control-layer-group"><strong>Sections</strong>{data.sections.map((section, index) => <button key={section.key} onClick={() => { setSelected(`sections.${index}`); setTab('content'); }} className={selected === `sections.${index}` ? 'is-selected' : ''}>{section.heading}</button>)}</div></aside>
      <section className="control-canvas"><div className="control-canvas-toolbar"><div><strong>Website canvas</strong><span>{key === 'lake-aviation' ? 'Actual page with approved draft fields' : 'Actual static page · field mapping pending'}</span></div><div className="control-viewport"><button aria-label="Desktop preview" aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')}><IconDeviceDesktop size={18} /></button><button aria-label="Tablet preview" aria-pressed={viewport === 'tablet'} onClick={() => setViewport('tablet')}><IconDeviceTablet size={18} /></button><button aria-label="Mobile preview" aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')}><IconDeviceMobile size={18} /></button></div><a href={`${publicSiteBase}/${page.route}`} target="_blank" rel="noreferrer" aria-label="Open public page"><IconExternalLink size={17} /></a></div><div className="control-canvas-stage">{previewHtml ? <iframe ref={frameRef} title={`${page.label} actual website preview`} srcDoc={previewHtml} sandbox="allow-same-origin" onLoad={() => setFrameReady((value) => value + 1)} className={`control-site-frame ${viewport}`} /> : <div className="control-empty">{previewError || 'Loading actual website preview…'}</div>}<div className="control-canvas-note">Editing <strong>{selected.startsWith('sections.') ? data.sections[Number(selected.split('.')[1])]?.heading : fields.find((item) => item.path === selected)?.label ?? 'content'}</strong> in the inspector. {key === 'lake-aviation' ? 'Mapped fields update on the page.' : 'Draft mapping for this page is pending.'}</div></div></section>
      <aside ref={inspectorRef} className="control-inspector"><div className="control-inspector-tabs"><button className={tab === 'content' ? 'is-active' : ''} onClick={() => setTab('content')}>Content</button><button className={tab === 'seo' ? 'is-active' : ''} onClick={() => setTab('seo')}>SEO</button><button className={tab === 'history' ? 'is-active' : ''} onClick={() => setTab('history')}>History</button></div>{tab === 'content' && <div className="control-inspector-content"><h2>{selected.startsWith('sections.') ? 'Section' : fields.find((item) => item.path === selected)?.label}</h2>{selected.startsWith('sections.') ? (() => { const index = Number(selected.split('.')[1]); const section = data.sections[index]; if (!section) return null; return <><label>Heading<input value={section.heading} onChange={(event) => editSection(index, 'heading', event.target.value)} /></label><label>Body<textarea rows={8} value={section.body} onChange={(event) => editSection(index, 'body', event.target.value)} /></label></>; })() : (() => { const field = fields.find((item) => item.path === selected); if (!field) return null; return <label>{field.label}{field.multiline ? <textarea rows={field.path === 'introduction.body' ? 9 : 5} value={getField(data, field.path)} onChange={(event) => edit(field.path, event.target.value)} /> : <input value={getField(data, field.path)} onChange={(event) => edit(field.path, event.target.value)} />}</label>; })()}<p className="control-inspector-hint">Changes are saved as a structured revision and do not change the public page until delivery is connected.</p></div>}{tab === 'seo' && <div className="control-inspector-content"><h2>Search appearance</h2><label>Page title<input value={data.seo.title} onChange={(event) => editSeo('title', event.target.value)} /></label><label>Description<textarea rows={5} value={data.seo.description} onChange={(event) => editSeo('description', event.target.value)} /></label><label>Canonical URL<input value={data.seo.canonical ?? ''} onChange={(event) => editSeo('canonical', event.target.value)} /></label><label className="control-check"><input type="checkbox" checked={data.seo.index} onChange={(event) => editSeo('index', event.target.checked)} /> Allow search indexing</label></div>}{tab === 'history' && <div className="control-inspector-content"><h2>Draft history</h2>{versions.length ? versions.map((version) => <div className="control-version" key={version.id}><strong>{new Date(version.createdAt).toLocaleString()}</strong><small>{version.id.slice(0, 14)}</small>{version.id !== revisionId && <button onClick={() => void restore(version.id)}><IconRefresh size={15} /> Restore as draft</button>}</div>) : <p>No saved revisions yet.</p>}</div>}</aside>
    </div>}
    {releaseReview && <div className="control-review-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="control-release-review-title" className="control-review-dialog"><div className="control-review-header"><div><small>Release review</small><h2 id="control-release-review-title">Review {page.label} changes</h2><p>{releaseReview.changedFields} changed fields · {releaseReview.issues.filter((issue) => issue.severity === 'error').length} blocking issues · {releaseReview.issues.filter((issue) => issue.severity === 'warning').length} warnings</p></div><button className="control-button" onClick={() => setReleaseReview(null)} autoFocus>Close</button></div>{releaseReview.issues.length > 0 && <div className="control-review-issues">{releaseReview.issues.map((issue, index) => <p className={issue.severity} key={`${issue.field}-${index}`}><strong>{issue.severity === 'error' ? 'Blocker' : 'Warning'}</strong> {issue.field && <code>{issue.field}</code>} {issue.message}</p>)}</div>}<div className="control-review-changes">{releaseReview.changes.map((change) => <div className="control-review-change" key={change.field}><strong>{change.field}</strong><div><span>Before: {change.before}</span><span>After: {change.after}</span></div></div>)}{releaseReview.truncated && <p>Additional fields changed. Review the full revision history for details.</p>}</div><div className="control-review-footer"><span>A verified release is queued for the protected website deployment workflow.</span><button className="control-button primary" onClick={() => void publish()} disabled={!releaseReview.valid || publishing}>{publishing ? 'Creating release…' : 'Create release'}</button></div></section></div>}
  </div>;
}
