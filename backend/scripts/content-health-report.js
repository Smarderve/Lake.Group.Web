#!/usr/bin/env node
/**
 * Phase 10 — Content Health / Data Quality dashboard (CLI).
 *
 * Runs the full health-report engine against the real PostgreSQL and prints
 * the dashboard: per-domain quality scores (0–100) and every check —
 * stale facts, missing verification/sources, conflicting statistics, broken
 * links, missing translations/SEO, unused media and top unanswered questions.
 *
 * Usage:  npm run health:report   (from backend/)
 *         node scripts/content-health-report.js
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../src/db.js';
import { buildHealthReport } from '../src/lib/content-health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..'); // the static site root
const I18N_PATH = path.join(REPO_ROOT, 'assets', 'i18n-content.js');

const line = (char = '─') => console.log(char.repeat(72));

function scoreCell(v) {
  if (v === null) return '—';
  const color = v >= 90 ? '\x1b[32m' : v >= 70 ? '\x1b[33m' : '\x1b[31m';
  return `${color}${v}\x1b[0m`;
}

async function main() {
  const db = createDb();
  if (!db) {
    console.error('DATABASE_URL is not set — copy .env.example to .env first.');
    process.exit(1);
  }
  try {
    console.log('Lake Group · Content Health / Data Quality report\n');
    const report = await buildHealthReport(db, {
      repoRoot: REPO_ROOT,
      i18nPath: I18N_PATH,
      staleDays: Number(process.env.METRIC_STALE_DAYS) || 180,
      checkExternal: process.env.LAKE_CHECK_EXTERNAL_LINKS === 'true',
    });

    const { scores, checks } = report;
    console.log(`Generated: ${report.generatedAt}   (stale window: ${report.staleDays} days)`);
    line();
    console.log('QUALITY SCORES');
    for (const [domain, value] of Object.entries(scores)) {
      if (domain === 'overall') continue;
      console.log(`  ${domain.padEnd(8)} ${scoreCell(value).padStart(10)}  / 100`);
    }
    console.log(`  OVERALL  ${scoreCell(scores.overall).padStart(10)}  / 100`);
    line();

    const m = checks.metrics;
    console.log(`METRICS (${m.total})`);
    console.log(`  stale: ${m.stale.current} current, ${m.stale.dueSoon.length} due soon, ${m.stale.overdue.length} overdue`);
    if (m.stale.dueSoon.length) console.log(`    due soon: ${m.stale.dueSoon.map((x) => x.key).join(', ')}`);
    if (m.stale.overdue.length) console.log(`    overdue: ${m.stale.overdue.map((x) => x.key).join(', ')}`);
    console.log(`  missing verification: ${m.missingVerification.length}  ${m.missingVerification.map((x) => x.key).join(', ')}`);
    console.log(`  missing source: ${m.missingSource.length}  ${m.missingSource.map((x) => x.key).join(', ')}`);
    if (m.conflicts.length) {
      console.log('  CONFLICTS (value changed across published history):');
      for (const c of m.conflicts) console.log(`    ${c.key}: now "${c.currentValue}", was ${JSON.stringify(c.previousValues)}`);
    }
    line();

    const links = checks.links;
    console.log(`LINKS (${links.internal.checked} internal, ${links.external.checked} external)`);
    if (links.internal.missing.length) {
      console.log(`  MISSING internal assets (${links.internal.missing.length}):`);
      for (const u of links.internal.missing.slice(0, 10)) console.log(`    ${u.kind} ${u.value} (${u.owner})`);
    } else console.log('  internal assets: all present');
    if (links.external.invalid.length) {
      console.log(`  INVALID external URLs (${links.external.invalid.length}):`);
      for (const u of links.external.invalid.slice(0, 10)) console.log(`    ${u.kind} ${u.value}`);
    }
    if (links.external.unreachable.length) {
      console.log(`  UNREACHABLE external (${links.external.unreachable.length}) — enabled with LAKE_CHECK_EXTERNAL_LINKS=true`);
    }
    line();

    if (checks.i18n) {
      const i = checks.i18n;
      console.log(`TRANSLATIONS (${i.languages.join(', ')}) — ${i.enKeys} en keys`);
      for (const lang of i.languages.filter((l) => l !== 'en')) {
        console.log(`  ${lang}: ${(i.missing[lang] || []).length} missing, ${(i.empty[lang] || []).length} empty`);
        const keys = [...(i.missing[lang] || []).slice(0, 6)];
        if (keys.length) console.log(`    e.g. ${keys.join(', ')}`);
      }
      line();
    }

    const seo = checks.seo;
    console.log(`SEO (${seo.pages.checked} pages, ${seo.news.checked} news items)`);
    if (seo.pages.missingTitle.length) console.log(`  pages missing <title>: ${seo.pages.missingTitle.join(', ')}`);
    if (seo.pages.missingDescription.length) console.log(`  pages missing meta description: ${seo.pages.missingDescription.join(', ')}`);
    if (seo.pages.missingLang.length) console.log(`  pages missing lang: ${seo.pages.missingLang.join(', ')}`);
    if (seo.news.missingMeta.length) {
      console.log(`  news missing SEO meta (${seo.news.missingMeta.length}):`);
      for (const n of seo.news.missingMeta.slice(0, 8)) console.log(`    ${n.slug} — missingTitle:${n.missingTitle} missingDescription:${n.missingDescription}`);
    } else console.log('  all published news carry meta title + description');
    line();

    const media = checks.media;
    console.log(`MEDIA (${media.total} rows, ${media.referenced} referenced)`);
    if (media.unused.length) {
      console.log(`  UNUSED (${media.unused.length}):`);
      for (const u of media.unused.slice(0, 10)) console.log(`    ${u.url} ${u.caption ? '— ' + u.caption : ''}`);
    } else console.log('  no orphaned media');
    line();

    const faq = checks.faq;
    console.log(`UNANSWERED QUESTIONS (${faq.total} total, ${faq.open} open)`);
    if (faq.top.length) {
      console.log('  most frequent:');
      for (const t of faq.top) console.log(`    x${t.count}  ${t.question}`);
    } else console.log('  none recorded yet');
    line();
  } finally {
    await db.$disconnect().catch(() => {});
  }
}

main();
