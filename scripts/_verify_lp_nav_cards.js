#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const files = fs.readdirSync(ROOT).filter((f) => /^leadership-.+\.html$/.test(f));
let ok = true;
for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const m = h.match(/<nav class="lp-nav"[\s\S]*?<\/nav>/);
  const cards = m ? (m[0].match(/ld-person-card/g) || []).length : 0;
  const hasAll = /lp-nav-all/.test(h) && /leadership\.58/.test(h);
  const oldDiv = /<div class="lp-nav">/.test(h);
  const plain = /←\s*<span data-i18n/.test(h) || />\s*→<\/a>/.test(h);
  const hasSum = m ? (m[0].match(/ld-person-sum/g) || []).length : 0;
  const hasMore = m ? (m[0].match(/ld-person-more/g) || []).length : 0;
  console.log(
    f,
    'cards=' + cards,
    'sums=' + hasSum,
    'more=' + hasMore,
    'all=' + hasAll,
    'oldDiv=' + oldDiv,
    'plain=' + plain
  );
  if (cards !== 2 || hasSum !== 2 || hasMore !== 2 || !hasAll || oldDiv || plain) ok = false;
}
process.exit(ok ? 0 : 1);
