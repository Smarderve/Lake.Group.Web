'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const PUBLIC_SOCIAL_URL = /https?:\/\/(?:www\.)?(?:linkedin\.com|facebook\.com|twitter\.com|x\.com|tiktok\.com)/i;

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('public social surfaces expose only the approved Lake Group channels', () => {
  const footer = read('scripts/templates/footer.html');
  assert.match(footer, /https:\/\/youtube\.com\/@lakegroup6790\?si=Qb1aF3ghYIRdCM8J/);
  assert.match(footer, /https:\/\/www\.instagram\.com\/lakeenergiestanzania\?igsi=cW5jZGVtbHU0eGFs/);
  assert.match(footer, /https:\/\/wa\.me\/255673961597/);
  assert.doesNotMatch(footer, /linkedin|facebook|twitter|tiktok/i);
  assert.doesNotMatch(read('assets/news.js'), PUBLIC_SOCIAL_URL);
  assert.doesNotMatch(read('scripts/add_seo_tags.js'), PUBLIC_SOCIAL_URL);

  for (const file of fs.readdirSync(ROOT).filter((name) => name.endsWith('.html'))) {
    assert.doesNotMatch(read(file), PUBLIC_SOCIAL_URL, file + ' exposes an unapproved public social URL');
  }
});
