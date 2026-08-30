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
  const entry = js.match(/\{ src: '([^']+lake-pipes[^']+)', alt: 'Lake Pipes'[^}]+\}/)?.[0] || '';
  assert.match(entry, /lake-pipes-scrolling\.webp\?v=1/);
  assert.match(entry, /lake-pipes\.html/);
  assert.match(entry, /scale:\s*0\.885/, 'Lake Pipes receives only its approved additional 5.9% optical-size adjustment');
  assert.doesNotMatch(entry, /lake-pipes-blue\.png/, 'the scrolling strip keeps the approved Lake Pipes asset');
  assert.doesNotMatch(js, /Lake Plastics/);
  assert.doesNotMatch(js, /lake-plastics/);
});

test('Scrolling logo strip includes the approved Lake Pipes and Agrinova marks only', () => {
  const js = read('assets/components/logo-loop-mount.js');
  const lakePipesEntries = js.match(/alt: 'Lake Pipes'/g) || [];
  const agrinovaEntries = js.match(/alt: 'Agrinova Tech Limited'/g) || [];

  assert.equal(lakePipesEntries.length, 1, 'Lake Pipes appears once per logical marquee sequence');
  assert.equal(agrinovaEntries.length, 1, 'Agrinova appears once per logical marquee sequence');
  assert.match(js, /agrinova-tech\.png\?v=1/);
  assert.match(js, /className: 'logoloop__item--agrinova'/);
  assert.doesNotMatch(js, /Lake Plastics|lake-plastics|lakeplastics/i);
});

test('Lake Pipes marquee asset is the official blue transparent lockup', async () => {
  const sharp = require('sharp');
  const logo = path.join(root, 'assets/images/logos/companies/lake-pipes-scrolling.webp');
  assert.ok(fs.existsSync(logo), 'blue Lake Pipes marquee logo exists');
  const image = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.ok(image.info.width > 1000 && image.info.height > 300, 'logo preserves the supplied lockup proportions');
  let blue = 0;
  let transparent = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const [red, green, blueChannel, alpha] = image.data.slice(i, i + 4);
    if (alpha < 16) transparent++;
    if (alpha > 32 && blueChannel > red * 1.15 && blueChannel > green * 1.05) blue++;
  }
  assert.ok(blue > 1000, 'logo contains the blue Lake Pipes artwork');
  assert.ok(transparent > 1000, 'logo preserves a transparent background');
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
