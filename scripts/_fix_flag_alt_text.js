#!/usr/bin/env node
/**
 * Fix flag icon alt text across all HTML files.
 * 
 * Replaces empty alt="" on flag icons with descriptive alt text
 * like "Tanzania flag", "Kenya flag", etc.
 * 
 * Usage:
 *   node scripts/_fix_flag_alt_text.js              # Dry run (show what would change)
 *   node scripts/_fix_flag_alt_text.js --apply      # Apply changes
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

// Flag mapping: filename -> country name
const FLAG_MAP = {
  'tz.svg': 'Tanzania flag',
  'ke.svg': 'Kenya flag',
  'zm.svg': 'Zambia flag',
  'rw.svg': 'Rwanda flag',
  'bi.svg': 'Burundi flag',
  'cd.svg': 'DR Congo flag',
  'et.svg': 'Ethiopia flag',
  'mz.svg': 'Mozambique flag',
  'ug.svg': 'Uganda flag',
  'ng.svg': 'Nigeria flag',
  'gh.svg': 'Ghana flag',
  'za.svg': 'South Africa flag',
  'eg.svg': 'Egypt flag',
  'ae.svg': 'UAE flag',
};

// Pattern: <img src="assets/images/flags/XX.svg" alt="" class="flag-icon"
const FLAG_IMG_REGEX = /(<img\s+src="assets\/images\/flags\/(\w+)\.svg"\s+alt="")/g;

function fixFlagAlt(content) {
  let changes = 0;
  const fixed = content.replace(FLAG_IMG_REGEX, (match, fullMatch, countryCode) => {
    const altText = FLAG_MAP[countryCode + '.svg'];
    if (altText) {
      changes++;
      return `<img src="assets/images/flags/${countryCode}.svg" alt="${altText}"`;
    }
    return match;
  });
  return { content: fixed, changes };
}

// Find all HTML files
const htmlFiles = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(ROOT, f));

let totalFiles = 0;
let totalChanges = 0;

console.log(`\n🔧 Fix flag icon alt text (${APPLY ? 'apply' : 'dry run'} mode)\n`);

for (const filePath of htmlFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = fixFlagAlt(content);
  
  if (result.changes > 0) {
    const relativePath = path.relative(ROOT, filePath);
    console.log(`  ${relativePath}: ${result.changes} flag icons`);
    totalFiles++;
    totalChanges += result.changes;
    
    if (APPLY) {
      fs.writeFileSync(filePath, result.content, 'utf8');
    }
  }
}

console.log(`\n📊 Summary: ${totalChanges} flag icons across ${totalFiles} files`);
if (!APPLY) {
  console.log(`\n💡 Run with --apply to apply changes`);
}
