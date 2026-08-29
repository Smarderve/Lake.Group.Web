#!/usr/bin/env node
/**
 * Seed the initial published corporate metrics (Phase 3 — Corporate Truth).
 *
 * This onboards the *existing* truth (already live on the website) directly
 * as PUBLISHED — it deliberately bypasses the workflow, which exists for
 * future *changes*. Every later change must go through
 * DRAFT → IN_REVIEW → APPROVED → PUBLISHED via the API.
 *
 * Values follow the verified-facts dataset (scripts/_verified_lake_facts.md)
 * and the Phase 0 audit (docs/PHASE-0-AUDIT.md). Figures that are NOT
 * externally verifiable (e.g. the "20+ subsidiaries" claim) are seeded with
 * verificationStatus UNVERIFIED and a note — never silently "corrected".
 *
 * Usage:
 *   npm run seed:metrics              # create if missing, never overwrite
 *   npm run seed:metrics -- --force   # overwrite an existing metric
 */
import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { createDb } from '../src/db.js';
import { writeAudit } from '../src/lib/audit.js';

/**
 * Canonical corporate metrics. Exported so tests can assert the facts
 * dataset without a database (see tests/seed-data.test.js).
 *
 * NOTE (Task 8.1): the Employees value is 30,000+ — the official about-page
 * figure used across the live site. The earlier seed value 4,600+ came from
 * the stale assets/i18n-content.js.bak (audit Task 0.1 marks it OLD); the
 * Phase 0 audit and verified-facts dataset both use 30,000+.
 */
export const SEEDS = [
  {
    key: 'employees',
    label: 'Employees',
    value: '30,000+',
    unit: 'employees',
    source:
      'Official about page (lakeoilgroup.com) — "Workforce 30,000+ employees, 21 nationalities" (scripts/_verified_lake_facts.md); used sitewide on index, about, our-story, careers, africa-network.',
    verificationStatus: 'VERIFIED',
    verificationDate: new Date(),
    verificationNote:
      'Canonical figure per the Phase 0 audit (Task 0.1) and _verified_lake_facts.md. The old 4,600+ only existed in assets/i18n-content.js.bak (stale backup).',
    effectiveDate: new Date(),
    consumers: [
      'index.html · hero keyfacts (#metric-employees), hero sub, about section',
      'about.html · story-stats + OSE ending stat',
      'our-story.html · scene 6 + ending stats',
      'careers.html · headline stat',
      'africa-network.html · KB copy',
    ],
    status: 'PUBLISHED',
  },
  {
    key: 'trucks',
    label: 'Trucks',
    value: '1,600+',
    unit: 'trucks',
    source:
      'Official about page — group fleet "1,600+ trucks" (site source of truth, 2026; scripts/_verified_lake_facts.md).',
    verificationStatus: 'VERIFIED',
    verificationDate: new Date(),
    verificationNote:
      'Sitewide figure (index, about, our-story, services, sustainability, africa-network). Older 700+ / 750 figures exist only in stale backups.',
    effectiveDate: new Date(),
    consumers: [
      'index.html · hero keyfacts + hero sub',
      'about.html · story-stats + OSE ending stat',
      'our-story.html · ending stats',
      'services.html · Lake Trans row',
      'sustainability.html · fleet efficiency copy',
      'africa-network.html · stats band',
    ],
    status: 'PUBLISHED',
  },
  {
    key: 'stations',
    label: 'Fuel Stations',
    value: '152',
    unit: 'fuel stations',
    source:
      'Official site stats — "152 fuel stations (group source of truth, 2026)" (scripts/_verified_lake_facts.md).',
    verificationStatus: 'VERIFIED',
    verificationDate: new Date(),
    verificationNote:
      'Group-wide station count used on index, about, our-story and station-locator. Per-country breakdown still pending client refresh.',
    effectiveDate: new Date(),
    consumers: [
      'index.html · hero keyfacts',
      'about.html · OSE ending stat',
      'our-story.html · ending stats',
      'station-locator.html · heading + footer note',
      'lake-oil.html · operations copy',
    ],
    status: 'PUBLISHED',
  },
  {
    key: 'countries',
    label: 'Countries',
    value: '10',
    unit: 'countries',
    source:
      'Official about/home pages — "operating across 10 countries" (Tanzania, Kenya, Zambia, DR Congo, Rwanda, Burundi, Ethiopia, Mozambique, Uganda + UAE presence; scripts/_verified_lake_facts.md, assistant-kb fact:countries).',
    verificationStatus: 'VERIFIED',
    verificationDate: new Date(),
    verificationNote:
      'Canonical "10". The audit flagged residual 9/8 values (index keyfacts "9", our-story ending "8", about "8") — those now hydrate from this published value.',
    effectiveDate: new Date(),
    consumers: [
      'index.html · hero keyfacts + hero sub',
      'about.html · story copy + story-stats',
      'our-story.html · scene 7 + ending stats',
      'careers.html · headline copy',
      'africa-network.html · intro copy',
    ],
    status: 'PUBLISHED',
  },
  {
    key: 'nationalities',
    label: 'Nationalities',
    value: '21',
    unit: 'nationalities',
    source:
      'Official about page — "a diverse mix of 21 nationalities" (scripts/_verified_lake_facts.md).',
    verificationStatus: 'VERIFIED',
    verificationDate: new Date(),
    verificationNote: 'Sitewide figure (about, careers, index, our-story).',
    effectiveDate: new Date(),
    consumers: [
      'index.html · about section copy',
      'about.html · story copy',
      'our-story.html · scene 6 copy',
      'careers.html · headline copy',
    ],
    status: 'PUBLISHED',
  },
  {
    key: 'subsidiaries',
    label: 'Subsidiaries',
    value: '18+',
    unit: 'subsidiaries',
    source:
      'about.html story-stats + africa-network.html stats band ("18+"). The index "20+" and services "17" claims are not externally verifiable.',
    verificationStatus: 'UNVERIFIED',
    verificationDate: null,
    verificationNote:
      'The Phase 0 audit flags subsidiaries as 20+ / 18+ / 17 by page. "18+" is the about/africa-network figure; NOT confirmed externally — confirm the canonical count with the client before relying on this.',
    effectiveDate: new Date(),
    consumers: [
      'about.html · story-stats',
      'africa-network.html · stats band',
      'index.html · about section copy ("20+") — conflicts, pending client confirmation',
    ],
    status: 'PUBLISHED',
  },
];

