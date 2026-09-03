const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('Lake Oil page uses approved company facts from source document', () => {
  const html = read('lake-oil.html');

  // Company basics
  assert.match(html, /Lake Oil Ltd\. &bull; Est\. 2006/, 'eyebrow shows corrected separator');
  assert.match(html, /Lake Oil<\/h1>/, 'page title is Lake Oil');

  // Source-locked history milestones
  assert.match(html, /2008.*Zambia|Zambia.*2008/s, '2008 Zambia expansion');
  assert.match(html, /Sun Fuel SARL/, 'Sun Fuel SARL mentioned');
  assert.match(html, /2011.*DR Congo|DR Congo.*2011|2011.*DRC|DRC.*2011/s, '2011 DRC launch');
  assert.match(html, /2012.*Burundi|Burundi.*2012/s, '2012 Burundi expansion');
  assert.match(html, /2017.*Kenya|Kenya.*2017/s, '2017 Kenya expansion');
  assert.match(html, /2020.*Mozambique|Mozambique.*2020|Lake Oil LDA/s, '2020 Mozambique expansion');
  assert.match(html, /Frontier Energy SARL/, 'Frontier Energy SARL mentioned');

  // Source-locked values
  assert.match(html, /Quality[\s\S]{0,200}?Relentlessly provide high product integrity/, 'Quality value');
  assert.match(html, /Service[\s\S]{0,200}?[Rr]esponsive.*reliable.*accountable/, 'Service value');
  assert.match(html, /Safety[\s\S]{0,200}?Strict adherence to HSE standards/, 'Safety value');
  assert.match(html, /Professionalism[\s\S]{0,200}?culture of responsibility.*competence.*accountability/, 'Professionalism value');

  // Source-locked capabilities
  assert.match(html, /Retail fuel stations across Africa/, 'retail stations capability');
  assert.match(html, /Bulk petroleum supply for corporate and government clients/, 'bulk petroleum capability');
  assert.match(html, /Self-sufficient.*own oil storage facilities in Tanzania, Kenya, Burundi and DR Congo/, 'storage facilities');
  assert.match(html, /Optimum costs through a regionally integrated supply network/, 'integrated network');
  assert.match(html, /Quality products adhering to national and global standards/, 'quality products');
});

test('Lake Oil page hero uses approved IMAGE 6', () => {
  const html = read('lake-oil.html');
  assert.match(html, /lake-oil-hero\.webp/, 'hero uses approved fuel station image');
});

test('Lake Oil page has no corrupted encoding characters', () => {
  const html = read('lake-oil.html');
  assert.doesNotMatch(html, /\ufffd/, 'no replacement character (U+FFFD)');
  assert.doesNotMatch(html, /Lake Oil Ltd\. [^&<\n]*Est/, 'no corrupted separator before Est');
});

test('Lake Oil page has no breadcrumb navigation', () => {
  const html = read('lake-oil.html');
  assert.doesNotMatch(html, /class="breadcrumb"/, 'no breadcrumb nav');
  assert.doesNotMatch(html, /BreadcrumbList/, 'no BreadcrumbList JSON-LD');
});

test('Lake Oil country card has no vertical divider lines', () => {
  const html = read('lake-oil.html');
  // The info-row last-child should not have border-left
  assert.doesNotMatch(html, /\.info-panel \.info-row>span:last-child\{[^}]*border-left:1px/, 'no vertical divider on info-row');
});

test('Lake Oil country card uses authentic Lake logo', () => {
  const html = read('lake-oil.html');
  assert.match(html, /LAKE_LOGO_LAKE_ONLY\.png/, 'uses official Lake logo asset');
  assert.match(html, /lake-mark.*LAKE_LOGO_LAKE_ONLY|LAKE_LOGO_LAKE_ONLY.*lake-mark/s, 'logo inside lake-mark container');
});

test('Company pages globally have no breadcrumb navigation', () => {
  const companyPages = [
    'lake-oil.html', 'lake-gas.html', 'lake-steel.html', 'lake-lubes.html',
    'lake-trans.html', 'lake-aviation.html', 'lake-cylinders.html', 'lake-agro.html',
    'cross-country.html', 'africa-network.html', 'history.html',
    'careers.html', 'csr.html', 'fleet.html', 'gallery.html',
    'station-locator.html', 'projects.html', 'leadership.html',
  ];
  for (const page of companyPages) {
    const html = read(page);
    assert.doesNotMatch(html, /class="breadcrumb"/, `${page} should not have breadcrumb`);
  }
});
