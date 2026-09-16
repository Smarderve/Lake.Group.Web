import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { apiErrorMessage } from '../../services/api';
import { cmsV2Api, type LakeAviationData } from './api';

export function LakeAviationV2Page() {
  const [data, setData] = useState<LakeAviationData | null>(null); const [revision, setRevision] = useState<string | null>(null); const [status, setStatus] = useState('Loading…');
  useEffect(() => { cmsV2Api.document().then(({ document }) => { setData(document.currentDraftRevision?.data ?? null); setRevision(document.currentDraftRevision?.id ?? null); setStatus(document.currentDraftRevision ? 'Draft loaded' : 'No draft yet'); }).catch((error) => setStatus(apiErrorMessage(error))); }, []);
  if (!data) return <Card><p>{status}</p></Card>;
  const update = (path: 'hero.heading' | 'hero.description' | 'introduction.heading' | 'introduction.body' | 'seo.title' | 'seo.description', value: string) => { const [group, field] = path.split('.') as [keyof LakeAviationData, string]; setData({ ...data, [group]: { ...data[group], [field]: value } }); };
  const save = async () => { setStatus('Saving…'); try { const result = await cmsV2Api.saveDraft(data, revision); setRevision(result.revision.id); setStatus(`Saved immutable revision ${result.revision.id}`); } catch (error) { setStatus(apiErrorMessage(error)); } };
  return <div><Card><h1>Lake Aviation V2 pilot</h1><p>{status}</p><p>Current draft: {revision ?? 'none'}</p></Card><Card><label>Hero heading<input value={data.hero.heading} onChange={(e) => update('hero.heading', e.target.value)} /></label><label>Hero description<textarea value={data.hero.description} onChange={(e) => update('hero.description', e.target.value)} /></label><label>Introduction heading<input value={data.introduction.heading} onChange={(e) => update('introduction.heading', e.target.value)} /></label><label>Introduction body<textarea value={data.introduction.body} onChange={(e) => update('introduction.body', e.target.value)} /></label><label>SEO title<input value={data.seo.title} onChange={(e) => update('seo.title', e.target.value)} /></label><label>SEO description<textarea value={data.seo.description} onChange={(e) => update('seo.description', e.target.value)} /></label><Button onClick={save}>Save draft</Button></Card></div>;
}
