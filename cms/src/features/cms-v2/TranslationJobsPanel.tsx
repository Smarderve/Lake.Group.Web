import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Textarea } from '../../components/ui/Textarea';
import { apiErrorMessage } from '../../services/api';
import { cmsV2Api, type CmsTranslationJob } from './api';

const LANGUAGES: Record<string, string> = { sw: 'Kiswahili', hi: 'हिन्दी', ar: 'العربية', zh: '简体中文', fr: 'Français', es: 'Español', pt: 'Português' };
const STATUS_TONE: Record<string, 'neutral' | 'amber' | 'blue' | 'green' | 'red' | 'gray'> = {
  WAITING_FOR_ENGINE: 'amber', QUEUED: 'blue', TRANSLATING: 'blue', MACHINE_TRANSLATED: 'blue',
  VALIDATION_FAILED: 'red', NEEDS_REVIEW: 'amber', APPROVED: 'green', PUBLISHED: 'green', OUTDATED: 'gray', FAILED: 'red',
};

export function TranslationJobsPanel({ documentKey, revisionId }: { documentKey: string; revisionId: string | null }) {
  const [jobs, setJobs] = useState<CmsTranslationJob[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('Loading translation status…');
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const result = await cmsV2Api.translationJobs(documentKey, revisionId);
      setJobs(result.jobs);
      setDrafts((previous) => Object.fromEntries(result.jobs.filter((job) => job.status === 'NEEDS_REVIEW' || job.status === 'MACHINE_TRANSLATED').map((job) => [job.id, previous[job.id] ?? job.translation ?? ''])));
      setStatus(`${result.jobs.length} revision-bound jobs`);
      setError(null);
    } catch (cause) { setStatus('Could not load jobs'); setError(apiErrorMessage(cause)); }
  }, [documentKey, revisionId]);
  useEffect(() => { void load(); }, [load]);
  const retry = async (job: CmsTranslationJob) => { try { await cmsV2Api.retryTranslationJob(job.id); await load(); } catch (cause) { setError(apiErrorMessage(cause)); } };
  const approve = async (job: CmsTranslationJob) => { try { await cmsV2Api.approveTranslationJob(job.id, drafts[job.id] ?? ''); await load(); } catch (cause) { setError(apiErrorMessage(cause)); } };
  const counts = jobs.reduce<Record<string, number>>((result, job) => { result[job.status] = (result[job.status] ?? 0) + 1; return result; }, {});
  return <Card>
    <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Translation status</CardTitle><CardDescription className="mt-1">Jobs are attached to this English revision. English publishing does not wait for them.</CardDescription></div><Button size="sm" variant="outline" onClick={() => void load()}>Refresh</Button></div></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-xs text-ink-muted" role="status">{status} · engine benchmark pending</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">{Object.entries(counts).map(([name, count]) => <Badge key={name} tone={STATUS_TONE[name] ?? 'neutral'}>{name.replaceAll('_', ' ').toLowerCase()}: {count}</Badge>)}</div>
      {jobs.length === 0 ? <p className="text-sm text-ink-muted">Save a changed English draft to create translation jobs.</p> : <ul className="max-h-[36rem] space-y-3 overflow-auto">{jobs.map((job) => <li key={job.id} className="rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{LANGUAGES[job.targetLanguage] ?? job.targetLanguage} · {job.fieldPath}</span><Badge tone={STATUS_TONE[job.status] ?? 'neutral'}>{job.status.replaceAll('_', ' ').toLowerCase()}</Badge></div>
        <p className="mt-2 text-xs text-ink-muted">Source: {job.sourceText}</p>
        {job.status === 'WAITING_FOR_ENGINE' && <p className="mt-2 text-xs text-amber-800">Waiting for a benchmark-approved translation engine. No translation is being simulated.</p>}
        {job.lastError && <p className="mt-2 text-xs text-red-700">{job.lastError}</p>}
        {(job.status === 'NEEDS_REVIEW' || job.status === 'MACHINE_TRANSLATED') && <div className="mt-3 space-y-2"><Textarea aria-label={`Correct ${LANGUAGES[job.targetLanguage]} translation`} rows={2} value={drafts[job.id] ?? ''} onChange={(event) => setDrafts((previous) => ({ ...previous, [job.id]: event.target.value }))} /><Button size="sm" onClick={() => void approve(job)} disabled={!drafts[job.id]?.trim()}>Approve correction</Button></div>}
        {(job.status === 'FAILED' || job.status === 'VALIDATION_FAILED') && <Button size="sm" variant="outline" className="mt-3" onClick={() => void retry(job)}>Retry</Button>}
      </li>)}</ul>}
    </CardContent>
  </Card>;
}
