const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const htmlFiles = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();

function metaPolicy(html) {
  return html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1] || '';
}

test('every shipping page uses the hardened static CSP without development connect sources', () => {
  assert.ok(htmlFiles.length > 40);
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const policy = metaPolicy(html);
    assert.match(policy, /connect-src 'self' https:/, file);
    assert.match(policy, /script-src-attr 'none'/, file);
    assert.match(policy, /form-action 'self'/, file);
    assert.doesNotMatch(policy, /frame-ancestors/, `${file} meta must omit header-only directives`);
    assert.doesNotMatch(policy, /localhost|127\.0\.0\.1|\*/i, file);
    assert.doesNotMatch(html, /<[a-z][^><]*\son[a-z]+\s*=/i, `${file} must not rely on inline event handlers`);
  }
});

test('Vercel sends the hardened policy as an HTTP response header', () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const catchAll = config.headers.find((entry) => entry.source === '/(.*)');
  const policy = catchAll?.headers.find((header) => header.key === 'Content-Security-Policy')?.value || '';
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /script-src-attr 'none'/);
  assert.doesNotMatch(policy, /localhost|127\.0\.0\.1/i);
});

test('unsafe-inline remains scoped to script elements because static pages still contain audited inline blocks', () => {
  const pagesWithInlineScripts = htmlFiles.filter((file) => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    return /<script(?:\s[^>]*)?>[\s\S]*?<\/script>/i.test(html);
  });
  const pagesWithInlineStyles = htmlFiles.filter((file) => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    return /<style\b|\sstyle=/i.test(html);
  });
  assert.ok(pagesWithInlineScripts.length > 40);
  assert.ok(pagesWithInlineStyles.length > 40);
});

test('analytics is inert unless an API origin is explicitly configured', () => {
  const analytics = fs.readFileSync(path.join(ROOT, 'assets', 'analytics.js'), 'utf8');
  assert.match(analytics, /window\.LAKE_API_BASE \|\| ''/);
  assert.doesNotMatch(analytics, /window\.LAKE_API_BASE \|\| 'http:\/\/127\.0\.0\.1/);
});
