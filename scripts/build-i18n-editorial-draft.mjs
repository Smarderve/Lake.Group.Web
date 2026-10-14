import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateTranslationResult } from '../backend/src/lib/cms-v2-translation.js';

const MANIFEST_PATH = resolve('scripts/.generated/i18n-translation-manifest.json');
const DICTIONARY_PATH = resolve('assets/i18n-content.json');
const OUTPUT_PATH = resolve('scripts/i18n-drafts/sw/index.html.json');

// New copy is deliberately stored as an AI-authored draft. The manual rows
// preserve proper names, standards, facts, and source structure for review.
const authored = {
  'Lake Group is a diversified business group with operations across energy, manufacturing, logistics, real estate, agro processing and automotive sectors.': 'Lake Group ni kundi la biashara lenye shughuli katika sekta za nishati, utengenezaji, lojistiki, mali isiyohamishika, uchakataji wa mazao ya kilimo na magari.',
  'NexDrive Motors': 'NexDrive Motors',
  'Language: English': 'Lugha: Kiswahili',
  English: 'Kiswahili',
  Kiswahili: 'Kiswahili',
  'हिन्दी': 'हिन्दी',
  'العربية': 'العربية',
  '简体中文': '简体中文',
  'Français': 'Français',
  'Español': 'Español',
  'Português': 'Português',
  'Close menu': 'Funga menyu',
  Energies: 'Nishati',
  'Lake Energies fuel station': 'Kituo cha mafuta cha Lake Energies',
  'Tanzania flag': 'Bendera ya Tanzania',
  'Kenya flag': 'Bendera ya Kenya',
  'Zambia flag': 'Bendera ya Zambia',
  'Lake Lubes Power Eco lubricant products': 'Bidhaa za vilainishi za Power Eco za Lake Lubes',
  'Lake Steel & Allied Products Limited manufactures TBS-certified TMT reinforcement steel bars conforming to BS 500, with a 25T/hr computerized rolling mill.': 'Lake Steel & Allied Products Limited hutengeneza nondo za chuma za TMT zinazothibitishwa na TBS na zinazokidhi kiwango cha BS 500, kwa kutumia mtambo wa kuviringisha chuma unaotumia kompyuta wenye uwezo wa tani 25 kwa saa.',
  'Mozambique flag': 'Bendera ya Msumbiji',
  Chat: 'Zungumza',
  'Rwanda flag': 'Bendera ya Rwanda',
  'Burundi flag': 'Bendera ya Burundi',
  'DR Congo': 'Jamhuri ya Kidemokrasia ya Kongo',
  'DR Congo flag': 'Bendera ya Jamhuri ya Kidemokrasia ya Kongo',
  'Ethiopia flag': 'Bendera ya Ethiopia',
  Uganda: 'Uganda',
  'Uganda flag': 'Bendera ya Uganda',
  'UAE flag': 'Bendera ya UAE',
  '© 2026 Lake Group.': '© 2026 Lake Group.',
};

const normalize = (text) => String(text ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
const digest = (value) => createHash('sha256').update(value).digest('hex');

async function buildEditorialDraft({ manifestPath = MANIFEST_PATH, dictionaryPath = DICTIONARY_PATH, outputPath = OUTPUT_PATH } = {}) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const dictionary = JSON.parse(await readFile(dictionaryPath, 'utf8'));
  const dictionaryKeysBySource = new Map();
  for (const [key, source] of Object.entries(dictionary.en || {})) {
    const normalized = normalize(source);
    if (!normalized) continue;
    const keys = dictionaryKeysBySource.get(normalized) || [];
    keys.push(key);
    dictionaryKeysBySource.set(normalized, keys);
  }

  const candidates = manifest.entries.filter((entry) => entry.page === 'index.html' && ['public-visitor-copy', 'terminology-review'].includes(entry.classification));
  if (!candidates.length) throw new Error('No homepage visitor-copy rows were found in the current extraction manifest.');
  const rows = candidates.map((entry) => {
    const matchingKeys = dictionaryKeysBySource.get(normalize(entry.source)) || [];
    let translation;
    let origin;
    if (matchingKeys.length) {
      const preferredKey = entry.source === 'CSR & Sustainability' && /nav\.site-nav|footer/i.test(entry.context)
        ? 'nav.csr'
        : entry.source === 'Our History' && /nav\.site-nav|footer/i.test(entry.context) ? 'nav.history' : matchingKeys[0];
      const key = matchingKeys.includes(preferredKey) ? preferredKey : matchingKeys[0];
      translation = dictionary.sw?.[key];
      origin = `existing-dictionary:${key}`;
    } else {
      translation = authored[entry.source];
      origin = 'ai-authored-draft';
    }
    if (typeof translation !== 'string' || !translation.trim()) throw new Error(`Missing Kiswahili draft for ${entry.id}: ${entry.source}`);
    if (!['text', 'attribute', 'runtime-text', 'runtime-attribute'].includes(entry.renderMode)) throw new Error(`Unsupported homepage mode ${entry.renderMode} for ${entry.id}.`);
    if (entry.renderMode === 'attribute' && !['alt', 'title', 'aria-label', 'placeholder', 'content'].includes(entry.targetAttribute)) throw new Error(`Unsupported homepage attribute for ${entry.id}.`);
    const validation = validateTranslationResult({ sourceText: entry.source }, translation);
    if (!validation.valid) throw new Error(`${entry.id} failed protected-content validation: ${validation.errors.join(', ')}`);
    return {
      id: entry.id, sourceHash: entry.sourceHash, source: entry.source,
      translation, mode: entry.renderMode, selector: entry.targetSelector || null,
      attribute: entry.targetAttribute || null, origin,
    };
  });

  const sourceManifestDigest = digest(JSON.stringify(manifest.entries.map(({ id, sourceHash }) => [id, sourceHash])));
  const draft = {
    schemaVersion: 1,
    status: 'DRAFT_PENDING_HUMAN_REVIEW',
    locale: 'sw',
    page: 'index.html',
    sourceManifestDigest,
    sourceManifestGeneratedAt: manifest.generatedAt,
    createdAt: new Date().toISOString(),
    authoringMethod: 'AI-authored and existing dictionary reuse; not machine-model output',
    reviewEvidence: null,
    releaseEligible: false,
    candidateCount: candidates.length,
    translatedCount: rows.length,
    validation: 'protected numbers, names, URLs, placeholders and markup passed; linguistic review remains required',
    translations: rows,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(draft, null, 2)}\n`);
  return draft;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildEditorialDraft().then((draft) => console.log(JSON.stringify({ output: OUTPUT_PATH, locale: draft.locale, page: draft.page, candidates: draft.candidateCount, translated: draft.translatedCount, status: draft.status, releaseEligible: draft.releaseEligible })))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}

export { buildEditorialDraft };
