const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('Lake Pipes page exists and has correct branding', () => {
  const html = read('lake-pipes.html');
  assert.match(html, /<title>Lake Pipes \| Manufacturing \| Lake Group<\/title>/);
  assert.match(html, /<h1>Lake Pipes<\/h1>/);
  assert.match(html, /Lake Pipes.*Manufacturing.*Lake Group/);
});

test('Lake Pipes page has no stale Lake Plastics branding', () => {
  const html = read('lake-pipes.html');
  assert.doesNotMatch(html, /Lake Plastics/);
  assert.doesNotMatch(html, /lake-plastics/);
  assert.doesNotMatch(html, /LAKE PLASTICS/);
});

test('Lake Pipes uses new logo asset', () => {
  const html = read('lake-pipes.html');
  assert.match(html, /data-company-logo="assets\/images\/logos\/companies\/lake-pipes\.png"/);
});

test('Navigation uses Lake Pipes in all company pages', () => {
  const pages = [
    'index.html', 'about.html', 'lake-oil.html', 'lake-gas.html',
    'lake-steel.html', 'lake-cylinders.html', 'lake-trans.html',
    'careers.html', 'contact.html', 'history.html',
  ];
  for (const page of pages) {
    const html = read(page);
    assert.doesNotMatch(html, /Lake Plastics/, `${page} should not reference Lake Plastics`);
    assert.doesNotMatch(html, /lake-plastics\.html/, `${page} should not link to lake-plastics.html`);
  }
});

test('Scrolling logo strip uses Lake Pipes', () => {
  const js = read('assets/components/logo-loop-mount.js');
  assert.match(js, /Lake Pipes/);
  assert.match(js, /lake-pipes\.html/);
  assert.doesNotMatch(js, /Lake Plastics/);
  assert.doesNotMatch(js, /lake-plastics/);
});

test('i18n content uses Lake Pipes', () => {
  const i18n = read('assets/i18n-content.json');
  assert.doesNotMatch(i18n, /Lake Plastics/);
  assert.match(i18n, /Lake Pipes/);
});

test('Mobile nav uses Lake Pipes', () => {
  const html = read('lake-pipes.html');
  assert.match(html, /href="lake-pipes\.html">Lake Pipes<\/a>/);
});

test('Old route has redirect in vercel.json', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const redirect = vercel.redirects.find(r => r.source === '/lake-plastics');
  assert.ok(redirect, 'redirect from /lake-plastics should exist');
  assert.match(redirect.destination, /lake-pipes/);
});

test('Old lake-plastics.html file no longer exists', () => {
  assert.ok(!fs.existsSync(path.join(root, 'lake-plastics.html')), 'lake-plastics.html should not exist');
});

test('No broken internal links to lake-plastics.html in public HTML', () => {
  const htmlFiles = fs.readdirSync(root).filter(f => f.endsWith('.html') && !f.includes('404'));
  for (const file of htmlFiles) {
    const html = read(file);
    assert.doesNotMatch(html, /href="lake-plastics\.html"/, `${file} should not link to lake-plastics.html`);
  }
});
