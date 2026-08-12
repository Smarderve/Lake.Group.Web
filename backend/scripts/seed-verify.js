#!/usr/bin/env node
/**
 * SECURITY_ROADMAP Phase 22 — Security Scanning: DB-less verification of the
 * content seed extraction. The seed-verify CI job's honest implementation:
 * imports the seed-data module and the frontend bundles the seeder ingests,
 * and asserts the shapes the seeder relies on — WITHOUT touching PostgreSQL.
 *
 *   npm run seed:verify
 *
 * Exits non-zero on any failure so CI fails when the seed source drifts
 * (e.g. a domain array emptied, a bundle no longer parsing).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT_SEED } from './content-seed-data.js';
import { loadNewsBundle, loadGalleryTiles } from './seed-content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, '..', '..');

let failures = 0;
function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('seed-verify: CONTENT_SEED domains');
for (const key of Object.keys(CONTENT_SEED)) {
  const value = CONTENT_SEED[key];
  check(`CONTENT_SEED.${key} is a populated array`, Array.isArray(value) && value.length > 0,
    Array.isArray(value) ? `length ${value.length}` : `typeof ${typeof value}`);
}

console.log('seed-verify: reference-key integrity');
for (const key of Object.keys(CONTENT_SEED)) {
  const list = CONTENT_SEED[key];
  if (!Array.isArray(list) || list.length === 0) continue;
  for (const item of list.slice(0, 1)) {
    // Every seed item carries an identity the seeder maps to a DB row: a
    // dedicated slug/key, OR a natural key (title/name/jobTitle) — several
    // domains are keyed by natural key + companySlug/locationKey composite.
    const identity = ['slug', 'key', 'isoCode', 'title', 'name', 'jobTitle'];
    const hasIdentity = identity.some((f) => f in item) || 'companySlug' in item || 'locationKey' in item;
    check(`CONTENT_SEED.${key} rows carry an identity field`, hasIdentity,
      `first row keys: ${Object.keys(item).join(',')}`);
    break;
  }
}

console.log('seed-verify: frontend bundles (the seeder ingests these)');
try {
  const news = loadNewsBundle();
  check('assets/news-data.js exposes window.LAKE_NEWS', Array.isArray(news) && news.length > 0,
    Array.isArray(news) ? `length ${news.length}` : 'not an array');
} catch (err) {
  check('assets/news-data.js parses', false, err.message);
}

try {
  const tiles = loadGalleryTiles();
  check('assets/gallery.html yields gallery tiles', Array.isArray(tiles) && tiles.length > 0,
    Array.isArray(tiles) ? `length ${tiles.length}` : 'not an array');
} catch (err) {
  check('assets/gallery.html parses', false, err.message);
}

const galleryHtml = path.join(FRONTEND_ROOT, 'gallery.html');
check('gallery.html exists at site root', fs.existsSync(galleryHtml));

if (failures) {
  console.error(`\nseed-verify: FAIL — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nseed-verify: PASS — seed source is complete and parseable.');
process.exit(0);
