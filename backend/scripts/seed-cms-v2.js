#!/usr/bin/env node
import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { createDb } from '../src/db.js';
import { createCmsV2ReleaseStorage } from '../src/lib/cms-v2-release-storage.js';
import { createCmsV2RuntimeService } from '../src/lib/cms-v2-runtime-service.js';
import { buildCmsV2SeedDataset, seedCmsV2Documents } from '../src/lib/cms-v2-seed.js';
import { CMS_V2_PAGE_DEFINITIONS } from '../src/lib/cms-v2-content.js';
import { createDefaultComposition } from '../src/lib/cms-v2-components.js';

export async function runCmsV2Seed({ db = createDb(process.env.DATABASE_URL) } = {}) {
  if (!db) throw new Error('DATABASE_URL is not set; CMS V2 seed data was validated but database execution is deferred.');
  const dataset = await buildCmsV2SeedDataset();
  for (const page of CMS_V2_PAGE_DEFINITIONS) dataset[page.key].composition ??= createDefaultComposition(page.label, dataset[page.key]);
  const service = createCmsV2RuntimeService({ db, storage: createCmsV2ReleaseStorage({ root: '../public-content' }) });
  return seedCmsV2Documents({ service, dataset });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCmsV2Seed().then((result) => { console.log(`CMS V2 seed: imported=${result.imported} unchanged=${result.unchanged} failed=${result.failed}`); }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
