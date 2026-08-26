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

function ensureBodyMarker(raw) {
  return raw.replace(/<body\b[^>]*>/i, (body) => {
    const withoutMarkers = body
      .replace(/\sdata-shared-footer=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\sdata-footer-layout=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return withoutMarkers.slice(0, -1) + ' data-shared-footer="true">';
  });
}

function ensureStylesheet(raw, eol) {
  const headMatch = /<head\b[^>]*>[\s\S]*?<\/head>/i.exec(raw);
  if (!headMatch) throw new Error('missing <head>');
  const canonicalHead = headMatch[0]
    .replace(/[ \t]*<link\b(?=[^>]*\bhref=(?:"assets\/phase-01-footer\.css"|'assets\/phase-01-footer\.css'))[^>]*>\r?\n?/gi, '')
    .replace(/<\/head>/i, '  ' + FOOTER_STYLESHEET + eol + '</head>');
  return raw.slice(0, headMatch.index) + canonicalHead + raw.slice(headMatch.index + headMatch[0].length);
}

function detectEol(raw) {
  const crlf = (raw.match(/\r\n/g) || []).length;
  const lf = (raw.match(/(?<!\r)\n/g) || []).length;
  return crlf >= lf && crlf > 0 ? '\r\n' : '\n';
}

function main() {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/, '');
  const files = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();
  let changed = 0;

  for (const filename of files) {
    const filePath = path.join(ROOT, filename);
    const original = fs.readFileSync(filePath, 'utf8');
    const eol = detectEol(original);
    const canonical = template.replace(/\n/g, eol);
    let raw = replaceOrInsertFooter(original, canonical, eol);
    raw = ensureBodyMarker(raw);
    raw = ensureStylesheet(raw, eol);
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
