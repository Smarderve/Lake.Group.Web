const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('every sitemap page remains independent of CMS and backend runtime', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
    const pathname = new URL(match[1]).pathname;
    return pathname === '/' ? 'index.html' : pathname.slice(1);
  });
  assert.ok(routes.length >= 30);
  for (const route of routes) {
    const html = fs.readFileSync(path.join(root, route), 'utf8');
    assert.doesNotMatch(html, /cms-content-v2(?:-config)?\.js|\/api\/|\/admin\/|\/control\//i, route);
  }
});

test('retained CMS hydration adapter is disabled even when opened directly', () => {
  const config = fs.readFileSync(path.join(root, 'assets', 'cms-content-v2-config.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(root, 'assets', 'cms-content-v2.js'), 'utf8');
  assert.match(config, /enabled:\s*false/);
  assert.match(adapter, /if \(config\.enabled !== true\) return/);
});
