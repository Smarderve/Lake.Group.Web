const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const linkedin = 'https://www.linkedin.com/company/lake-energies-group/';

test('every active public footer uses Kigamboni and the approved LinkedIn link', () => {
  const pages = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
  assert.ok(pages.length > 0);
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const start = html.indexOf('<footer class="site-footer"');
    const end = html.indexOf('</footer>', start);
    assert.ok(start >= 0 && end > start, `${page} has a footer`);
    const footer = html.slice(start, end);
    assert.match(footer, /Kigamboni/i, `${page} footer uses Kigamboni`);
    assert.doesNotMatch(footer, /Mikocheni/i, `${page} footer has no Mikocheni regression`);
    assert.equal((footer.match(new RegExp(linkedin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1, `${page} has one approved LinkedIn link`);
    assert.match(footer, new RegExp(`href="${linkedin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*target="_blank"[^>]*rel="noopener noreferrer"`), `${page} LinkedIn link is safe and external`);
  }
});

test('translated footer address values remain on the approved Kigamboni location', () => {
  const content = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'i18n-content.json'), 'utf8'));
  for (const [lang, values] of Object.entries(content)) {
    const approvedPlace = lang === 'ar' ? /كيغامبوني/ : /Kigamboni/i;
    assert.match(values['footer.address'], approvedPlace, `${lang} footer address uses Kigamboni`);
    assert.doesNotMatch(values['footer.address'], /Mikocheni/i, `${lang} footer address has no Mikocheni`);
  }
});
