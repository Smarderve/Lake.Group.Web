const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('Contact page has six sector contact cards including Automotive', () => {
  const page = read('contact.html');
  const sectorHeadings = [
    'Energies Sector',
    'Manufacturing Sector',
    'Logistics Sector',
    'Real Estate Sector',
    'Agro Processing Sector',
    'Automotive Sector',
  ];
  for (const h of sectorHeadings) {
    assert.ok(
      page.includes(`<h3>${h}</h3>`),
      `Sector card heading "${h}" should exist in contact.html`
    );
  }
});

test('Automotive Sector card uses Agrinova contact details', () => {
  const page = read('contact.html');
  // Phone
  assert.ok(
    page.includes('tel:+255748518111'),
    'Automotive card should link to +255 748 518 111'
  );
  assert.ok(
    page.includes('+255 748 518 111'),
    'Automotive card should display +255 748 518 111'
  );
  // Address
  assert.ok(
    page.includes('Pugu Road, Opposite JNIA Terminal 3, Dar es Salaam'),
    'Automotive card should include Pugu Road address'
  );
});

test('Automotive Sector card does NOT display Agrinova name as heading', () => {
  const page = read('contact.html');
  // The card heading should be "Automotive Sector", not "Agrinova"
  assert.ok(
    !page.includes('<h3>Agrinova'),
    'Card heading should not be Agrinova'
  );
  assert.ok(
    !page.includes('<h3>Agrinova Tech'),
    'Card heading should not be Agrinova Tech'
  );
});

test('Automotive Sector has no invented email', () => {
  const page = read('contact.html');
  // Find the Automotive card block
  const autoIdx = page.indexOf('<h3>Automotive Sector</h3>');
  assert.ok(autoIdx > 0, 'Automotive Sector heading should exist');
  // Look for the next ct-dir-item closing
  const cardEnd = page.indexOf('</article>', autoIdx);
  const card = page.slice(autoIdx, cardEnd);
  // Should NOT have a mailto link
  assert.ok(
    !card.includes('mailto:'),
    'Automotive card should not contain an invented email address'
  );
});

test('Agro Processing Sector card still exists separately', () => {
  const page = read('contact.html');
  assert.ok(
    page.includes('<h3>Agro Processing Sector</h3>'),
    'Agro Processing Sector card should still exist'
  );
});
