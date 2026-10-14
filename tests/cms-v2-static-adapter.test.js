const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('only the approved Lake Aviation pilot page connects to CMS; all other sitemap pages remain static', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
    const pathname = new URL(match[1]).pathname;
    return pathname === '/' ? 'index.html' : pathname.slice(1);
  });
  assert.ok(routes.length >= 30);
  for (const route of routes) {
    const html = fs.readFileSync(path.join(root, route), 'utf8');
    if (route === 'lake-aviation.html') {
      assert.match(html, /assets\/cms-content-v2-config\.js/);
      assert.match(html, /assets\/cms-content-v2\.js/);
    } else assert.doesNotMatch(html, /cms-content-v2(?:-config)?\.js|\/api\/|\/admin\/|\/control\//i, route);
  }
});

test('CMS pilot defaults to its private publication pointer and adapter fails closed when disabled', () => {
  const config = fs.readFileSync(path.join(root, 'assets', 'cms-content-v2-config.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(root, 'assets', 'cms-content-v2.js'), 'utf8');
  assert.match(config, /enabled:\s*true/);
  assert.match(config, /pointerUrl:\s*'\/public-content\/cms-v2\/current\.json'/);
  assert.match(adapter, /if \(config\.enabled !== true\) return/);
});
