'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const BLOCKED = /^(?:(?:backend|cms|docs|scripts|tests|node_modules|\.git|\.github|prisma)(?:\/|$)|\.env(?:\..*)?$|(?:package-lock(?:\.json(?:\.old)?)?|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$|.*\.(?:map|sqlite|sqlite3|db|sql|bak|pem|key)$|web\.config$)/i;

function server() {
  return http.createServer(async (request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://local').pathname).replace(/^\/+/, '') || 'index.html';
    if (BLOCKED.test(relative)) return response.writeHead(404).end('Not found');
    const target = path.resolve(ROOT, relative);
    if (!target.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return response.writeHead(404).end('Not found');
    response.writeHead(200).end(await fsp.readFile(target));
  });
}

test('IIS repository-root policy keeps public runtime reachable and source paths private', async () => {
  const config = await fsp.readFile(path.join(ROOT, 'web.config'), 'utf8');
  assert.match(config, /name="Deny private repository paths"/);
  for (const expected of ['backend', 'cms', 'docs', 'scripts', 'tests', 'node_modules', '.git', '.github', 'prisma', '.env', 'package-lock', '.*\\.(?:map']) assert.ok(config.includes(expected), `web.config protects ${expected}`);

  const app = server();
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${app.address().port}`;
  const status = (url) => new Promise((resolve, reject) => http.get(`${root}${url}`, (response) => { response.resume(); response.on('end', () => resolve(response.statusCode)); }).on('error', reject));
  try {
    for (const file of ['/', '/assets/theme.css', '/assets/globe-lab.bundle.js', '/assets/fonts/files/jost-latin-400-normal.woff2', '/assets/images/logos/LAKE_GROUP_LOGO.png', '/sitemap.xml', '/robots.txt', '/manifest.webmanifest', '/sw.js']) assert.equal(await status(file), 200, `${file} remains public`);
    for (const file of ['/backend/package.json', '/cms/package.json', '/docs/reports/SEARCH_CUTOVER_REPORT.md', '/scripts/seo-config.mjs', '/tests/hero-readability.test.js', '/node_modules/react/package.json', '/.git/config', '/.github/workflows/deploy.yml', '/prisma/schema.prisma', '/.env', '/.env.production', '/package-lock.json', '/database.sqlite', '/assets/globe-lab.bundle.js.map', '/web.config']) assert.equal(await status(file), 404, `${file} is blocked`);
  } finally {
    await new Promise((resolve) => app.close(resolve));
  }
});
