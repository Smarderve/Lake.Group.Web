const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const underConstruction = ['sustainability.html'];
const retired = ['leadership-bibhuti-singh.html', 'leadership-biji-lapat.html', 'leadership-dileep-kumar.html', 'leadership-jishnu-jayachandran.html', 'leadership-juma-nuru.html', 'leadership-mohammed-khalid.html', 'leadership-sridhar-mani.html', 'leadership-zaki-othman.html'];

test('launch-reduced pages use the common under-construction surface', () => {
  for (const file of underConstruction) {
    const html = read(file);
    assert.match(html, /data-phase-01-under-construction="true"/, file);
    assert.equal((html.match(/class="phase-01-under-construction"/g) || []).length, 1, file);
  }
});

test('careers is a live public page, not an under-construction surface', () => {
  const html = read('careers.html');
  assert.doesNotMatch(html, /under construction|coming soon|preparing this section/i);
  assert.doesNotMatch(html, /data-phase-01-under-construction/);
  assert.match(html, /Careers at Lake Group/);
});

test('CSR is a live public page with approved source content', () => {
  const html = read('csr.html');
  assert.doesNotMatch(html, /under construction|coming soon|preparing this section/i);
  assert.match(html, /Growing Communities, Sustaining Futures\./);
  assert.match(html, /150,000 rural residents/);
  assert.match(html, /Rural Energy Agency \(REA\)/);
});

test('public UI exposes the planned language selector', () => {
  const controller = read('assets/i18n.js');
  const home = read('index.html');
  assert.match(controller, /const SUPPORTED = \['en', 'sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'\]/);
  assert.match(controller, /const AVAILABLE_TRANSLATIONS = \['en'\]/);
  assert.match(controller, /localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(home, /class="lang-switcher"/);
  assert.match(home, /class="mob-acc-btn mob-language-trigger"/);
  for (const [code, label] of [['en', 'English'], ['sw', 'Kiswahili'], ['hi', 'हिन्दी'], ['ar', 'العربية'], ['zh', '简体中文'], ['fr', 'Français'], ['es', 'Español'], ['pt', 'Português']]) {
    assert.ok(home.includes(`data-lang="${code}"`) && home.includes(`>${label}</button>`), `${label} option is present`);
  }
});

test('leadership exposes Chairman Ally Edha Awadh only', () => {
  const html = read('leadership.html');
  assert.match(html, /Ally Edha Awadh/);
  assert.match(html, /Founder &amp; Chairman/);
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
