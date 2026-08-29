const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.join(__dirname, '..', 'lake-cylinders.html');
const page = fs.readFileSync(pagePath, 'utf8');

test('Lake Cylinders page uses approved company facts and contacts', () => {
  const required = [
    'specialized LPG cylinder manufacturing company',
    'Visiga, Kibaha, Pwani, Tanzania',
    '40,000 units per month',
    'more than 200,000 LPG cylinders',
    'Expansion into 38 kg LPG cylinder manufacturing',
    'Zaki Othman',
    '+255 745 552 259',
    'zaki.othman@lakeoilgroup.com',
    'production.lc@lakeoilgroup.com',
  ];

  for (const fragment of required) assert.ok(page.includes(fragment), `missing approved fragment: ${fragment}`);
});

test('Lake Cylinders page does not retain known unsupported legacy claims', () => {
  const removed = [
    '152 retail stations',
    "Tanzania's top 5",
    'East and Central Africa\'s fastest-growing',
  ];

  for (const fragment of removed) assert.equal(page.toLowerCase().includes(fragment.toLowerCase()), false, `stale claim remains: ${fragment}`);
});

test('Hero image is IMAGE 2 (cylinder-hero.webp)', () => {
  assert.ok(
    page.includes('cylinder-hero.webp'),
    'hero image should reference cylinder-hero.webp (IMAGE 2)'
  );
  assert.ok(
    !page.includes("background-image:url('assets/images/lakegas/ops/cylinder-stacks.jpg')"),
    'old hero image cylinder-stacks.jpg should be replaced'
  );
});

test('Operations by Country uses Lake Gas info-panel grid design', () => {
  assert.ok(page.includes('info-rows'), 'Operations panel should use info-rows container class');
  assert.ok(page.includes('info-row'), 'Operations panel should use info-row class');
  assert.ok(page.includes('Manufacturing Base'), 'Tanzania should show Manufacturing Base status');
  assert.ok(page.includes('Regional Supply'), 'Regional countries should show Regional Supply status');
});

test('No leader image placeholders remain', () => {
  assert.ok(!page.includes('ld-person-photo'), 'leader photo placeholder div should be removed');
  assert.ok(!page.includes('assets/images/leadership/zaki-othman.jpg'), 'Zaki Othman image should not be present');
  assert.ok(!page.includes('assets/images/leadership/jishnu-jayachandran.jpg'), 'Jishnu Jayachandran image should not be present');
});

test('Leader names are preserved', () => {
  assert.ok(page.includes('Zaki Othman'), 'Zaki Othman name should be present');
  assert.ok(page.includes('Jishnu Jayachandran'), 'Jishnu Jayachandran name should be present');
  assert.ok(page.includes('General Manager'), 'General Manager title should be present');
  assert.ok(page.includes('Plant Manager'), 'Plant Manager title should be present');
});

test('No invalid Read More links without profile pages', () => {
  assert.ok(!page.includes('Read more'), 'Read more links should be removed (no standalone profiles)');
});

test('Services Offered section (IMAGE 7) is completely removed', () => {
  assert.ok(!page.includes('Services Offered'), 'Services Offered section should be removed');
  assert.ok(!page.includes('LPG Cylinder Manufacturing</h4>'), 'LPG Cylinder Manufacturing service card should be removed');
  assert.ok(!page.includes('svc-grid'), 'svc-grid should not be present');
  assert.ok(!page.includes('svc-card'), 'svc-card should not be present');
});

test('Capabilities section (IMAGE 9) is completely removed', () => {
  assert.ok(!page.includes('Production &amp; Operational Capabilities'), 'Capabilities section should be removed');
  assert.ok(!page.includes('stat-panel2'), 'stat-panel2 should not be present');
  assert.ok(!page.includes('Operational Strengths'), 'Operational Strengths subsection should be removed');
});

test('Company Objectives text uses readable contrast class', () => {
  assert.ok(
    page.includes('.fs-on-dark .fs-check li{color:rgba(233,237,248,0.92)'),
    'dark section fs-check li should have high-contrast text color'
  );
  assert.ok(
    page.includes('.fs-on-dark p{color:rgba(233,237,248,0.9)'),
    'dark section paragraphs should have high-contrast text color'
  );
});

test('Ongoing & Future Projects text uses readable contrast', () => {
  assert.ok(
    page.includes('.fs-on-dark .val-mini-tile p{color:var(--ink-mute)'),
    'dark section val-mini-tile paragraphs should use ink-mute for readability'
  );
});

test('Product cards count and labels remain correct', () => {
  assert.ok(page.includes('6 kg LPG Cylinders'), '6 kg product should be present');
  assert.ok(page.includes('15 kg LPG Cylinders'), '15 kg product should be present');
  assert.ok(page.includes('38 kg LPG Cylinders'), '38 kg product should be present');
  assert.ok(page.includes('prod-compact'), 'products should use compact card layout');
  assert.ok(!page.includes('prod-catalog-card'), 'old large product cards should be removed');
});

test('Contact section retains approved address, phone, and email', () => {
  assert.ok(page.includes('Lake Cylinders Limited'), 'company name should be present');
  assert.ok(page.includes('Visiga, Kibaha, Pwani, Tanzania'), 'address should be present');
  assert.ok(page.includes('Zaki Othman'), 'general manager should be present');
  assert.ok(page.includes('+255 745 552 259'), 'telephone should be present');
  assert.ok(page.includes('zaki.othman@lakeoilgroup.com'), 'primary email should be present');
  assert.ok(page.includes('production.lc@lakeoilgroup.com'), 'production email should be present');
});

test('Contact section uses compact design', () => {
  assert.ok(page.includes('ct-compact'), 'contact section should use compact layout');
});

test('No giant placeholder boxes remain', () => {
  assert.ok(!page.includes('ld-person-photo'), 'no image placeholder boxes should remain');
});

test('Gallery section is preserved', () => {
  assert.ok(page.includes('co-gal'), 'gallery grid should be present');
  assert.ok(page.includes('co-gal__item'), 'gallery items should be present');
  assert.ok(page.includes('Cylinder storage yard'), 'gallery captions should be present');
});

test('Leadership card uses text-only design', () => {
  assert.ok(page.includes('ld-person-card'), 'leadership cards should be present');
  assert.ok(!page.includes('ld-person-photo'), 'leadership cards should not have photo areas');
});
