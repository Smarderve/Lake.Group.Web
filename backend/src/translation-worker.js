import { createDb } from './db.js';
import { createCmsV2PrismaRepository } from './lib/cms-v2-prisma-repository.js';
import { createHardcodedTranslationRepository } from './lib/hardcoded-translation-repository.js';
import { runTranslationWorkerOnce } from './lib/cms-v2-translation.js';
import { createOfflineProcessAdapter, inspectTranslationResources } from './lib/translation-engine-adapter.js';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const pollMs = Math.max(1000, Number(process.env.LAKE_TRANSLATION_POLL_MS || 10000));
const db = createDb(process.env.DATABASE_URL_RUNTIME || process.env.DATABASE_URL);
if (!db) throw new Error('Translation worker requires the private PostgreSQL runtime connection.');
const repository = createCmsV2PrismaRepository(db);
const hardcodedRepository = createHardcodedTranslationRepository(db);
const manifestPath = resolve(process.env.LAKE_TRANSLATION_MANIFEST || fileURLToPath(new URL('../../scripts/.generated/i18n-translation-manifest.json', import.meta.url)));
let syncedManifestVersion = null;
const manifestDigest = (manifest) => createHash('sha256').update(JSON.stringify(manifest.entries.map(({ id, sourceHash }) => [id, sourceHash]))).digest('hex');
async function syncHardcodedManifest() {
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  const version = manifestDigest(manifest);
  if (version === syncedManifestVersion) return;
  await hardcodedRepository.syncHardcodedTranslationManifest(manifest);
  syncedManifestVersion = version;
}
async function readEngineConfig() {
  const path = process.env.LAKE_TRANSLATION_CONFIG || (process.env.ProgramData ? join(process.env.ProgramData, 'Lake Group', 'Translation', 'config', 'engine.json') : null);
  if (!path) return {};
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return {}; }
}
let stopping = false;
let timer;
let active = Promise.resolve();

async function tick() {
  if (stopping) return;
  await syncHardcodedManifest();
  const engine = await readEngineConfig();
  const policy = { minFreeMemoryBytes: engine.minimumFreeMemoryBytes, minFreeDiskBytes: engine.minimumFreeDiskBytes };
  const resources = await inspectTranslationResources({ modelPath: engine.modelPath, policy });
  // Missing engine/model/resource capacity keeps jobs durable and waiting.
  if (!resources.ready || !engine.executable) {
    await repository.recoverExpiredTranslationJobs({ engineAvailable: false });
    return;
  }
  const translate = createOfflineProcessAdapter({ executable: engine.executable, modelPath: engine.modelPath, resourcePolicy: policy });
  await runTranslationWorkerOnce({ repository, translate, leaseMs: Number(process.env.LAKE_TRANSLATION_LEASE_MS || 180000) });
  await runTranslationWorkerOnce({ repository: hardcodedRepository, translate, leaseMs: Number(process.env.LAKE_TRANSLATION_LEASE_MS || 180000) });
}

function schedule() {
  if (stopping) return;
  timer = setTimeout(() => {
    active = tick().catch(() => { /* No CMS text or provider output in worker logs. */ }).finally(schedule);
  }, pollMs);
}

function shutdown() {
  stopping = true;
  clearTimeout(timer);
  void active.finally(async () => { await db.$disconnect(); process.exit(0); });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
schedule();
