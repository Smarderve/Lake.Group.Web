import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const extractionPath = resolve('scripts/.generated/i18n-extraction-queue.json');
const dictionaryPath = resolve('assets/i18n-content.json');
const outputPath = resolve('scripts/.generated/i18n-page-translation-coverage.json');
const locales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
const normalize = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');

export async function reportPageTranslationCoverage({ extractionFile = extractionPath, dictionaryFile = dictionaryPath, outputFile = outputPath } = {}) {
  const extraction = JSON.parse(await readFile(extractionFile, 'utf8'));
  const dictionary = JSON.parse(await readFile(dictionaryFile, 'utf8'));
  const pages = {};
  const remaining = [];
  const uniquePageSources = new Set();
  const uniqueKeyRefs = new Set();
  const uniqueTranslatedSources = Object.fromEntries(locales.map((locale) => [locale, new Set()]));
  const uniqueTranslatedKeys = Object.fromEntries(locales.map((locale) => [locale, new Set()]));
  const totals = Object.fromEntries(locales.map((locale) => [locale, { candidates: 0, translationAssets: 0, unchangedNeedsClassification: 0, missing: 0, keyedReferences: 0, keyedTranslated: 0, keyedMissing: 0, keyedSourceDrift: 0 }]));

  for (const page of Object.keys(extraction.scriptFilesByPage || {}).sort()) {
    const candidates = extraction.entries.filter((entry) => entry.page === page && ['public-visitor-copy', 'terminology-review'].includes(entry.classification));
    candidates.forEach((entry) => uniquePageSources.add(normalize(entry.source)));
    const localeCoverage = {};
    for (const locale of locales) {
      let draft = null;
      try { draft = JSON.parse(await readFile(resolve('scripts/i18n-drafts', locale, `${page}.json`), 'utf8')); } catch { /* locale page draft not authored */ }
      const rows = new Map((draft?.translations || []).map((row) => [`${row.id}\0${row.sourceHash}`, row]));
      const matched = [];
      let unchanged = 0;
      for (const entry of candidates) {
        const row = rows.get(`${entry.id}\0${entry.sourceHash}`);
        if (row?.translation?.trim() && normalize(row.translation) !== normalize(entry.source)) {
          matched.push(entry.id);
          uniqueTranslatedSources[locale].add(normalize(entry.source));
        } else if (row?.translation?.trim()) {
          unchanged += 1;
          remaining.push({ locale, page, id: entry.id, sourceHash: entry.sourceHash, source: entry.source, translation: row.translation, mode: entry.renderMode, selector: entry.targetSelector || null, attribute: entry.targetAttribute || null, classification: entry.classification, status: 'unchanged-source-needs-protection-review' });
        } else {
          remaining.push({ locale, page, id: entry.id, sourceHash: entry.sourceHash, source: entry.source, mode: entry.renderMode, selector: entry.targetSelector || null, attribute: entry.targetAttribute || null, classification: entry.classification, status: 'missing-draft-translation' });
        }
      }
      const refs = extraction.keyedRefs.filter((ref) => ref.page === page && dictionary.en?.[ref.key]);
      refs.forEach((ref) => uniqueKeyRefs.add(`${ref.page}\0${ref.key}`));
      let keyedTranslated = 0;
      let keyedSourceDrift = 0;
      for (const ref of refs) {
        const source = dictionary.en[ref.key];
        const translation = dictionary[locale]?.[ref.key];
        if (normalize(ref.rawText) !== normalize(source)) {
          keyedSourceDrift += 1;
          remaining.push({ locale, page, id: `dict.${ref.key}`, sourceHash: null, source, currentSource: ref.rawText, key: ref.key, mode: ref.attribute ? 'attribute' : 'keyed', attribute: ref.attribute || null, status: 'source-drift-requires-reconciliation' });
        } else if (typeof translation === 'string' && translation.trim() && normalize(translation) !== normalize(source)) {
          keyedTranslated += 1;
          uniqueTranslatedKeys[locale].add(`${ref.page}\0${ref.key}`);
        }
        else remaining.push({ locale, page, id: `dict.${ref.key}`, sourceHash: null, source, key: ref.key, mode: ref.attribute ? 'attribute' : 'keyed', attribute: ref.attribute || null, status: 'missing-dictionary-translation' });
      }
      const totalsForLocale = totals[locale];
      totalsForLocale.candidates += candidates.length;
      totalsForLocale.translationAssets += matched.length;
      totalsForLocale.unchangedNeedsClassification += unchanged;
      totalsForLocale.missing += candidates.length - matched.length - unchanged;
      totalsForLocale.keyedReferences += refs.length;
      totalsForLocale.keyedTranslated += keyedTranslated;
      totalsForLocale.keyedMissing += refs.length - keyedTranslated;
      totalsForLocale.keyedSourceDrift += keyedSourceDrift;
      localeCoverage[locale] = { extractedPageCandidates: candidates.length, pageDraftRows: matched.length, unchangedNeedsClassification: unchanged, missingPageDraftRows: candidates.length - matched.length - unchanged, keyedDictionaryReferences: refs.length, keyedTranslatedReferences: keyedTranslated, keyedMissingReferences: refs.length - keyedTranslated, keyedSourceDriftReferences: keyedSourceDrift };
    }
    pages[page] = localeCoverage;
  }

  for (const locale of locales) {
    totals[locale].distinctPageSources = uniquePageSources.size;
    totals[locale].distinctPageSourcesWithDraftAssets = uniqueTranslatedSources[locale].size;
    totals[locale].distinctKeyedEntries = uniqueKeyRefs.size;
    totals[locale].distinctKeyedEntriesTranslated = uniqueTranslatedKeys[locale].size;
  }
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), extractionGeneratedAt: extraction.generatedAt, languageCoverageStatus: 'EDITORIAL_DRAFTS_ONLY_NOT_PRODUCTION_APPROVED', localeTotals: totals, pages, remaining };
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  reportPageTranslationCoverage().then(({ localeTotals, remaining }) => console.log(JSON.stringify({ localeTotals, remainingStrings: remaining.length, output: 'scripts/.generated/i18n-page-translation-coverage.json' }, null, 2))).catch((error) => { console.error(error); process.exitCode = 1; });
}
