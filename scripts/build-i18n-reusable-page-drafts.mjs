import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateTranslationResult } from '../backend/src/lib/cms-v2-translation.js';

const root = process.cwd();
const manifestPath = resolve('scripts/.generated/i18n-translation-manifest.json');
const dictionaryPath = resolve('assets/i18n-content.json');
const draftsRoot = resolve('scripts/i18n-drafts');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const normalize = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
const locales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];

function hasUncommittedPageContent(page) {
  try {
    const committed = execFileSync('git', ['show', `HEAD:${page}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const working = readFileSync(resolve(page), 'utf8');
    const normalizeCacheRefs = (value) => value.replace(/\r\n/g, '\n').replace(/i18n\.js\?v=[0-9-]+/g, 'i18n.js?v=<release>');
    return normalizeCacheRefs(committed) !== normalizeCacheRefs(working);
  } catch { return false; }
}

function dictionaryTranslations(dictionary, locale) {
  const bySource = new Map();
  for (const [key, source] of Object.entries(dictionary.en || {})) {
    const translation = dictionary[locale]?.[key];
    if (typeof translation !== 'string' || !translation.trim()) continue;
    const normalized = normalize(source);
    const candidates = bySource.get(normalized) || [];
    candidates.push({ key, translation });
    bySource.set(normalized, candidates);
  }
  const safe = new Map();
  for (const [source, candidates] of bySource) {
    const unique = [...new Set(candidates.map(({ translation }) => translation))];
    // Avoid context-ambiguous dictionary reuse rather than choosing arbitrarily.
    if (unique.length === 1) safe.set(source, candidates[0]);
  }
  return safe;
}

function runtimeRow(entry, translation, origin) {
  const mode = entry.renderMode === 'runtime-text' ? 'runtime-text'
    : entry.renderMode === 'runtime-attribute' ? 'runtime-attribute'
      : entry.renderMode;
  return {
    id: entry.id,
    sourceHash: entry.sourceHash,
    source: entry.source,
    translation,
    mode,
    selector: entry.targetSelector || null,
    attribute: entry.targetAttribute || null,
    origin,
  };
}

export async function buildReusablePageDrafts({ manifestPath: inputManifest = manifestPath, dictionaryPath: inputDictionary = dictionaryPath, draftsRoot: inputDraftsRoot = draftsRoot } = {}) {
  const manifest = JSON.parse(await readFile(inputManifest, 'utf8'));
  const dictionary = JSON.parse(await readFile(inputDictionary, 'utf8'));
  const pageNames = [...new Set(manifest.entries.filter((entry) => entry.page).map((entry) => entry.page))].sort();
  const report = {};

  for (const locale of locales) {
    const sourceMap = dictionaryTranslations(dictionary, locale);
    report[locale] = {};
    for (const page of pageNames) {
      const candidates = manifest.entries.filter((entry) => entry.page === page && ['public-visitor-copy', 'terminology-review'].includes(entry.classification));
      if (hasUncommittedPageContent(page)) {
        report[locale][page] = { skipped: 'uncommitted page content preserved', candidates: candidates.length, translated: 0 };
        continue;
      }
      const outputPath = resolve(inputDraftsRoot, locale, `${page}.json`);
      let previous = null;
      try { previous = JSON.parse(await readFile(outputPath, 'utf8')); } catch { /* new draft */ }
      if (previous && (previous.status !== 'DRAFT_PENDING_HUMAN_REVIEW' || previous.releaseEligible !== false)) {
        report[locale][page] = { skipped: 'non-draft editorial status', candidates: candidates.length, translated: previous.translations?.length || 0 };
        continue;
      }

      const byId = new Map();
      for (const row of previous?.translations || []) {
        const current = candidates.find((entry) => entry.id === row.id && entry.sourceHash === row.sourceHash && entry.source === row.source);
        const sameAsSource = current && normalize(row.translation) === normalize(current.source);
        if (current && !(row.origin?.startsWith('existing-dictionary:') && sameAsSource)) byId.set(row.id, row);
      }
      let reused = 0;
      let rejected = 0;
      for (const entry of candidates) {
        if (byId.has(entry.id)) continue;
        const match = sourceMap.get(normalize(entry.source));
        if (!match) continue;
        if (normalize(match.translation) === normalize(entry.source)) continue;
        const validation = validateTranslationResult({ sourceText: entry.source }, match.translation);
        if (!validation.valid) { rejected += 1; continue; }
        byId.set(entry.id, runtimeRow(entry, match.translation, `existing-dictionary:${match.key}`));
        reused += 1;
      }

      const rows = candidates.map((entry) => byId.get(entry.id)).filter(Boolean);
      if (rows.length) {
        const sourceManifestDigest = digest(JSON.stringify(manifest.entries.map(({ id, sourceHash }) => [id, sourceHash])));
        const draft = {
          ...(previous || {}),
          schemaVersion: 1,
          status: 'DRAFT_PENDING_HUMAN_REVIEW',
          locale,
          page,
          sourceManifestDigest,
          sourceManifestGeneratedAt: manifest.generatedAt,
          createdAt: previous?.createdAt || new Date().toISOString(),
          authoringMethod: previous?.authoringMethod || 'existing dictionary reuse; no model output for generated rows',
          reviewEvidence: null,
          releaseEligible: false,
          candidateCount: candidates.length,
          translatedCount: rows.length,
          validation: 'structural validation passed for reused dictionary rows; linguistic review remains required',
          translations: rows,
        };
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(draft, null, 2)}\n`);
      }
      report[locale][page] = { candidates: candidates.length, translated: rows.length, reused, rejected, missing: candidates.length - rows.length };
    }
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildReusablePageDrafts().then((report) => {
    const totals = Object.fromEntries(locales.map((locale) => [locale, Object.values(report[locale]).reduce((sum, page) => ({ candidates: sum.candidates + (page.candidates || 0), translated: sum.translated + (page.translated || 0), reused: sum.reused + (page.reused || 0), rejected: sum.rejected + (page.rejected || 0) }), { candidates: 0, translated: 0, reused: 0, rejected: 0 })]));
    console.log(JSON.stringify(totals, null, 2));
  }).catch((error) => { console.error(error); process.exitCode = 1; });
}
