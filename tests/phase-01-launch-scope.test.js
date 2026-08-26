const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const underConstruction = ['news.html', 'careers.html', 'csr.html', 'sustainability.html', 'africa-network.html', 'investors.html'];
const retired = ['leadership-bibhuti-singh.html', 'leadership-biji-lapat.html', 'leadership-dileep-kumar.html', 'leadership-jishnu-jayachandran.html', 'leadership-juma-nuru.html', 'leadership-mohammed-khalid.html', 'leadership-sridhar-mani.html', 'leadership-zaki-othman.html'];

test('launch-reduced pages use the common under-construction surface', () => {
  for (const file of underConstruction) {
    const html = read(file);
    assert.match(html, /data-phase-01-under-construction="true"/, file);
    assert.equal((html.match(/class="phase-01-under-construction"/g) || []).length, 1, file);
  }
});

test('public UI is English-only and has no switching controls', () => {
  assert.match(read('assets/i18n.js'), /const SUPPORTED = \['en'\]/);
  for (const file of fs.readdirSync(root).filter((name) => name.endsWith('.html'))) {
    assert.doesNotMatch(read(file), /class="[^"]*(?:lang-switcher|lang-btn)/, file);
  }
});

test('leadership exposes Chairman Ally Edha Awadh only', () => {
  const html = read('leadership.html');
  assert.match(html, /Ally Edha Awadh/);
  assert.match(html, /Founder and Chairman/);
  for (const file of retired) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
    assert.doesNotMatch(html, new RegExp(file.replace('.', '\\.')));
  }
});

test('subsidiaries landing and retired profiles redirect safely', () => {
  assert.equal(fs.existsSync(path.join(root, 'services.html')), false);
  const config = JSON.parse(read('vercel.json'));
  assert.ok(config.redirects.some((r) => r.source === '/services.html' && r.destination === '/index.html'));
  for (const file of retired) assert.ok(config.redirects.some((r) => r.source === '/' + file && r.destination === '/leadership.html'), file);
  assert.doesNotMatch(read('sitemap.xml'), /services\.html|leadership-(?!ally-edha-awadh)[^<]*\.html/);
});
