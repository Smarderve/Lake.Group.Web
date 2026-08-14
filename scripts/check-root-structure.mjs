#!/usr/bin/env node
/**
 * check-root-structure.mjs
 *
 * Lightweight repository check (Plan Phase 26): compares the repository root
 * against an approved list and reports unexpected files with a suggested
 * destination. Informational by default; pass --strict to exit non-zero when
 * unexpected files are found (e.g. in CI).
 *
 * Usage:
 *   node scripts/check-root-structure.mjs            # report only
 *   node scripts/check-root-structure.mjs --strict   # exit 1 on unexpected files
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');

// Approved root entries. Directories are matched by name; files by name.
// Anything else is reported. Keep this list current when a new root file is
// intentionally added (e.g. a new public HTML page).
const APPROVED = new Set([
  // configuration / build
  'package.json',
  'package-lock.json',
  '.gitignore',
  '.env.local',
  'vercel.json',
  'lighthouserc.json',
  'skills-lock.json',
  'README.md',
  'AGENTS.md',
  // web root
  'sw.js',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'favicon.ico',
  '404.html',
  'offline.html',
  // public HTML pages (each is a public URL — add new pages here)
  'index.html',
  'about.html',
  'history.html',
  'our-story.html',
  'contact.html',
  'services.html',
  'projects.html',
  'news.html',
  'news-article.html',
  'media-center.html',
  'gallery.html',
  'sustainability.html',
  'careers.html',
  'csr.html',
  'investors.html',
  'leadership.html',
  'leadership-ally-edha-awadh.html',
  'leadership-bibhuti-singh.html',
  'leadership-biji-lapat.html',
  'leadership-dileep-kumar.html',
  'leadership-juma-nuru.html',
  'leadership-mohammed-khalid.html',
  'leadership-sridhar-mani.html',
  'lake-agro.html',
  'lake-aviation.html',
  'lake-buildings.html',
  'lake-cylinders.html',
  'lake-gas.html',
  'lake-lubes.html',
  'lake-oil.html',
  'lake-plastics.html',
  'lake-premix-cement.html',
  'lake-steel.html',
  'lake-trans.html',
  'atl.html',
  'aill.html',
  'acfs.html',
  'aficd.html',
  'africa-network.html',
  'cross-country.html',
  'fleet.html',
  'gulf-aggregates.html',
  'ocean-galleria.html',
  'station-locator.html',
  'dashboard.html',
  'lake-group-financial-dashboard.html',
  'lake-group-org-chart.html',
  'assembly-tech.html',
  'agrinova-tech.html',
  'nextdrive-motors.html',
  // directories
  '.git',
  '.agents',
  '.claude',
  '.freebuff',
  '.github',
  '.vercel',
  'assets',
  'backend',
  'cms',
  'docs',
  'lake-3d',
  'lake-story-assets',
  'node_modules',
  'public-content',
  'scripts',
  'tests',
  'archive',
]);

const SUGGEST = {
  '.md': 'docs/ (design → docs/design/, qa → docs/qa/, reports → docs/reports/, project → docs/project/)',
  '.docx': 'docs/reference/company/ unless a public download (then public-content/)',
  '.pptx': 'docs/reference/company/ unless a public download (then public-content/)',
  '.pdf': 'docs/development/ or docs/reference/',
  '.png': 'assets/images/ (QA artifacts → docs/qa/)',
  '.jpg': 'assets/images/',
  '.js': 'scripts/ (one-off probes keep the leading _)',
  '.mjs': 'scripts/',
  '.json': 'config stays at root only if tooling requires it; otherwise docs/ or assets/',
  '.css': 'assets/',
  '.svg': 'assets/icons/ or assets/images/',
  '.txt': 'docs/',
  '.webmanifest': 'root (web root, must stay)',
  '.zip': 'docs/reference/ or archive/',
  '.rar': 'docs/reference/ or archive/',
  '.mp4': 'public-content/media/ or assets/media/',
  '.exe': 'NOT part of the repo — do not commit installers',
};

function main() {
  let entries;
  try {
    entries = fs.readdirSync(ROOT, { withFileTypes: true });
  } catch (err) {
    console.error(`ROOT STRUCTURE CHECK — cannot read root: ${err.message}`);
    process.exit(1);
  }

  const unexpected = [];
  for (const e of entries) {
    const name = e.name;
    if (APPROVED.has(name)) continue;
    const kind = e.isDirectory() ? 'directory' : 'file';
    const ext = path.extname(name).toLowerCase();
    const suggest = SUGGEST[ext] || (kind === 'directory' ? 'review whether this directory belongs to the project' : 'review before keeping at root');
    unexpected.push({ name, kind, suggest });
  }

  console.log('ROOT STRUCTURE CHECK');
  console.log('====================');
  const tracked = entries.filter((e) => APPROVED.has(e.name));
  console.log(`✓ ${tracked.length} approved root entries`);
  if (unexpected.length === 0) {
    console.log('✓ No unexpected root files.');
  } else {
    console.log(`⚠ ${unexpected.length} unexpected root ${unexpected.length === 1 ? 'entry' : 'entries'}:`);
    for (const u of unexpected) {
      console.log(`   ${u.name}  (${u.kind})`);
      console.log(`     suggested: ${u.suggest}`);
    }
  }
  console.log('====================');
  if (strict && unexpected.length > 0) {
    console.error('FAIL: unexpected root entries (--strict)');
    process.exit(1);
  }
}

main();
