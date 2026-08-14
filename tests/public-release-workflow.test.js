const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('CMS dispatch workflow validates, snapshots, verifies, and atomically deploys to Vercel', () => {
  const workflow = fs.readFileSync(path.resolve('.github/workflows/public-release.yml'), 'utf8');
  assert.match(workflow, /repository_dispatch:/);
  assert.match(workflow, /cms-publication/);
  assert.match(workflow, /public:snapshot -- --api-base/);
  assert.match(workflow, /test:public-delivery/);
  assert.match(workflow, /secret:scan/);
  assert.match(workflow, /vercel build --prod/);
  assert.match(workflow, /vercel deploy --prebuilt --prod/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /--token=/);
  assert.doesNotMatch(workflow, /actions\/upload-artifact/);
  assert.doesNotMatch(workflow, /^ {6}VERCEL_TOKEN:/m);
  assert.doesNotMatch(workflow, /client_payload\.public_api_base_url/);
});
