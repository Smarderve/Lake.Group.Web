const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets', 'assistant.js'), 'utf8');
const kbSource = fs.readFileSync(path.join(root, 'assets', 'assistant-kb.js'), 'utf8');

test('Assistant V2 keeps one deterministic controller and lazy knowledge loading', () => {
  assert.match(source, /LakeAssistantV2/);
  assert.match(source, /function knowledge\(/);
  assert.match(source, /FlexSearch/);
  assert.doesNotMatch(source, /innerHTML/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'assets', 'site.js'), 'utf8'), /function initChat/);
});

test('approved snapshot exposes structured, verified records', () => {
  assert.match(kbSource, /"entityType"/);
  assert.match(kbSource, /"verification":"VERIFIED"/);
  assert.match(kbSource, /"source":"approved-/);
  assert.match(kbSource, /Lake Aviation/);
  assert.match(source, /Lake Pipes/);
});

test('intent, follow-up, safe no-match, and accessibility contracts are present', () => {
  for (const name of ['COMPANY_INFO', 'PRODUCT_INFO', 'CONTACT', 'CAREERS', 'COUNTRIES', 'SUSTAINABILITY', 'FOLLOW_UP']) assert.match(source, new RegExp(name));
  assert.match(source, /currentEntity/);
  assert.match(source, /couldn't find a verified Lake Group answer/i);
  assert.match(source, /aria-modal/);
  assert.match(source, /Escape/);
});
