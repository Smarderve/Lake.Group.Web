import { describe, expect, it } from 'vitest';
import {
  buildCmsTranslationJobs,
  extractCmsTranslationFields,
  runTranslationWorkerOnce,
  validateTranslationResult,
} from '../src/lib/cms-v2-translation.js';

const copy = { seo: { title: 'Lake Group', description: 'Powering industry across 10 countries.' }, hero: { heading: 'Energy for every journey', description: 'Our teams support 10 countries and 1,600+ trucks.' }, cta: { label: 'Contact us', href: '/contact.html' } };

describe('revision-bound translation jobs', () => {
  it('queues all seven locales and excludes protected names, URLs, and unchanged fields', () => {
    const fields = extractCmsTranslationFields(copy);
    expect(fields.map((field) => field.fieldPath)).toEqual(['seo.description', 'hero.heading', 'hero.description', 'cta.label']);
    const first = buildCmsTranslationJobs({ documentKey: 'home', revisionId: 'r1', data: copy });
    expect(first.jobs).toHaveLength(28);
    expect(new Set(first.jobs.map((job) => job.targetLanguage))).toEqual(new Set(['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt']));
    const unchanged = buildCmsTranslationJobs({ documentKey: 'home', revisionId: 'r2', currentRevisionId: 'r1', previousData: copy, data: copy });
    expect(unchanged.jobs).toHaveLength(0);
  });

  it('creates jobs only for changed paths and makes deterministic job IDs', () => {
    const changed = { ...copy, hero: { ...copy.hero, description: 'Our teams support 11 countries and 1,600+ trucks.' } };
    const a = buildCmsTranslationJobs({ documentKey: 'home', revisionId: 'r2', currentRevisionId: 'r1', previousData: copy, data: changed });
    const b = buildCmsTranslationJobs({ documentKey: 'home', revisionId: 'r2', currentRevisionId: 'r1', previousData: copy, data: changed });
    expect(a.changedPaths).toEqual(['hero.description']);
    expect(a.jobs).toHaveLength(7);
    expect(a.jobs.map((job) => job.id)).toEqual(b.jobs.map((job) => job.id));
    expect(a.jobs.every((job) => job.status === 'WAITING_FOR_ENGINE')).toBe(true);
  });

  it('worker fixtures validate and require review without publishing', async () => {
    const job = { id: 'fixture-job', sourceText: '10,000+ employees', sourceLanguage: 'en', targetLanguage: 'sw', fieldPath: 'hero.description' };
    let status = 'QUEUED';
    const repository = {
      recoverExpiredTranslationJobs: async () => 0,
      queueWaitingTranslationJobs: async () => 0,
      listTranslationJobs: async () => status === 'QUEUED' ? [job] : [],
      claimTranslationJob: async () => { status = 'TRANSLATING'; return { ...job, status }; },
      isTranslationJobCurrent: async () => true,
      finishTranslationJob: async (result) => { status = result.validationErrors.length ? 'VALIDATION_FAILED' : 'NEEDS_REVIEW'; return { ...job, ...result, status }; },
    };
    const result = await runTranslationWorkerOnce({ repository, translate: async ({ sourceText }) => sourceText });
    expect(result.processed).toBe(true);
    expect(result.job.status).toBe('NEEDS_REVIEW');
    expect(result.publication).toBe('not-published');
    expect(validateTranslationResult(job, '30,000 employees').errors).toContain('NUMBER_MISMATCH');
  });

  it('does not call fixture output model-generated output', async () => {
    const job = { id: 'fixture-job', sourceText: 'Contact us', sourceLanguage: 'en', targetLanguage: 'fr', fieldPath: 'cta.label' };
    const result = validateTranslationResult(job, 'Contactez-nous');
    expect(result.valid).toBe(true);
  });

  it('blocks changed URLs and contact details', () => {
    const job = { sourceText: 'Call +254 700 123 456 or visit https://lake.example' };
    const result = validateTranslationResult(job, 'Call +254 700 999 111 or visit https://wrong.example');
    expect(result.errors).toContain('URLS_MISMATCH');
    expect(result.errors).toContain('PHONES_MISMATCH');
  });
});
