const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

test('hero keeps the original tab-only controls and has no stray arrow overlay', () => {
  const html = read('index.html');
  const hero = read('assets/home-hero.js');
  assert.equal(html.includes('hero-slide-controls'), false);
  assert.equal(hero.includes('data-hero-prev'), false);
  assert.equal(hero.includes('data-hero-next'), false);
  assert.match(hero, /var DURATION = 7000/);
});

test('logo ticker does not freeze merely because the pointer is over it', () => {
  const source = read('assets/components/logo-loop-mount.js');
  assert.match(source, /pauseOnHover: false/);
  assert.match(source, /pointerInside = pauseOnHover/);
});

test('homepage coverflow does not stop autoplay on incidental mousemove', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /stageEl\.addEventListener\("mousemove"/);
  assert.match(html, /Autoplay must not depend on incidental pointer movement/);
});

test('initial locale bootstrap cannot overwrite a user selection made first', () => {
  const source = read('assets/i18n.js');
  assert.match(source, /const revisionAtBootstrap = selectionRevision/);
  assert.match(source, /if \(selectionRevision !== revisionAtBootstrap\) return;/);
});
