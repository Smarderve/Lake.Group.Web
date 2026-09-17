import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { apiErrorMessage, isApiError } from '../../services/api';
import { cmsV2Api, type CmsRelease, type CmsRevision, type LakeAviationData } from './api';

type EditablePath = 'hero.heading' | 'hero.description' | 'hero.image' | 'hero.alt' | 'introduction.heading' | 'introduction.body' | 'cta.label' | 'cta.href' | 'seo.title' | 'seo.description';
const fieldGroups: Array<{ title: string; fields: Array<{ path: EditablePath; label: string; long?: boolean; type?: 'url' }> }> = [
  { title: 'Hero', fields: [{ path: 'hero.heading', label: 'Hero heading' }, { path: 'hero.description', label: 'Hero supporting text', long: true }, { path: 'hero.image', label: 'Hero image URL', type: 'url' }, { path: 'hero.alt', label: 'Hero image alternative text' }] },
  { title: 'Introduction', fields: [{ path: 'introduction.heading', label: 'Introduction heading' }, { path: 'introduction.body', label: 'Introduction text', long: true }] },
  { title: 'Call to action', fields: [{ path: 'cta.label', label: 'CTA label' }, { path: 'cta.href', label: 'CTA link', type: 'url' }] },
  { title: 'Search metadata', fields: [{ path: 'seo.title', label: 'SEO title' }, { path: 'seo.description', label: 'SEO description', long: true }] },
];
function clone<T>(value: T): T { return structuredClone(value); }
function displayTime(value?: string) { return value ? new Date(value).toLocaleString() : 'Not published'; }

