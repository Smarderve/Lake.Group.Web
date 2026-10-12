const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const js = fs.readFileSync(path.join(__dirname, '..', 'assets', 'assistant.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'assistant.css'), 'utf8');

test('the shared renderer attaches role-specific actions immediately, including welcome and errors', () => {
  const draw = js.slice(js.indexOf('function draw('), js.indexOf('function streamArticle('));
  assert.match(draw, /if \(isUser\) addUserActions\(article\);/);
  assert.match(draw, /else addResponseActions\(article, message\.text, message\.locale, article\._messageKind/);
  assert.match(js, /draw\(\{ role: 'bot', type: 'welcome', text: welcomeText \}\)/);
  assert.match(js, /draw\(\{ role: 'bot', type: 'error',[\s\S]*?questionArticle: questionArticle \}\)/);
  assert.match(js, /function addUserActions\(article\)/);
  const userActions = js.slice(js.indexOf('function addUserActions('), js.indexOf('function openMessageEditor('));
  assert.match(userActions, /responseAction\(article, 'copy'/);
  assert.match(userActions, /responseAction\(article, 'edit'/);
  assert.doesNotMatch(userActions, /responseAction\(article, '(share|speaker|regenerate|thumb-up|thumb-down)'/);
});

test('assistant action capability depends on message type and always includes standard actions', () => {
  const actionBuilder = js.slice(js.indexOf('function addResponseActions('), js.indexOf('function addUserActions('));
  for (const kind of ['copy', 'share', 'speaker', 'thumb-up', 'thumb-down']) {
    assert.match(actionBuilder, new RegExp(`responseAction\\(article, '${kind}'`));
  }
  assert.match(actionBuilder, /if \(kind === 'assistant' \|\| kind === 'success'\)[\s\S]*?responseAction\(article, 'regenerate'/);
  assert.match(actionBuilder, /if \(kind === 'error'\)[\s\S]*?responseAction\(article, 'regenerate', 'Retry failed question'/);
  assert.match(actionBuilder, /if \(kind === 'assistant' \|\| kind === 'success'\) setLatestResponse\(article\)/);
  assert.match(actionBuilder, /if \(!article \|\| article\._actionBar\) return/);
  assert.match(js, /addResponseActions\(answerArticle, answerText, payload\.locale, 'assistant', turnId, questionArticle\)/);
});

test('copy and share operate on the individual message text with explicit fallbacks', () => {
  assert.match(js, /function copyResponse\(text\)/);
  assert.match(js, /navigator\.clipboard\.writeText\(text\)/);
  assert.match(js, /document\.execCommand\('copy'\)/);
  assert.match(js, /navigator\.share\(\{ title: 'Lake Assistant response', text: message \}\)/);
  assert.match(js, /function openShareDialog\(article, button\)/);
  assert.match(js, /Share response/);
  assert.doesNotMatch(js, /la-share-menu/);
  assert.match(js, /wa\.me\/\?text=/);
  assert.match(js, /mailto:\?subject=/);
  assert.doesNotMatch(js, /navigator\.share\([^)]*url:/);
  assert.match(js, /article\._messageText = messageText/);
});

test('read aloud waits for a matching on-device voice, chunks playback, and stops on close/navigation', () => {
  assert.match(js, /function onDeviceSpeechVoice\(synthesis, language, timeoutMs\)/);
  assert.match(js, /item\.localService === true && String\(item\.lang \|\| ''\)\.toLowerCase\(\)\.split\('-'\)\[0\] === language/);
  assert.match(js, /synthesis\.addEventListener\('voiceschanged', check\)/);
  assert.match(js, /onDeviceSpeechVoice\(synthesis, language, 1800\)/);
  assert.match(js, /function speechChunks\(text\)/);
  assert.match(js, /if \(speechState && speechState\.article === article\) \{ stopSpeech\(\); return; \}/);
  assert.match(js, /function closePanel\([\s\S]*?stopSpeech\(\)/);
  assert.match(js, /window\.addEventListener\('pagehide', function \(\) \{ cancelVoice\(false\); stopSpeech\(\); \}\)/);
});

test('message editing uses a stable turn identity and commits the server branch before replacing visible history', () => {
  assert.match(js, /function messageUuid\(\)/);
  assert.match(js, /JSON\.stringify\(\{ message: query, turnId: turnId/);
  assert.match(js, /\/api\/assistant\/edit/);
  assert.match(js, /JSON\.stringify\(\{ turnId: turnId, message: query/);
  assert.match(js, /var answerText = String\(payload && payload\.answer \|\| streamedText\)\.trim\(\)/);
  assert.match(js, /questionArticle\._answerParagraph\.textContent = safeAnswerText\(query\)/);
  assert.match(js, /messages\.slice\(userPosition \+ 1\)\.forEach\(function \(item\) \{ if \(item !== priorAssistant\) item\.remove\(\); \}\)/);
  assert.match(js, /Your previous messages are unchanged/);
  assert.match(js, /article\._messageBody\.replaceWith\(editor\)/);
  assert.match(js, /editor\.root\.replaceWith\(editor\.originalBody\)/);
  assert.match(js, /draft is unsent and history is unchanged/i);
  assert.match(js, /function retryFailedTurn\(errorArticle, questionArticle, turnId\)/);
  assert.match(js, /function closeMessageEditor\(article\)[\s\S]*?article\._actionBar\.hidden = false/);
});

test('feedback is per assistant message, mutually exclusive, and regeneration uses the latest endpoint or safe branch editing', () => {
  assert.match(js, /article\._rating = rating/);
  assert.match(js, /article\._ratingButtons\.up\.setAttribute\('aria-pressed', rating === 'up' \? 'true' : 'false'\)/);
  assert.match(js, /article\._ratingButtons\.down\.setAttribute\('aria-pressed', rating === 'down' \? 'true' : 'false'\)/);
  assert.match(js, /function openFeedbackDialog\(article, button, rating\)/);
  assert.match(js, /categoriesForRating = rating === 'up'[\s\S]*?'Accurate information', 'Answered my question', 'Clear and easy to understand', 'Helpful and detailed', 'Relevant and useful information', 'Good language and tone', 'Fast and responsive', 'Other'[\s\S]*?'Incorrect information', "Didn't answer my question", 'Incomplete or vague answer', 'Lost conversation context', 'Outdated information', 'Unreliable or irrelevant sources', 'Wrong language or unclear wording', 'Slow response or technical issue', 'Safety or privacy concern', 'Other'/);
  assert.match(js, /sessionFeedback\[article\._messageId\] = record/);
  assert.match(js, /article\._feedback = record/);
  const feedbackDialog = js.slice(js.indexOf('function openFeedbackDialog('), js.indexOf('function openShareDialog('));
  assert.doesNotMatch(feedbackDialog, /fetch\(|XMLHttpRequest/);
  const ratingImplementation = js.slice(js.indexOf('function setRating('), js.indexOf('function copyResponse('));
  assert.doesNotMatch(ratingImplementation, /actionFeedback\(/);
  assert.match(js, /function closeFeedbackDialog\(restoreFocus\)/);
  assert.match(js, /feedbackDialogState && feedbackDialogState\.article === article\) closeFeedbackDialog\(false\)/);
  assert.match(js, /if \(article !== latestResponseArticle && questionArticle && turnId\)[\s\S]*?applyEditedTurn\(questionArticle, questionArticle\._messageText, null, article\)/);
  assert.match(js, /if \(article !== latestResponseArticle \|\| activeChatController \|\| chatStreamActive \|\| article\._regenerating\) return/);
  assert.match(js, /\/api\/assistant\/regenerate/);
  assert.match(js, /article\._answerParagraph\.textContent = safeAnswerText\(nextAnswer\)/);
  assert.match(js, /Could not regenerate\. Your previous response is unchanged\./);
  assert.match(js, /article\._ratingButtons\.up\.setAttribute\('aria-pressed'/);
  assert.doesNotMatch(js.slice(js.indexOf('function setRating('), js.indexOf('function copyResponse(')), /actionFeedback\(/);
  assert.match(css, /\.la-rating-action\.is-active \.la-rating-filled \{ display: block; \}/);
  assert.match(css, /\.la-rating-action\.is-active \{ color: #59656b; \}/);
  assert.doesNotMatch(css, /\.la-rating-action\.is-active \{ background: rgba/);
  assert.match(css, /\.la-feedback-toast[\s\S]*?pointer-events: none/);
  assert.match(css, /\.la-feedback-dialog/);
  assert.match(css, /\.la-feedback-category\.is-selected/);
  assert.match(css, /\.la-action-feedback\s*\{[^}]*position:\s*absolute[^}]*clip:\s*rect\(0, 0, 0, 0\)/s);
  assert.match(js, /function flashCopied\(article, button, text\)/);
  assert.match(js, /function actionContext\(button, text, duration\)/);
});

test('the persistent action bars and inline editor have visible focus and touch-friendly layout', () => {
  assert.match(css, /\.la-response-actions\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.la-user-actions\s*\{[^}]*align-self:\s*flex-end/s);
  assert.match(css, /\.la-response-action:focus-visible/);
  assert.match(css, /\.la-message-editor/);
  assert.match(css, /\.la-message-editor:focus-within/);
  assert.match(css, /\.la-edit-controls \.la-edit-save/);
  assert.match(css, /\.la-share-dialog/);
  assert.match(css, /\.la-share-layer/);
  assert.doesNotMatch(css, /\.la-response-actions[^}]*opacity:\s*0/);
});