async function main() {
  const db = createDb(process.env.DATABASE_URL);
  if (!db) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill in your connection string.');
    process.exit(1);
  }

  const force = process.argv.includes('--force');

  try {
    for (const seed of SEEDS) {
      const existing = await db.metric.findUnique({ where: { key: seed.key } });
      if (existing && !force) {
        console.log(`Metric "${seed.key}" already exists (value=${existing.value}, status=${existing.status}) — skipping. Use --force to overwrite.`);
        continue;
      }

      const metric = await db.metric.upsert({
        where: { key: seed.key },
        update: { ...seed },
        create: { ...seed },
      });

      await db.metricVersion.create({
        data: {
          metricId: metric.id,
          value: metric.value,
          status: 'PUBLISHED',
          changedBy: null,
          reason: 'Initial seed of the canonical value from the verified-facts dataset',
        },
      });

      await writeAudit(db, {
        actorId: null,
        action: 'METRIC_PUBLISHED',
        resource: 'seed/metrics',
        ip: null,
        metadata: {
          metricKey: metric.key,
          metricId: metric.id,
          previousValue: null,
          newValue: metric.value,
          fromStatus: null,
          toStatus: 'PUBLISHED',
          reason: 'Initial seed (system)',
        },
      });

      console.log(`Metric ready: ${metric.key} = ${metric.value} (${metric.status})`);
    }
  } finally {
    await db.$disconnect();
  }
}

/* Run only when invoked directly (node scripts/seed-metrics.js), so tests can
   import { SEEDS } without touching a database. */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
