import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const kit = (name) => resolve(root, 'deployment', 'windows', 'forms', name);
const read = (name) => readFileSync(kit(name), 'utf8');
const moduleSource = read('modules/LakeFormsDeployment.psm1');

test('Windows forms deployment kit has all operator entrypoints', () => {
  for (const file of ['deploy-forms.ps1', 'verify-forms.ps1', 'rollback-forms.ps1', 'uninstall-forms.ps1', 'README-QUICK.txt', 'forms.env.template']) {
    assert.match(read(file), /\S/);
  }
});

test('deployment kit protects secrets and locks both test recipients', () => {
  assert.match(moduleSource, /Read-Host 'Gmail App Password' -AsSecureString/);
  assert.match(moduleSource, /ZeroFreeBSTR/);
  assert.match(moduleSource, /SetAccessRuleProtection\(\$true, \$false\)/);
  assert.match(moduleSource, /CONTACT_RECIPIENT_EMAIL=\$script:TestRecipient/);
  assert.match(moduleSource, /CAREERS_RECIPIENT_EMAIL=\$script:TestRecipient/);
  assert.match(moduleSource, /Test-FormsRecipientLock/);
});

test('deployment kit is rollbackable, idempotent, and loopback-only', () => {
  assert.match(moduleSource, /New-FormsSnapshot/);
  assert.match(moduleSource, /Restore-LakeFormsDeployment/);
  assert.match(moduleSource, /Register-ScheduledTask[\s\S]*-Force/);
  assert.match(moduleSource, /127\.0\.0\.1:4000/);
  assert.match(moduleSource, /LocalPort 3310/);
  assert.match(moduleSource, /-MultipleInstances IgnoreNew/);
});

test('deployment kit never creates public private-port firewall rules or sends form mail', () => {
  assert.doesNotMatch(moduleSource, /New-NetFirewallRule|Set-NetFirewallRule/);
  assert.match(moduleSource, /forms:verify-smtp/);
  assert.doesNotMatch(moduleSource, /contact\/messages|careers\/applications/);
});

test('deployment kit performs expected IIS and public route checks', () => {
  assert.match(moduleSource, /www\\\.lakeoilgroup\\\.com/);
  assert.match(moduleSource, /IIS Extensions\\URL Rewrite/);
  assert.match(moduleSource, /Application Request Routing/);
  assert.match(moduleSource, /api\/contact\/token/);
  assert.match(moduleSource, /api\/careers\/token/);
});
