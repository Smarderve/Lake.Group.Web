import { createHash } from 'node:crypto';
import { glossaryForLanguage, PROTECTED_TERMS, TRANSLATION_GLOSSARY_VERSION } from './translation-glossary.js';

export const TARGET_LANGUAGES = Object.freeze(['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt']);
export const TRANSLATION_JOB_STATUSES = Object.freeze([
  'WAITING_FOR_ENGINE', 'QUEUED', 'TRANSLATING', 'MACHINE_TRANSLATED',
  'VALIDATION_FAILED', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED', 'OUTDATED', 'FAILED',
]);

const COPY_FIELDS = new Set(['heading', 'description', 'body', 'label', 'alt', 'title', 'quote', 'caption', 'mission', 'vision', 'value']);
const PROTECTED_BRANDS = new Set(PROTECTED_TERMS);
const NON_COPY = /^(?:\d[\d\s.,%/+\-:$€£#]*|https?:\/\/\S+|mailto:\S+|tel:\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})$/;
const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

export function extractCmsTranslationFields(value) {
  const fields = [];
  function walk(node, path = []) {
    if (Array.isArray(node)) { node.forEach((child, index) => walk(child, [...path, String(index)])); return; }
    if (!node || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) {
      const next = [...path, key];
      if (typeof child === 'string' && COPY_FIELDS.has(key) && child.trim().length > 1 && !NON_COPY.test(child.trim()) && !PROTECTED_BRANDS.has(child.trim())) {
        fields.push({ fieldPath: next.join('.'), sourceText: child.trim(), sourceHash: sha256(child.trim()) });
      } else if (child && typeof child === 'object') walk(child, next);
    }
  }
  walk(value);
  return fields;
}

export function buildCmsTranslationJobs({ documentKey, revisionId, currentRevisionId = null, previousData = null, data, createdAt = new Date().toISOString() }) {
  const previous = new Map(extractCmsTranslationFields(previousData).map((field) => [field.fieldPath, field.sourceHash]));
  const current = extractCmsTranslationFields(data);
  const changedFields = current.filter((field) => previous.get(field.fieldPath) !== field.sourceHash);
  const removedPaths = [...previous.keys()].filter((fieldPath) => !current.some((field) => field.fieldPath === fieldPath));
  const changedPaths = [...new Set([...changedFields.map((field) => field.fieldPath), ...removedPaths])];
  const jobs = changedFields.flatMap((field) => TARGET_LANGUAGES.map((targetLanguage) => ({
    id: `tr_${sha256(`${documentKey}\0${revisionId}\0${field.fieldPath}\0${field.sourceHash}\0${targetLanguage}`).slice(0, 40)}`,
    documentKey, revisionId, sourceLanguage: 'en', targetLanguage,
    fieldPath: field.fieldPath, contextKey: `${documentKey}:${field.fieldPath}`, sourceText: field.sourceText, sourceHash: field.sourceHash,
    status: 'WAITING_FOR_ENGINE', attempts: 0, createdAt: new Date(createdAt), updatedAt: new Date(createdAt),
  })));
  return { jobs, changedPaths, previousRevisionId: currentRevisionId };
}

export function validateTranslationResult(job, translation) {
  const errors = [];
  if (typeof translation !== 'string') return { valid: false, errors: ['TRANSLATION_NOT_STRING'] };
  const sourceNumbers = [...job.sourceText.matchAll(/\d[\d,.]*(?:%|\+)?/g)].map((m) => m[0].replace(/,/g, '')).sort();
  const translatedNumbers = [...String(translation).matchAll(/\d[\d,.]*(?:%|\+)?/g)].map((m) => m[0].replace(/,/g, '')).sort();
  if (JSON.stringify(sourceNumbers) !== JSON.stringify(translatedNumbers)) errors.push('NUMBER_MISMATCH');
  const protectedValues = (value) => ({
    urls: [...String(value).matchAll(/(?:https?:\/\/|mailto:|tel:)[^\s"'<>]+/gi)].map((match) => match[0].replace(/[),.;]+$/, '')).sort(),
    emails: [...String(value).matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)].map((match) => match[0]).sort(),
    phones: [...String(value).matchAll(/(?:\+?\d[\d ()-]{6,}\d)/g)].map((match) => match[0].replace(/[ ()-]/g, '')).sort(),
  });
  const sourceProtected = protectedValues(job.sourceText);
  const translatedProtected = protectedValues(translation);
  for (const key of Object.keys(sourceProtected)) if (JSON.stringify(sourceProtected[key]) !== JSON.stringify(translatedProtected[key])) errors.push(`${key.toUpperCase()}_MISMATCH`);
  for (const brand of PROTECTED_BRANDS) {
    if (job.sourceText.includes(brand) && !String(translation).includes(brand)) errors.push(`PROTECTED_BRAND_MISSING:${brand}`);
  }
  if (!String(translation).trim()) errors.push('EMPTY_TRANSLATION');
  const sourceTags = [...job.sourceText.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)].map((m) => `${m[0].startsWith('</') ? '/' : ''}${m[1].toLowerCase()}`).sort();
  const translatedTags = [...String(translation).matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)].map((m) => `${m[0].startsWith('</') ? '/' : ''}${m[1].toLowerCase()}`).sort();
  if (JSON.stringify(sourceTags) !== JSON.stringify(translatedTags)) errors.push('MARKUP_MISMATCH');
  const placeholders = (text) => [...String(text).matchAll(/\{\{?\s*[\w.-]+\s*\}?\}|%\d*\$?[sdif]|\$\{[^}]+\}/g)].map((m) => m[0]).sort();
  if (JSON.stringify(placeholders(job.sourceText)) !== JSON.stringify(placeholders(translation))) errors.push('PLACEHOLDER_MISMATCH');
  return { valid: errors.length === 0, errors };
}

/** Engine-independent worker contract. Provider implementations are injected;
 * fixtures belong in tests and can never be confused with stored model output. */
export async function runTranslationWorkerOnce({ repository, translate, leaseMs = 120000 } = {}) {
  if (!repository || typeof translate !== 'function') throw new TypeError('A repository and configured translation provider are required.');
  await repository.recoverExpiredTranslationJobs({ engineAvailable: true });
  await repository.queueWaitingTranslationJobs();
  const [candidate] = await repository.listTranslationJobs({ status: 'QUEUED', limit: 1 });
  if (!candidate) return { processed: false, reason: 'queue-empty' };
  const job = await repository.claimTranslationJob(candidate.id, leaseMs);
  if (!job) return { processed: false, reason: 'claimed-elsewhere' };
  try {
    const output = await translate({ sourceText: job.sourceText, sourceLanguage: job.sourceLanguage, targetLanguage: job.targetLanguage, fieldPath: job.fieldPath, contextKey: job.contextKey, glossary: glossaryForLanguage(job.targetLanguage) });
    const translation = typeof output === 'string' ? output : output?.translation;
    const check = validateTranslationResult(job, translation);
    const stillCurrent = await repository.isTranslationJobCurrent(job.id);
    const completed = await repository.finishTranslationJob({ id: job.id, translation, modelVersion: typeof output === 'string' ? null : output?.modelVersion ?? null, glossaryVersion: typeof output === 'string' ? TRANSLATION_GLOSSARY_VERSION : output?.glossaryVersion ?? TRANSLATION_GLOSSARY_VERSION, validationErrors: check.errors, stillCurrent });
    return { processed: true, job: completed, validation: check, publication: 'not-published' };
  } catch (error) {
    const failed = await repository.finishTranslationJob({ id: job.id, failure: error?.code || 'TRANSLATION_PROVIDER_FAILED' });
    return { processed: true, job: failed, publication: 'not-published' };
  }
}
