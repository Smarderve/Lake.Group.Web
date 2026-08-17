const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('every Our Story scene uses a real repository-controlled image', () => {
  const html = fs.readFileSync(path.resolve('our-story.html'), 'utf8');
  const sources = [...html.matchAll(/<img class="photo-slot" src="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(sources.length, 8);
  assert.equal(new Set(sources).size, 8);
  for (const source of sources) {
    assert.equal(source.includes('assets/images/our-story/scene'), false);
    assert.equal(fs.existsSync(path.resolve(source)), true, `${source} must exist`);
  }
});
