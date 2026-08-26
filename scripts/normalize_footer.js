#!/usr/bin/env node
/**
 * Synchronizes the canonical Phase 01 footer without touching navigation or
 * page content. Run from the repository root: node scripts/normalize_footer.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'scripts', 'templates', 'footer.html');
const FOOTER_STYLESHEET = '<link rel="stylesheet" href="assets/phase-01-footer.css">';
const FOOTER_OPEN_RE = /<footer\b[^>]*>/i;
const FOOTER_LAYOUTS = new Map([
  ['404.html', 'utility'],
  ['offline.html', 'utility'],
  ['our-story.html', 'immersive'],
]);

function extractBalanced(text, bodyStart, tag) {
  let depth = 1;
  let pos = bodyStart;
  const tagRe = new RegExp('<' + tag + '\\b|</' + tag + '>', 'gi');
  tagRe.lastIndex = pos;
  let match;
  while (depth > 0) {
    match = tagRe.exec(text);
    if (!match) return null;
    if (match[0].toLowerCase() === '</' + tag + '>') depth -= 1;
    else depth += 1;
    pos = tagRe.lastIndex;
  }
  return pos;
}

function replaceOrInsertFooter(raw, canonical, eol) {
  const first = FOOTER_OPEN_RE.exec(raw);
  if (!first) {
    const bodyClose = /<\/body>/i.exec(raw);
    if (!bodyClose) throw new Error('missing </body>');
    return raw.slice(0, bodyClose.index) + eol + canonical + eol + raw.slice(bodyClose.index);
  }

  const firstEnd = extractBalanced(raw, first.index + first[0].length, 'footer');
  if (firstEnd === null) throw new Error('unbalanced footer');
  let result = raw.slice(0, first.index) + canonical + raw.slice(firstEnd);

  // Remove any additional legacy footer blocks so each public URL has one.
  let scanFrom = first.index + canonical.length;
  let next = /<footer\b[^>]*>/i.exec(result.slice(scanFrom));
  while (next) {
    const nextStart = scanFrom + next.index;
    const nextEnd = extractBalanced(result, nextStart + next[0].length, 'footer');
    if (nextEnd === null) throw new Error('unbalanced additional footer');
    result = result.slice(0, nextStart) + result.slice(nextEnd);
    next = /<footer\b[^>]*>/i.exec(result.slice(scanFrom));
  }
  return result;
}

function ensureBodyMarker(raw, filename) {
  return raw.replace(/<body\b[^>]*>/i, (body) => {
    let marked = body;
    if (!/\bdata-shared-footer=/i.test(marked)) {
      marked = marked.slice(0, -1) + ' data-shared-footer="true">';
    }
    const layout = FOOTER_LAYOUTS.get(filename);
    if (layout && !/\bdata-footer-layout=/i.test(marked)) {
      marked = marked.slice(0, -1) + ' data-footer-layout="' + layout + '">';
    }
    return marked;
  });
}

function main() {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
  const files = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();
  let changed = 0;

  for (const filename of files) {
    const filePath = path.join(ROOT, filename);
    const original = fs.readFileSync(filePath, 'utf8');
    const eol = original.includes('\r\r\n') ? '\r\r\n' : '\r\n';
    const canonical = template.replace(/\n/g, eol);
    let raw = replaceOrInsertFooter(original, canonical, eol);
    raw = ensureBodyMarker(raw, filename);
    if (!raw.includes(FOOTER_STYLESHEET)) {
      raw = raw.replace(/<\/head>/i, '  ' + FOOTER_STYLESHEET + eol + '</head>');
    }
    if (raw === original) {
      console.log('already canonical: ' + filename);
      continue;
    }
    fs.writeFileSync(filePath, raw, 'utf8');
    changed += 1;
    console.log('normalized ' + filename);
  }
  console.log('\nDone. ' + changed + ' files updated.');
}

main();
