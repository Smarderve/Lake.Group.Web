'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'scripts', 'templates', 'footer.html'), 'utf8');
const CANONICAL_FOOTER = normalize(TEMPLATE);
const CANONICAL_SOCIAL_HREFS = socialHrefs(CANONICAL_FOOTER);
const REQUIRED_STYLESHEET = '<link rel="stylesheet" href="assets/phase-01-footer.css">';
const UTILITY_LAYOUTS = new Map([
  ['404.html', 'utility'],
  ['offline.html', 'utility'],
  ['our-story.html', 'immersive'],
]);

function normalize(value) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function extractBalanced(text, start, tag) {
  let depth = 1;
  const re = new RegExp('<' + tag + '\\b|</' + tag + '>', 'gi');
  re.lastIndex = start;
  let match;
  while (depth > 0) {
    match = re.exec(text);
    if (!match) return null;
    depth += match[0].toLowerCase() === '</' + tag + '>' ? -1 : 1;
  }
  return re.lastIndex;
}

function footersIn(source) {
  const footers = [];
  const open = /<footer\b[^>]*>/gi;
  let match;
  while ((match = open.exec(source))) {
    const end = extractBalanced(source, match.index + match[0].length, 'footer');
    assert.notEqual(end, null, 'footer must have a closing tag');
    footers.push(source.slice(match.index, end));
    open.lastIndex = end;
  }
  return footers;
}

function socialHrefs(footer) {
  return [...footer.matchAll(/<a\s+href="([^"]+)"\s+class="social-link"/g)].map((match) => match[1]);
}

function rootHtmlFiles() {
  return fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();
}

test('canonical footer template preserves the approved Lake composition', () => {
  assert.match(CANONICAL_FOOTER, /^<footer class="site-footer" role="contentinfo">/);
  assert.match(CANONICAL_FOOTER, /assets\/images\/logos\/LAKE_LOGO_LAKE_ONLY\.png/);
  assert.doesNotMatch(CANONICAL_FOOTER, /LAKE_GROUP_LOGO\.(?:png|jpg)/);
  assert.equal((CANONICAL_FOOTER.match(/class="footer-col"/g) || []).length, 4);
  assert.deepEqual(CANONICAL_SOCIAL_HREFS, [
    'https://www.linkedin.com/company/lake-oil',
    'https://www.facebook.com/lakeoilgroup',
    'https://twitter.com/lakeoilgroup',
    'https://www.youtube.com/@lakeoilgroup',
    'https://www.instagram.com/lakeoilltd/',
    'https://www.tiktok.com/@lakeoilgroup',
    'https://wa.me/255222780510',
  ]);
  assert.equal((CANONICAL_FOOTER.match(/class="footer-social-ico"/g) || []).length, 7);
});

test('every root public HTML page uses exactly the canonical footer', () => {
  const files = rootHtmlFiles();
  assert.equal(files.length, 56, 'the public root URL inventory changed; review the footer normalizer');

  for (const filename of files) {
    const source = fs.readFileSync(path.join(ROOT, filename), 'utf8');
    const footers = footersIn(source);
    assert.equal(footers.length, 1, filename + ' must contain exactly one footer');
    assert.equal(normalize(footers[0]), CANONICAL_FOOTER, filename + ' footer differs from the canonical template');
    assert.ok(source.includes(REQUIRED_STYLESHEET), filename + ' must load the shared footer stylesheet');
    assert.match(source, /<body\b[^>]*\bdata-shared-footer="true"[^>]*>/i, filename + ' must opt into shared footer layout');
  }
});

test('footer brand, social set, and legacy footers cannot diverge by page', () => {
  for (const filename of rootHtmlFiles()) {
    const source = fs.readFileSync(path.join(ROOT, filename), 'utf8');
    const footer = footersIn(source)[0];
    assert.equal((footer.match(/LAKE_LOGO_LAKE_ONLY\.png/g) || []).length, 1, filename + ' must have the Lake-only logo once');
    assert.deepEqual(socialHrefs(footer), CANONICAL_SOCIAL_HREFS, filename + ' social links differ');
    assert.equal((footer.match(/class="footer-social-ico"/g) || []).length, 7, filename + ' social icons differ');
    assert.doesNotMatch(source, /xs-footer-sec|footer-main|footer-area/i, filename + ' retains a legacy unique footer');
  }
});

test('utility and immersive pages retain their explicit document-flow footer layout', () => {
  for (const [filename, layout] of UTILITY_LAYOUTS) {
    const source = fs.readFileSync(path.join(ROOT, filename), 'utf8');
    assert.match(source, new RegExp('<body\\b[^>]*\\bdata-footer-layout="' + layout + '"[^>]*>', 'i'));
  }
});
