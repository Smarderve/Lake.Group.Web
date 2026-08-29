'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'scripts', 'templates', 'footer.html'), 'utf8');
const CANONICAL_FOOTER = normalize(TEMPLATE);
const APPROVED_TEMPLATE_SHA256 = 'b95741e34c20b6125ed537aab19f6df0c934cbba0f3c71e55181d2412a4e4798';
const CANONICAL_SOCIAL_HREFS = socialHrefs(CANONICAL_FOOTER);
const REQUIRED_STYLESHEET = '<link rel="stylesheet" href="assets/phase-01-footer.css">';
const FOOTER_CSS = fs.readFileSync(path.join(ROOT, 'assets', 'phase-01-footer.css'), 'utf8');

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function head(source) {
  return /<head\b[^>]*>[\s\S]*?<\/head>/i.exec(source)?.[0] || '';
}

test('canonical footer template preserves the approved Lake composition', () => {
  assert.equal(sha256(CANONICAL_FOOTER), APPROVED_TEMPLATE_SHA256, 'approved footer template changed; update through review');
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
  assert.equal((CANONICAL_FOOTER.match(/class="footer-contact-ico"/g) || []).length, 4);
  assert.doesNotMatch(CANONICAL_FOOTER, /<iconify-icon/i);
});

test('every root public HTML page uses the approved footer template and one structural stylesheet link', () => {
  const files = rootHtmlFiles();
  assert.equal(files.length, 47, 'the remaining public root URL inventory changed; review the footer normalizer');

  for (const filename of files) {
    const source = fs.readFileSync(path.join(ROOT, filename), 'utf8');
    const footers = footersIn(source);
    const footerless = /<body\b[^>]*\bdata-shared-footer="false"[^>]*>/i.test(source);
    if (footerless) {
      // Under-construction pages retain the shared markup for source-level
      // consistency, but the page contract disables it and its stylesheet
      // removes it from layout. Do not apply the normal visible-footer hash
      // assertions to this intentional footerless variant.
      assert.ok(footers.length <= 1, filename + ' must not contain duplicate footer markup');
      assert.doesNotMatch(source, /<body\b[^>]*\bdata-shared-footer="true"[^>]*>/i, filename + ' must not opt into shared footer layout');
      continue;
    }
    assert.equal(footers.length, 1, filename + ' must contain exactly one footer');
    assert.equal(sha256(normalize(footers[0])), APPROVED_TEMPLATE_SHA256, filename + ' footer differs from the approved template');
    assert.equal((head(source).match(/assets\/phase-01-footer\.css/g) || []).length, 1, filename + ' must load the shared footer stylesheet once in head');
    assert.match(source, /<body\b[^>]*\bdata-shared-footer="true"[^>]*>/i, filename + ' must opt into shared footer layout');
    assert.doesNotMatch(source, /\bdata-footer-layout=/i, filename + ' retains a page-layout footer override');
  }
});

test('footer brand, social set, and legacy footers cannot diverge by page', () => {
  for (const filename of rootHtmlFiles()) {
    const source = fs.readFileSync(path.join(ROOT, filename), 'utf8');
    if (/data-shared-footer="false"/i.test(source)) continue;
    const footer = footersIn(source)[0];
    assert.equal((footer.match(/LAKE_LOGO_LAKE_ONLY\.png/g) || []).length, 1, filename + ' must have the Lake-only logo once');
    assert.deepEqual(socialHrefs(footer), CANONICAL_SOCIAL_HREFS, filename + ' social links differ');
    assert.equal((footer.match(/class="footer-social-ico"/g) || []).length, 7, filename + ' social icons differ');
    assert.doesNotMatch(source, /xs-footer-sec|footer-main|footer-area/i, filename + ' retains a legacy unique footer');
  }
});

test('footer CSS pins approved visual tokens and isolates legacy themes', () => {
  for (const token of ['#013f5c', '#fff200', '#f5f7fb']) {
    assert.match(FOOTER_CSS, new RegExp(token, 'i'));
  }
  assert.doesNotMatch(FOOTER_CSS, /var\(/i);
  assert.doesNotMatch(FOOTER_CSS, /data-footer-layout/i);
  assert.match(FOOTER_CSS, /body\[data-shared-footer="true"\] footer\.site-footer \*/);
  assert.match(FOOTER_CSS, /\.footer-social \.social-link/);
  assert.match(FOOTER_CSS, /\.footer-contact-ico/);
});

test('footer normalization does not remove page identities outside footer chrome', () => {
  for (const filename of rootHtmlFiles()) {
    const source = fs.readFileSync(path.join(ROOT, filename), 'utf8');
    assert.match(source, /<title>[^<]+<\/title>/i, filename + ' lost its title');
    assert.match(source, /<script\b/i, filename + ' lost its page scripts');
  }
  assert.match(fs.readFileSync(path.join(ROOT, '404.html'), 'utf8'), /<main class="card">/);
  assert.match(fs.readFileSync(path.join(ROOT, 'offline.html'), 'utf8'), /<main class="card">/);
  assert.match(fs.readFileSync(path.join(ROOT, 'our-story.html'), 'utf8'), /<div id="stage">/);
});
