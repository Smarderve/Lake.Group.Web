import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('local forms lab uses the real local entrypoint and same-origin routes', () => {
  const source = read('backend/src/forms-local-index.js');
  const localApp = read('backend/src/forms-local-app.js');
  assert.match(source, /formsLocalTestConfigProblems/);
  assert.match(source, /createLocalFormsApp/);
  assert.match(source, /createSmtpMailer/);
  assert.match(source, /createClamdScanner/);
  assert.match(localApp, /express\.static/);
  assert.match(localApp, /mountFormsTerminalHandlers/);
  assert.match(source, /8080/);
  assert.match(source, /127\.0\.0\.1/);
});

test('local operator scripts protect credentials and never submit a form automatically', () => {
  const setup = read('deployment/windows/forms-local/setup-local-test.ps1');
  const start = read('deployment/windows/forms-local/start-local-test.ps1');
  const verify = read('deployment/windows/forms-local/verify-local-test.ps1');
  assert.match(setup, /Read-Host 'Gmail App Password' -AsSecureString/);
  assert.match(setup, /SetAccessRuleProtection\(\$true, \$false\)/);
  assert.match(start, /DOTENV_CONFIG_PATH/);
  assert.match(verify, /SMTP\/Gmail receipt/);
  assert.doesNotMatch(`${setup}\n${start}\n${verify}`, /contact\/messages|careers\/applications/);
});

test('production template is provider-neutral and local test values remain isolated', () => {
  const production = read('deployment/windows/forms/forms.production.env.template');
  const local = read('deployment/windows/forms-local/setup-local-test.ps1');
  assert.match(production, /FORMS_MODE=production/);
  assert.match(production, /SMTP_HOST=<LAKE_APPROVED_SMTP_HOST>/);
  assert.doesNotMatch(production, /smtp\.gmail\.com|projectdevemail001@gmail\.com/);
  assert.match(local, /FORMS_MODE=local-test/);
  assert.match(local, /smtp\.gmail\.com/);
});
