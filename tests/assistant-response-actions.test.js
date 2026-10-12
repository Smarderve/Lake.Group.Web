const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const js = fs.readFileSync(path.join(__dirname, '..', 'assets', 'assistant.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'assistant.css'), 'utf8');

test('completed assistant replies receive the six actions once in the required order', () => {
  const start = js.indexOf('function addResponseActions(');
  const end = js.indexOf('function setRating(', start);
  const actionBuilder = js.slice(start, end);
  const order = ['copy', 'share', 'speaker', 'regenerate', 'thumb-up', 'thumb-down'];
  const positions = order.map((kind) => actionBuilder.indexOf(`responseAction(article, '${kind}'`));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(actionBuilder, /if \(!article \|\| article\._actionBar\) return/);
  assert.match(js, /addResponseActions\(answerArticle, answerText, payload\.locale\)/);
});

test('copy and share operate on answer text only, with clipboard fallback and explicit sharing choices', () => {
  assert.match(js, /function copyResponse\(text\)/);
  assert.match(js, /navigator\.clipboard\.writeText\(text\)/);
  assert.match(js, /document\.execCommand\('copy'\)/);
  assert.match(js, /navigator\.share\(\{ title: 'Lake Assistant response', text: article\._responseText \}\)/);
  assert.match(js, /wa\.me\/\?text=/);
  assert.match(js, /mailto:\?subject=/);
  assert.doesNotMatch(js, /navigator\.share\([^)]*url:/);
});

test('read aloud is local-voice-only, chunked, exclusive, and stopped on close/navigation', () => {
  assert.match(js, /synthesis\.getVoices\(\)\.filter\(function \(voice\) \{ return voice\.localService === true; \}\)/);
  assert.match(js, /function speechChunks\(text\)/);
  assert.match(js, /if \(speechState && speechState\.article === article\) \{ stopSpeech\(\); return; \}/);
  assert.match(js, /function closePanel\([\s\S]*?stopSpeech\(\)/);
  assert.match(js, /window\.addEventListener\('pagehide', function \(\) \{ cancelVoice\(false\); stopSpeech\(\); \}\)/);
});

test('feedback is local to each response and mutually exclusive; regeneration is latest-only and preserves prior content on failure', () => {
  assert.match(js, /article\._rating = rating/);
  assert.match(js, /article\._ratingButtons\.up\.setAttribute\('aria-pressed', rating === 'up' \? 'true' : 'false'\)/);
  assert.match(js, /article\._ratingButtons\.down\.setAttribute\('aria-pressed', rating === 'down' \? 'true' : 'false'\)/);
  assert.match(js, /if \(article !== latestResponseArticle \|\| activeChatController \|\| chatStreamActive \|\| article\._regenerating\) return/);
  assert.match(js, /\/api\/assistant\/regenerate/);
  assert.match(js, /article\._answerParagraph\.textContent = safeAnswerText\(nextAnswer\)/);
  assert.match(js, /Could not regenerate\. Your previous response is unchanged\./);
  assert.match(css, /\.la-response-action:focus-visible/);
  assert.match(css, /\.la-response-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
});
