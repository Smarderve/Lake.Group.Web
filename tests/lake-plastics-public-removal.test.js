'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const prohibited = /lake[ _-]?plastics|lakeplastics/i;

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('Lake Plastics is absent from all public company discovery surfaces', () => {
  const publicFiles = [
    ...fs.readdirSync(root).filter((file) => file.endsWith('.html')),
    'llms.txt',
    'sitemap.xml',
    'assets/components/logo-loop-mount.js',
    'assets/i18n-content.js',
    'assets/i18n-content.json',
    'scripts/templates/nav.html',
    'scripts/templates/mobile_nav.html'
  ];

  for (const file of publicFiles) {
    assert.doesNotMatch(read(file), prohibited, file);
  }
});

test('published content uses the Lake Pipes asset path rather than the retired Lake Plastics path', () => {
  const currentSources = [
    'index.html',
    'gallery.html',
    ...fs.readdirSync(path.join(root, 'public-content', 'releases'), { recursive: true })
      .filter((file) => file.endsWith('.json'))
      .map((file) => path.join('public-content', 'releases', file))
  ];
  for (const file of currentSources) {
    assert.doesNotMatch(read(file), prohibited, file);
  }
  assert.ok(fs.existsSync(path.join(root, 'assets/images/lake-pipes/ops/blue-pipes.jpg')));
});

test('the retired route is compatibility-only and no Lake Plastics page remains', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const redirect = vercel.redirects.find((entry) => entry.source === '/lake-plastics');
  assert.deepEqual(redirect, {
    source: '/lake-plastics',
    destination: '/lake-pipes.html',
    permanent: true
  });
  assert.ok(!fs.existsSync(path.join(root, 'lake-plastics.html')));
});
