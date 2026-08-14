const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflows = fs.readdirSync(path.resolve('.github/workflows'))
  .filter((file) => file.endsWith('.yml'))
  .map((file) => ({
    file,
    source: fs.readFileSync(path.resolve('.github/workflows', file), 'utf8'),
  }));

test('third-party workflow actions are pinned to immutable commit SHAs', () => {
  for (const { file, source } of workflows) {
    for (const match of source.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)) {
      assert.match(match[1], /@[0-9a-f]{40}$/, `${file}: ${match[1]}`);
    }
  }
});

test('workflows default to read-only contents and checkout drops credentials', () => {
  for (const { file, source } of workflows) {
    assert.match(source, /^permissions:\s*\n\s+contents:\s+read\s*$/m, file);
    const checkoutCount = [...source.matchAll(/uses:\s*actions\/checkout@/g)].length;
    const noCredentialsCount = [...source.matchAll(/persist-credentials:\s*false/g)].length;
    assert.equal(noCredentialsCount, checkoutCount, `${file}: every checkout must drop credentials`);
    assert.doesNotMatch(source, /pull_request_target:/, `${file}: privileged PR trigger`);
  }
});
