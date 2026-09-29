const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const canonicalTitle = 'Founder & Chairman';
const prohibitedTitle = /executive founder|executive chairman(?:\s*&\s*owner)?|founder\s*(?:&|and)\s*executive chairman|executive founder\s*(?:&|and)\s*chairman|chairman\s*(?:&|and)\s*owner|group executive chairman/i;
const publicSources = [
  ...fs.readdirSync(root).filter((name) => name.endsWith('.html')),
  'assets/i18n-content.json',
  'assets/i18n-content.js',
  'assets/i18n-content.js.bak',
  'assets/news-data.js',
  'assets/assistant-kb.js',
  'backend/scripts/content-seed-data.js',
  'scripts/_master_en.json',
  'scripts/translation_dict.py',
  'lake-group-org-chart.html',
  'public-content/releases/ef80b28117e92a9d2d70/content.json',
  'public-content/releases/e1f7948c362af717573c/content.json',
  'public-content/releases/ae38685150d29bb870cb/content.json',
];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('canonical source and public mirrors use the approved Ally title', () => {
  assert.match(read('backend/scripts/content-seed-data.js'), /name: 'Ally Edha Awadh', position: 'Founder & Chairman'/);
  assert.match(read('leadership.html'), /data-entity-field="position">Founder &amp; Chairman<\/span>/);
  assert.match(read('leadership-ally-edha-awadh.html'), /data-i18n="leadership\.8">Founder &amp; Chairman<\/p>/);

  const translations = JSON.parse(read('assets/i18n-content.json'));
  for (const [locale, dictionary] of Object.entries(translations)) {
    assert.equal(dictionary['leadership.8'], canonicalTitle, `${locale} leadership title`);
    assert.equal(dictionary['about.40'], canonicalTitle, `${locale} about title`);
    assert.equal(dictionary['index.73'].split(', Lake Group')[0], canonicalTitle, `${locale} index title`);
  }

  const legacyTranslations = JSON.parse(read('assets/i18n-content.js.bak')
    .replace(/^window\.__LAKE_I18N_CONTENT__\s*=\s*/, '')
    .replace(/;\s*$/, ''));
  for (const [locale, dictionary] of Object.entries(legacyTranslations)) {
    assert.equal(dictionary['leadership.8'], canonicalTitle, `${locale} legacy leadership title`);
    assert.equal(dictionary['about.40'], canonicalTitle, `${locale} legacy about title`);
    assert.equal(dictionary['index.73'].split(', Lake Group')[0], canonicalTitle, `${locale} legacy index title`);
  }

  const failures = [];
  for (const relative of publicSources) {
    const source = read(relative);
    const ally = /ally edha awadh/ig;
    let match;
    while ((match = ally.exec(source)) !== null) {
      const context = source.slice(Math.max(0, match.index - 280), Math.min(source.length, match.index + 280));
      if (prohibitedTitle.test(context)) failures.push(`${relative}: ${context.replace(/\s+/g, ' ').trim()}`);
    }
  }
  assert.deepEqual(failures, [], `Incorrect Ally title references:\n${failures.join('\n')}`);
});

function startServer() {
  const server = http.createServer((request, response) => {
    const requested = decodeURIComponent((request.url || '/').split('?')[0]);
    const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
    const file = path.join(root, relative);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404); response.end('not found'); return;
    }
    const ext = path.extname(file);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
    response.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('Leadership renders the canonical title at desktop, tablet, and mobile widths', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const port = server.address().port;
    for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.goto(`http://127.0.0.1:${port}/leadership.html`, { waitUntil: 'domcontentloaded' });
      const text = await page.locator('body').innerText();
      assert.match(text, new RegExp(canonicalTitle.replace(/[&]/g, '\\&'), 'i'));
      assert.doesNotMatch(text, prohibitedTitle);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    for (const route of ['index.html', 'about.html', 'history.html']) {
      await page.goto(`http://127.0.0.1:${port}/${route}`, { waitUntil: 'domcontentloaded' });
      const text = await page.locator('body').innerText();
      if (/Ally Edha Awadh/i.test(text)) {
        assert.doesNotMatch(text, prohibitedTitle, route);
        assert.match(text, /Founder & Chairman/i, route);
      }
    }
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
