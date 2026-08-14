#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ENTITY_ROUTES = [
  'metrics',
  'companies',
  'countries',
  'regions',
  'locations',
  'facilities',
  'categories',
  'product-services',
  'company-relationships',
  'pages',
  'content-blocks',
  'news',
  'projects',
  'leadership',
  'contacts',
  'history-events',
  'career-listings',
  'csr-entries',
  'map-categories',
  'media',
];

function parseArgs(argv) {
  const options = {
    apiBase: process.env.LAKE_PUBLIC_API_BASE || 'http://127.0.0.1:4000',
    output: path.resolve('public-content'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--api-base') options.apiBase = argv[++index];
    else if (argv[index] === '--output') options.output = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  options.apiBase = String(options.apiBase || '').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(options.apiBase)) throw new Error('--api-base must be an HTTP(S) origin');
  return options;
}

async function getJson(apiBase, route) {
  const response = await fetch(`${apiBase}/api/public/${route}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${route} returned HTTP ${response.status}`);
  return response.json();
}

function firstArray(payload, route) {
  const value = Object.values(payload || {}).find(Array.isArray);
  if (!Array.isArray(value)) throw new Error(`${route} did not return an array response`);
  return value;
}

function validatePayload(payload) {
  if (payload.schemaVersion !== 1) throw new Error('Unsupported snapshot schema');
  for (const route of ENTITY_ROUTES) {
    if (!Array.isArray(payload.entities[route])) throw new Error(`Missing entity collection: ${route}`);
  }
  if (payload.entities.companies.length === 0) throw new Error('Snapshot cannot publish without companies');
  if (payload.entities.metrics.length === 0) throw new Error('Snapshot cannot publish without metrics');
  if (!payload.map || !Array.isArray(payload.map.countries) || payload.map.countries.length === 0) {
    throw new Error('Snapshot cannot publish without operations-map countries');
  }
  if (!payload.knowledge || !Array.isArray(payload.knowledge.facts)) {
    throw new Error('Snapshot knowledge bundle is invalid');
  }
  const inspectMediaReferences = (value, key = '') => {
    if (Array.isArray(value)) {
      value.forEach((item) => inspectMediaReferences(item, key));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([childKey, child]) => inspectMediaReferences(child, childKey));
      return;
    }
    if (typeof value !== 'string' || !/(url|image|logo|photo|media)/i.test(key)) return;
    if (/\/(?:api\/)?(?:admin|auth)(?:\/|$)/i.test(value)) {
      throw new Error(`Public media cannot depend on an authenticated CMS route: ${value}`);
    }
  };
  inspectMediaReferences(payload);
}

async function buildPayload(apiBase) {
  const entries = await Promise.all(
    ENTITY_ROUTES.map(async (route) => [route, firstArray(await getJson(apiBase, route), route)]),
  );
  const [map, knowledge] = await Promise.all([
    getJson(apiBase, 'map'),
    getJson(apiBase, 'knowledge/facts'),
  ]);
  const payload = {
    schemaVersion: 1,
    entities: Object.fromEntries(entries),
    map,
    knowledge: { facts: knowledge.facts || [] },
  };
  validatePayload(payload);
  return payload;
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function publishSnapshot({ apiBase, output }) {
  const payload = await buildPayload(apiBase);
  const payloadJson = JSON.stringify(payload);
  const digest = crypto.createHash('sha256').update(payloadJson).digest('hex');
  const releaseId = digest.slice(0, 20);
  const integrity = `sha256-${digest}`;
  const generatedAt = new Date().toISOString();
  const releasesDir = path.join(output, 'releases');
  const releaseDir = path.join(releasesDir, releaseId);
  const temporaryRelease = path.join(releasesDir, `.tmp-${releaseId}-${process.pid}`);

  fs.mkdirSync(releasesDir, { recursive: true });
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(temporaryRelease);
    writeJson(path.join(temporaryRelease, 'content.json'), {
      releaseId,
      generatedAt,
      integrity,
      ...payload,
    });
    const check = JSON.parse(fs.readFileSync(path.join(temporaryRelease, 'content.json'), 'utf8'));
    validatePayload(check);
    fs.renameSync(temporaryRelease, releaseDir);
  }

  const manifest = {
    schemaVersion: 1,
    releaseId,
    generatedAt,
    integrity,
    snapshotUrl: `releases/${releaseId}/content.json`,
  };
  const temporaryManifest = path.join(output, `.current-${process.pid}.json`);
  writeJson(temporaryManifest, manifest);
  fs.renameSync(temporaryManifest, path.join(output, 'current.json'));
  return manifest;
}

if (require.main === module) {
  publishSnapshot(parseArgs(process.argv.slice(2)))
    .then((manifest) => {
      console.log(`Published public snapshot ${manifest.releaseId} (${manifest.integrity})`);
    })
    .catch((error) => {
      console.error(`Public snapshot failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  ENTITY_ROUTES,
  buildPayload,
  parseArgs,
  publishSnapshot,
  validatePayload,
};
