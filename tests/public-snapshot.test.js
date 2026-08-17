const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const vm = require('node:vm');

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(__dirname, '..');

test('publishes complete snapshots atomically and retains the last good release', async (t) => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'lake-public-snapshot-'));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));

  let failPath = null;
  let employeeValue = '1,200+';
  const server = http.createServer((req, res) => {
    if (req.url === failPath) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'UNAVAILABLE' } }));
      return;
    }
    const route = req.url.replace(/^\/api\/public\//, '').split('?')[0];
    let body;
    if (route === 'metrics') {
      body = { metrics: [{ key: 'employees.total', label: 'Employees', value: employeeValue }] };
    } else if (route === 'map') {
      body = { categories: [], countries: [{ id: 'tz', name: 'Tanzania', regions: [] }] };
    } else if (route === 'knowledge/facts') {
      body = { facts: [{ key: 'employees.total', value: employeeValue }], generatedAt: 'ignored' };
    } else if (route === 'companies') {
      body = { company: [{ id: 'company-1', slug: 'lake-oil', name: 'Lake Oil' }] };
    } else {
      body = { [route.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/s$/, '')]: [] };
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const apiBase = `http://127.0.0.1:${server.address().port}`;

  await execFileAsync(process.execPath, [
    'scripts/public-snapshot.js',
    '--api-base',
    apiBase,
    '--output',
    output,
  ], { cwd: ROOT });

  const firstManifest = JSON.parse(fs.readFileSync(path.join(output, 'current.json'), 'utf8'));
  const firstReleasePath = path.join(output, firstManifest.snapshotUrl);
  const firstRelease = JSON.parse(fs.readFileSync(firstReleasePath, 'utf8'));
  assert.equal(firstRelease.releaseId, firstManifest.releaseId);
  assert.equal(firstRelease.entities.metrics[0].value, '1,200+');
  assert.equal(firstRelease.entities.companies[0].name, 'Lake Oil');
  assert.match(firstManifest.integrity, /^sha256-[a-f0-9]{64}$/);

  failPath = '/api/public/news';
  await assert.rejects(
    execFileAsync(process.execPath, [
      'scripts/public-snapshot.js',
      '--api-base',
      apiBase,
      '--output',
      output,
    ], { cwd: ROOT }),
  );
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(output, 'current.json'), 'utf8')),
    firstManifest,
    'a failed generation must not replace current.json',
  );
  assert.equal(fs.existsSync(firstReleasePath), true, 'the previous release must remain available');

  failPath = null;
  employeeValue = '1,300+';
  await execFileAsync(process.execPath, [
    'scripts/public-snapshot.js',
    '--api-base',
    apiBase,
    '--output',
    output,
  ], { cwd: ROOT });
  const recoveredManifest = JSON.parse(fs.readFileSync(path.join(output, 'current.json'), 'utf8'));
  assert.notEqual(recoveredManifest.releaseId, firstManifest.releaseId);
  assert.equal(fs.existsSync(firstReleasePath), true);
});

test('browser delivery loader reads only the same-origin published release', async () => {
  const loaderPath = path.join(ROOT, 'assets', 'public-content.js');
  assert.equal(fs.existsSync(loaderPath), true, 'published-content browser loader must exist');
  const requests = [];
  const manifest = {
    releaseId: 'release-1',
    snapshotUrl: 'releases/release-1/content.json',
    integrity: `sha256-${'a'.repeat(64)}`,
  };
  const snapshot = {
    releaseId: 'release-1',
    entities: {
      companies: [{ slug: 'lake-oil', name: 'Lake Oil' }],
      metrics: [{ key: 'employees.total', value: '1,200+' }],
      pages: [{
        slug: 'home',
        metaTitle: 'Lake Group | Pan-African Enterprise',
        metaDescription: 'Published corporate description.',
      }],
    },
    map: { countries: [{ name: 'Tanzania' }] },
    knowledge: { facts: [{ key: 'employees.total', value: '1,200+' }] },
  };
  const context = {
    window: {},
    document: {
      title: 'Old title',
      querySelector: (selector) => ({
        setAttribute(name, value) {
          this[name] = value;
          if (selector === 'meta[name="description"]') context.description = value;
          if (selector === 'meta[property="og:title"]') context.ogTitle = value;
          if (selector === 'meta[property="og:description"]') context.ogDescription = value;
        },
      }),
    },
    location: { pathname: '/' },
    fetch: async (url) => {
      requests.push(url);
      return {
        ok: true,
        json: async () => (url.endsWith('current.json') ? manifest : snapshot),
      };
    },
    URL,
    Promise,
    setTimeout,
    clearTimeout,
  };
  context.window.window = context.window;
  vm.runInNewContext(fs.readFileSync(loaderPath, 'utf8'), context, { filename: loaderPath });

  assert.deepEqual(
    JSON.parse(JSON.stringify(await context.window.LakePublicContent.list('companies'))),
    snapshot.entities.companies,
  );
  assert.equal((await context.window.LakePublicContent.metric('employees.total')).value, '1,200+');
  assert.equal((await context.window.LakePublicContent.map()).countries[0].name, 'Tanzania');
  assert.equal(context.document.title, 'Lake Group | Pan-African Enterprise');
  assert.equal(context.description, 'Published corporate description.');
  assert.equal(context.ogTitle, 'Lake Group | Pan-African Enterprise');
  assert.deepEqual(requests, [
    '/public-content/current.json',
    '/public-content/releases/release-1/content.json',
  ]);
  assert.equal(requests.some((url) => url.includes('/api/public/')), false);
});

test('snapshot validation rejects media that depends on authenticated CMS routes', () => {
  const { ENTITY_ROUTES, validatePayload } = require('../scripts/public-snapshot.js');
  const entities = Object.fromEntries(ENTITY_ROUTES.map((route) => [route, []]));
  entities.companies = [{ slug: 'lake-oil' }];
  entities.metrics = [{ key: 'employees', value: '1,200+' }];
  entities.media = [{ url: '/api/admin/media/private-image' }];

  assert.throws(() => validatePayload({
    schemaVersion: 1,
    entities,
    map: { countries: [{ id: 'tz' }] },
    knowledge: { facts: [] },
  }), /authenticated CMS route/);
});