export function LakeAviationV2Page() {
  const [data, setData] = useState<LakeAviationData | null>(null);
  const [savedData, setSavedData] = useState<LakeAviationData | null>(null);
  const [revision, setRevision] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<CmsRevision[]>([]);
  const [releases, setReleases] = useState<CmsRelease[]>([]);
  const [status, setStatus] = useState('Loading Lake Aviation…');
  const [saving, setSaving] = useState(false); const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setError(null);
    try {
      const [{ document }, versionResult, releaseResult] = await Promise.all([cmsV2Api.document(), cmsV2Api.versions(), cmsV2Api.releases()]);
      const draft = document.currentDraftRevision;
      setData(draft?.data ? clone(draft.data) : null); setSavedData(draft?.data ? clone(draft.data) : null); setRevision(draft?.id ?? null);
      setRevisions(versionResult.revisions); setReleases(releaseResult.releases); setStatus(draft ? 'Saved' : 'No Lake Aviation draft exists yet');
    } catch (cause) { setError(apiErrorMessage(cause)); setStatus('Could not load the Lake Aviation pilot'); }
  };
  useEffect(() => { void load(); }, []);
  const dirty = useMemo(() => Boolean(data && savedData && JSON.stringify(data) !== JSON.stringify(savedData)), [data, savedData]);
  const update = (path: EditablePath, value: string) => {
    if (!data) return;
    const [group, field] = path.split('.') as [keyof LakeAviationData, string];
    setData({ ...data, [group]: { ...data[group], [field]: value } } as LakeAviationData); setStatus('Unsaved changes'); setError(null);
  };
  const save = async () => {
    if (!data) return;
    setSaving(true); setError(null); setStatus('Saving…');
    try { const result = await cmsV2Api.saveDraft(data, revision); setRevision(result.revision.id); setSavedData(clone(data)); setStatus('Saved'); setRevisions((await cmsV2Api.versions()).revisions); }
    catch (cause) { const message = isApiError(cause) && cause.code === 'REVISION_CONFLICT' ? 'This content changed after you opened it. Reload the latest version before saving.' : apiErrorMessage(cause); setError(message); setStatus(isApiError(cause) && cause.code === 'INVALID_CONTENT_PAYLOAD' ? 'Validation error' : 'Save failed'); }
    finally { setSaving(false); }
  };
  const publish = async () => {
    if (!revision) return;
    if (dirty) { setError('Save the current changes before publishing.'); return; }
    setPublishing(true); setError(null); setStatus('Publishing…');
    try { const { release } = await cmsV2Api.publish(revision); setReleases((items) => [release, ...items]); setStatus(`Published successfully · ${release.id}`); }
    catch (cause) { setError(apiErrorMessage(cause)); setStatus('Publish failed'); } finally { setPublishing(false); }
  };
  const restore = async (revisionId: string) => {
    setError(null); setStatus('Restoring revision…');
    try { const { revision: restored } = await cmsV2Api.restoreRevision(revisionId); const { document } = await cmsV2Api.document(); const draft = document.currentDraftRevision; setRevision(restored.id); setData(draft?.data ? clone(draft.data) : null); setSavedData(draft?.data ? clone(draft.data) : null); setStatus('Saved restored revision'); setRevisions((await cmsV2Api.versions()).revisions); }
    catch (cause) { setError(apiErrorMessage(cause)); setStatus('Restore failed'); }
  };
  if (!data) return <Card><CardContent><p className="text-sm text-ink-muted">{status}</p>{error && <p className="mt-2 text-sm text-red-700">{error}</p>}</CardContent></Card>;
  const latestRelease = releases[0];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Website Pages</p><h1 className="mt-1 text-2xl font-semibold text-ink">Lake Aviation</h1><p className="mt-1 text-sm text-ink-muted">Controlled CMS V2 pilot. Content fields only.</p></div><div className="flex flex-wrap items-center gap-2"><span className={dirty ? 'text-sm font-medium text-amber-800' : 'text-sm font-medium text-emerald-700'}>{status}</span><Button variant="secondary" onClick={() => setPreview(true)}>Preview</Button><Button loading={saving} onClick={save}>Save draft</Button><Button loading={publishing} disabled={!revision || dirty} onClick={publish}>Publish</Button></div></div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-5">{fieldGroups.map((group) => <Card key={group.title}><CardHeader><div><CardTitle>{group.title}</CardTitle><CardDescription>Approved Lake Aviation content fields.</CardDescription></div></CardHeader><CardContent className="grid gap-4">{group.fields.map((field) => { const [section, key] = field.path.split('.') as [keyof LakeAviationData, string]; const value = String((data[section] as Record<string, unknown>)[key] ?? ''); return <label key={field.path} className="grid gap-1.5 text-sm font-medium text-ink">{field.label}{field.long ? <Textarea value={value} rows={field.path === 'introduction.body' ? 6 : 3} onChange={(event) => update(field.path, event.target.value)} /> : <Input type={field.type ?? 'text'} value={value} onChange={(event) => update(field.path, event.target.value)} />}</label>; })}</CardContent></Card>)}</div>
      <aside className="space-y-5"><Card><CardHeader><div><CardTitle>Publishing</CardTitle><CardDescription>Public delivery remains disabled by default.</CardDescription></div></CardHeader><CardContent className="space-y-2 text-sm text-ink-muted"><p>Current draft: <span className="font-mono text-xs text-ink">{revision ?? 'None'}</span></p><p>Last published: {displayTime(latestRelease?.publishedAt)}</p>{latestRelease && <p>Release: <span className="break-all font-mono text-xs text-ink">{latestRelease.id}</span></p>}</CardContent></Card><Card><CardHeader><div><CardTitle>Revision history</CardTitle><CardDescription>Restoring creates a new draft revision.</CardDescription></div></CardHeader><CardContent><ul className="space-y-3">{revisions.map((item) => <li key={item.id} className="border-b border-border pb-3 last:border-0"><p className="break-all font-mono text-xs text-ink">{item.id}</p><p className="mt-1 text-xs text-ink-muted">{displayTime(item.createdAt)} · {item.authorId ?? 'System'}</p>{item.id !== revision && <Button size="sm" variant="outline" className="mt-2" onClick={() => void restore(item.id)}>Restore this revision</Button>}</li>)}</ul></CardContent></Card><Link className="text-sm font-medium text-brand-700 hover:underline" to="/app">Back to overview</Link></aside>
    </div>
    {preview && <div role="dialog" aria-modal="true" aria-label="Lake Aviation draft preview" className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 p-4 sm:p-8"><div className="mx-auto min-h-full max-w-5xl bg-white shadow-dialog"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#0181BB]">Private draft preview</p><h2 className="text-lg font-semibold text-slate-950">Lake Aviation</h2></div><Button variant="secondary" onClick={() => setPreview(false)}>Close preview</Button></div><section className="bg-[#014c73] px-6 py-16 text-white sm:px-12"><p className="text-sm font-semibold text-[#FFF200]">LAKE AVIATION</p><h3 className="mt-3 max-w-3xl text-4xl font-semibold">{data.hero.heading}</h3><p className="mt-4 max-w-2xl text-lg text-white/90">{data.hero.description}</p></section><section className="mx-auto max-w-3xl px-6 py-12 sm:px-12"><h3 className="text-2xl font-semibold text-slate-950">{data.introduction.heading}</h3><p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{data.introduction.body}</p><a className="mt-7 inline-flex rounded-md bg-[#0181BB] px-4 py-2 text-sm font-medium text-white" href={data.cta.href}>{data.cta.label}</a></section></div></div>}
  </div>;
}
