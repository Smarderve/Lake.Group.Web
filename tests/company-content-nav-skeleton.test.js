const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('retired companies are absent from active navigation and the logo loop', () => {
  const nav = read('scripts/templates/nav.html');
  const mobile = read('scripts/templates/mobile_nav.html');
  const loop = read('assets/components/logo-loop-mount.js');
  assert.doesNotMatch(nav, /acfs|ocean-galleria/i);
  assert.doesNotMatch(mobile, /acfs|ocean galleria/i);
  assert.doesNotMatch(loop, /acfs|ocean galleria/i);
  assert.match(nav, /aficd\.html/);
  const redirects = JSON.parse(read('vercel.json')).redirects;
  for (const retired of ['/acfs.html', '/ocean-galleria.html']) {
    assert.ok(redirects.some((rule) => rule.source === retired && rule.destination === '/index.html'));
  }
});

test('company pages contain approved source facts and remove superseded claims', () => {
  const steel = read('lake-steel.html');
  assert.match(steel, /Lake Steel &amp; Allied Products Limited/);
  assert.match(steel, /60,000 metric tons annually/);
  assert.match(steel, /25T\/hr/);
  assert.doesNotMatch(steel, /100,000|600[^\n<]{0,10}(?:C|ï¿½C)|50%\+/i);

  const gas = read('lake-gas.html');
  assert.match(gas, /established in 2011/);
  assert.match(gas, /Kenya operations have run since 2014/);
  assert.match(gas, /Dar es Salaam, Mwanza, Arusha, Dodoma, Morogoro, Iringa, Mbeya, Tanga and Zanzibar/);
  assert.doesNotMatch(gas, /established in 2014/i);

  const agro = read('lake-agro.html');
  assert.match(agro, /established in 2021/);
  assert.match(agro, /16,000 hectares/);
  assert.match(agro, /2,500 TCD/);
  assert.match(agro, /3,500 TCD/);
  assert.match(agro, /agro-gallery-grid/);
  assert.doesNotMatch(agro, /July 2027|70,000 MT|84%|40%|90%/);
});

test('shared loading uses local media placeholders without a page veil or update prompts', () => {
  const skeleton = read('assets/skeleton.css');
  const pwa = read('assets/pwa.js');
  assert.doesNotMatch(skeleton, /position:\s*fixed|skeleton-overlay|backdrop-filter/i);
  assert.match(skeleton, /\.lg-media-pending/);
  assert.doesNotMatch(pwa, /lake-pwa-toast|showUpdateToast|new site version|ready for your next visit/i);
  assert.doesNotMatch(read('lake-oil.html'), /8 retail stations/i);
  assert.match(read('lake-oil.html'), /7 fuel stations, with 6 currently operational/);
});
