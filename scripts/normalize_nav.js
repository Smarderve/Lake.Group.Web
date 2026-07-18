#!/usr/bin/env node
/**
 * Node port of normalize_nav.py, for environments without a Python
 * interpreter available. Keeps identical behavior: replaces the nav,
 * mobile-nav, footer, and chat-widget blocks on every root *.html page
 * with the canonical versions from scripts/templates/, plus the same two
 * misc bug-fixes (stray i18n-content.js script tag, duplicated
 * data-i18n-placeholder attribute).
 *
 * Run from repo root: node scripts/normalize_nav.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TPL_DIR = path.join(ROOT, 'scripts', 'templates');

function readTpl(name) {
  let content = fs.readFileSync(path.join(TPL_DIR, name), 'utf8');
  content = content.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  return content;
}

function extractBalanced(text, bodyStart, tag) {
  let depth = 1;
  let pos = bodyStart;
  const tagRe = new RegExp('<' + tag + '\\b|</' + tag + '>', 'g');
  const closeTag = '</' + tag + '>';
  tagRe.lastIndex = pos;
  let m;
  while (depth > 0) {
    m = tagRe.exec(text);
    if (!m) return null;
    if (m[0] === closeTag) depth -= 1;
    else depth += 1;
    pos = tagRe.lastIndex;
  }
  return pos;
}

function replaceSimpleBlock(raw, openMarker, closeMarker, canonical) {
  const start = raw.indexOf(openMarker);
  if (start === -1) return [raw, false];
  const closeIdx = raw.indexOf(closeMarker, start);
  if (closeIdx === -1) return [raw, false];
  const end = closeIdx + closeMarker.length;
  const slice = raw.slice(start, end);
  if (slice === canonical) return [raw, false];
  return [raw.slice(0, start) + canonical + raw.slice(end), true];
}

function replaceBalancedBlock(raw, openRe, canonical, tag) {
  const m = openRe.exec(raw);
  if (!m) return [raw, false];
  const start = m.index;
  const bodyStart = m.index + m[0].length;
  const end = extractBalanced(raw, bodyStart, tag);
  if (end === null) return [raw, false];
  const slice = raw.slice(start, end);
  if (slice === canonical) return [raw, false];
  return [raw.slice(0, start) + canonical + raw.slice(end), true];
}

function fixMiscBugs(raw) {
  let changed = false;
  const brokenScriptRe = /[ \t]*<script src="assets\/i18n-content\.js"><\/script>[ \t]*\r?\n?/g;
  let newRaw = raw.replace(brokenScriptRe, '');
  if (newRaw !== raw) { raw = newRaw; changed = true; }
  const dupRe = /(\sdata-i18n-placeholder="chat\.placeholder")(?:\s*data-i18n-placeholder="chat\.placeholder")+/g;
  newRaw = raw.replace(dupRe, '$1');
  if (newRaw !== raw) { raw = newRaw; changed = true; }
  return [raw, changed];
}

function main() {
  const canonicalNav = readTpl('nav.html');
  const canonicalMobile = readTpl('mobile_nav.html');
  const canonicalFooter = readTpl('footer.html');
  const canonicalChat = readTpl('chat_widget.html');

  const NAV_OPEN = '<nav class="site-nav">';
  const MOBILE_OPEN_RE = /<div class="nav-mobile" id="nav-mobile"[^>]*>/;
  const FOOTER_OPEN = '<footer class="site-footer">';
  const CHAT_OPEN_RE = /<div id="chat-widget">/;

  let changedFiles = 0;
  const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
  for (const fn of files) {
    const filePath = path.join(ROOT, fn);
    let raw = fs.readFileSync(filePath, 'utf8');
    let anyChange = false;
    let c;

    [raw, c] = replaceSimpleBlock(raw, NAV_OPEN, '</nav>', canonicalNav);
    anyChange = anyChange || c;

    [raw, c] = replaceBalancedBlock(raw, MOBILE_OPEN_RE, canonicalMobile, 'div');
    anyChange = anyChange || c;

    [raw, c] = replaceSimpleBlock(raw, FOOTER_OPEN, '</footer>', canonicalFooter);
    anyChange = anyChange || c;

    [raw, c] = replaceBalancedBlock(raw, CHAT_OPEN_RE, canonicalChat, 'div');
    anyChange = anyChange || c;

    [raw, c] = fixMiscBugs(raw);
    anyChange = anyChange || c;

    if (anyChange) {
      fs.writeFileSync(filePath, raw, 'utf8');
      changedFiles += 1;
      console.log('normalized ' + fn);
    } else {
      console.log('already canonical / no chrome found: ' + fn);
    }
  }
  console.log('\nDone. ' + changedFiles + ' files updated.');
}

main();
