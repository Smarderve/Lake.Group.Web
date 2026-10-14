import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDb } from '../src/db.js';
import { TARGET_LANGUAGES, validateTranslationResult } from '../src/lib/cms-v2-translation.js';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const manifestDigest = (manifest) => sha256(JSON.stringify(manifest.entries.map(({ id, sourceHash }) => [id, sourceHash])));

/** Build only complete, approved per-page locale artifacts. The pointer swap is atomic. */
export async function createHardcodedTranslationRelease({ manifest, jobs, outputDirectory, allowFixturesForTests = false }) {
  if (manifest?.manifestType !== 'lake-group-hardcoded-translation-jobs' || manifest.schemaVersion !== 1) throw new Error('Unsupported source manifest.');
  if (!outputDirectory) throw new TypeError('An output directory is required.');
  const latestManifest = manifestDigest(manifest);
  const eligible = manifest.entries.filter((entry) => entry.classification === 'public-visitor-copy' || entry.classification === 'terminology-review' || entry.classification === 'runtime-ui-copy' && entry.applicablePages?.length);
  const byKey = new Map(jobs.map((job) => [`${job.contextKey}\0${job.targetLanguage}`, job]));
  const languages = {};
  for (const language of TARGET_LANGUAGES) {
    const pageGroups = new Map();
    let complete = eligible.length > 0;
    for (const entry of eligible) {
      const pages = entry.page ? [entry.page] : entry.applicablePages;
      const safeMode = ['text', 'runtime-text'].includes(entry.renderMode)
        || (['attribute', 'runtime-attribute'].includes(entry.renderMode) && ['alt', 'title', 'aria-label', 'placeholder', 'content'].includes(entry.targetAttribute));
      if (!Array.isArray(pages) || !pages.length || !safeMode || (entry.renderMode === 'text' || entry.renderMode === 'attribute') && !entry.targetSelector) { complete = false; break; }
      const job = byKey.get(`${entry.id}:${entry.context}\0${language}`);
      if (!job || job.status !== 'APPROVED' || job.manifestVersion !== latestManifest || job.sourceHash !== entry.sourceHash || job.sourceText !== entry.source) { complete = false; break; }
      const validation = validateTranslationResult(job, job.translation);
      if (!validation.valid || !job.modelVersion || /^fixture(?:-|$)/i.test(job.modelVersion) && !allowFixturesForTests) { complete = false; break; }
      for (const pageName of pages) {
        const page = pageGroups.get(pageName) || [];
        const identity = `${entry.renderMode}\0${entry.targetSelector || ''}\0${entry.targetAttribute || ''}\0${entry.source.replace(/\s+/g, ' ').trim()}`;
        if (page.some((row) => row.identity === identity)) { complete = false; break; }
        page.push({ id: entry.id, selector: entry.targetSelector, mode: entry.renderMode, attribute: entry.targetAttribute || null, source: entry.source, sourceHash: entry.sourceHash, translation: job.translation, identity });
        pageGroups.set(pageName, page);
      }
      if (!complete) break;
    }
    if (complete) languages[language] = Object.fromEntries([...pageGroups].map(([pageName, rows]) => [pageName, rows.map(({ identity, ...row }) => row)]));
  }
  const releaseBody = { schemaVersion: 1, manifestVersion: latestManifest, generatedAt: new Date().toISOString(), activeLanguages: ['en', ...Object.keys(languages)], languages };
  const releaseId = sha256(JSON.stringify(releaseBody)).slice(0, 24);
  const root = resolve(outputDirectory);
  const releaseDirectory = join(root, 'releases', releaseId);
  await mkdir(releaseDirectory, { recursive: true });
  for (const [language, pages] of Object.entries(languages)) {
    const asset = { schemaVersion: 1, releaseId, manifestVersion: latestManifest, language, pages };
    asset.integrity = `sha256-${createHash('sha256').update(JSON.stringify(asset)).digest('base64')}`;
    await writeFile(join(releaseDirectory, `${language}.json`), `${JSON.stringify(asset)}\n`, { flag: 'wx' }).catch(async (error) => {
      if (error.code !== 'EEXIST') throw error;
      const old = await readFile(join(releaseDirectory, `${language}.json`), 'utf8');
      if (old !== `${JSON.stringify(asset)}\n`) throw new Error('Immutable translation release collision.');
    });
  }
  const pointer = { schemaVersion: 1, releaseId, manifestVersion: latestManifest, activeLanguages: releaseBody.activeLanguages, files: Object.fromEntries(Object.keys(languages).map((language) => [language, `releases/${releaseId}/${language}.json`])) };
  await writeFile(join(releaseDirectory, 'current.json'), `${JSON.stringify(pointer)}\n`, { flag: 'wx' }).catch(async (error) => {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(join(releaseDirectory, 'current.json'), 'utf8') !== `${JSON.stringify(pointer)}\n`) throw new Error('Immutable translation pointer collision.');
  });
  const current = join(root, 'current.json');
  const temporary = join(root, `.current-${process.pid}-${Date.now()}.json`);
  await mkdir(dirname(current), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(pointer)}\n`, { flag: 'wx' });
  await rename(temporary, current);
  return pointer;
}

async function run() {
  const manifestPath = resolve(process.argv[2] || '../scripts/.generated/i18n-translation-manifest.json');
  const outputDirectory = resolve(process.argv[3] || '../assets/i18n-published');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const db = createDb(process.env.DATABASE_URL);
  if (!db) throw new Error('DATABASE_URL is required; no publication was made.');
  try {
    const jobs = await db.hardcodedTranslationJob.findMany({ where: { status: 'APPROVED', manifestVersion: manifestDigest(manifest) } });
    const pointer = await createHardcodedTranslationRelease({ manifest, jobs, outputDirectory });
    console.log(JSON.stringify({ releaseId: pointer.releaseId, activeLanguages: pointer.activeLanguages, publication: 'atomic-pointer', candidateTranslations: jobs.length }));
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
