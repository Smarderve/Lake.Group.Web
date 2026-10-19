const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

function startStaticSite() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
      const content = await fs.readFile(file);
      response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(content);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

function ndjson(events) {
  return `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
}

function isScreenReaderOnly(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.position === 'absolute' && style.width === '1px' && style.height === '1px' && style.overflow === 'hidden' && style.clip !== 'auto';
  });
}

test('actual Chrome website renders message actions, retries and rewrites edited conversation history', async (t) => {
  const { server, url } = await startStaticSite();
  let browser = null;
  const evidenceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lake-assistant-actions-'));
  const editCalls = [];
  let failNextEdit = false;
  let holdNextRegenerate = false;
  let releaseRegenerate;
  let notifyRegenerateStarted;
  t.after(async () => {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    process.stdout.write(`Browser screenshots: ${evidenceDir}\n`);
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });

  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const page = await context.newPage();
  page.setDefaultTimeout(5_000);
  await page.addInitScript(() => {
    const calls = [];
    const voice = { name: 'Local English fixture voice', lang: 'en-US', localService: true };
    let voiceList = [voice];
    const synthesis = { getVoices: () => voiceList, addEventListener: (type, listener) => window.addEventListener('fixture-' + type, listener), removeEventListener: (type, listener) => window.removeEventListener('fixture-' + type, listener), cancel: () => calls.push({ type: 'cancel' }), speak: (utterance) => calls.push({ type: 'speak', text: utterance.text }) };
    window.__setSpeechVoices = (voices) => { voiceList = voices; window.dispatchEvent(new Event('fixture-voiceschanged')); };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
    Object.defineProperty(window.navigator, 'share', { configurable: true, value: (payload) => { calls.push({ type: 'share', payload }); return Promise.resolve(); } });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    window.__speechCalls = calls;
  });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/api/assistant/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;
    if (endpoint.endsWith('/health')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready' }) });
    if (endpoint.endsWith('/voice-health')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ready: false, reason: 'runtime_unavailable' }) });
    if (endpoint.endsWith('/chat')) {
      const body = request.postDataJSON();
      if (body.message === 'hi') return route.fulfill({ status: 503, contentType: 'application/json', headers: { 'Set-Cookie': 'lake_assistant.sid=39eea75e-7474-41ca-8447-211f1292d3a9; Path=/api/assistant; HttpOnly; SameSite=Lax' }, body: JSON.stringify({ error: { code: 'ASSISTANT_UNAVAILABLE', message: 'Unavailable' } }) });
      const answer = body.message.includes('Aviation') ? 'Lake Aviation answer from the controlled browser fixture.' : 'Lake Group answer from the controlled browser fixture.';
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', headers: { 'Set-Cookie': 'lake_assistant.sid=39eea75e-7474-41ca-8447-211f1292d3a9; Path=/api/assistant; HttpOnly; SameSite=Lax' }, body: ndjson([{ type: 'delta', text: answer.slice(0, 14) }, { type: 'delta', text: answer.slice(14) }, { type: 'done', answer, turnId: body.turnId, grounded: true, status: 'ok', locale: 'en', sources: [{ title: 'Lake Group', url: 'https://www.lakeoilgroup.com/about.html' }] }]) });
    }
    if (endpoint.endsWith('/edit')) {
      const body = request.postDataJSON(); editCalls.push(body);
      if (failNextEdit) {
        failNextEdit = false;
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'EDIT_FAILED', message: 'Unavailable' } }) });
      }
      const answer = `Replacement answer for: ${body.message}`;
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: ndjson([{ type: 'delta', text: answer }, { type: 'done', answer, turnId: body.turnId, grounded: true, status: 'ok', locale: 'en', sources: [] }]) });
    }
    if (endpoint.endsWith('/regenerate')) {
      if (holdNextRegenerate) {
        holdNextRegenerate = false;
        await new Promise((resolve) => { releaseRegenerate = resolve; if (notifyRegenerateStarted) notifyRegenerateStarted(); });
      }
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: ndjson([{ type: 'delta', text: 'Regenerated fixture answer.' }, { type: 'done', answer: 'Regenerated fixture answer.', grounded: true, status: 'ok', locale: 'en', sources: [] }]) });
    }
    return route.fulfill({ status: 404, body: '' });
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const launcher = page.locator('#chat-widget .la-launcher');
  await launcher.waitFor({ state: 'visible', timeout: 15_000 });
  await launcher.click();
  const welcomeTyping = page.locator('#chat-widget .la-typing');
  await welcomeTyping.waitFor({ state: 'visible' });
  assert.equal(await welcomeTyping.locator('.la-assistant-avatar').count(), 1, 'welcome typing indicator has the assistant avatar');
  assert.equal(await page.locator('#chat-widget .la-head .la-brand-name').textContent(), 'Lake AI');
  assert.match(await page.locator('#chat-widget .la-head .la-brand-name').evaluate((name) => getComputedStyle(name).fontFamily), /^Jost,/i, 'Lake AI name uses the approved clean Jost UI font');
  const headerAvatar = page.locator('#chat-widget .la-head .la-assistant-avatar img');
  await headerAvatar.evaluate((image) => image.decode());
  assert.equal(await headerAvatar.evaluate((image) => image.naturalWidth > 0), true, 'header avatar loads the approved Lake symbol asset');
  await page.screenshot({ path: path.join(evidenceDir, 'desktop-typing-indicator.png'), fullPage: false });
  await page.getByText('Hi there! How can I help you today?', { exact: true }).waitFor({ state: 'visible' });
  const welcome = page.locator('#chat-widget .la-message.la-bot').first();
  assert.deepEqual(await welcome.locator('.la-response-action').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))), [
    'Copy message', 'Share message', 'Read message aloud', 'Good response', 'Bad response',
  ]);
  assert.equal(await welcome.locator('.la-response-actions').evaluate((bar) => getComputedStyle(bar).display), 'flex');
  const speaker = welcome.getByRole('button', { name: 'Read message aloud' });
  await page.evaluate(() => window.__setSpeechVoices([]));
  await speaker.click();
  const activeSpeaker = welcome.locator('.la-response-action[aria-pressed="true"]').first();
  assert.equal(await activeSpeaker.getAttribute('aria-pressed'), 'true');
  const speechStatus = welcome.locator('.la-action-feedback');
  await page.waitForFunction(() => document.querySelector('#chat-widget .la-action-feedback')?.textContent === 'Looking for an on-device voice…');
  assert.equal(await isScreenReaderOnly(speechStatus), true, 'speech status is available to screen readers only');
  await page.evaluate(() => window.__setSpeechVoices([{ name: 'Local English fixture voice', lang: 'en-US', localService: true }]));
  await page.waitForFunction(() => window.__speechCalls.some((call) => call.type === 'speak' && call.text.includes('Hi there!')));
  assert.equal(await page.evaluate(() => window.__speechCalls.some((call) => call.type === 'speak' && call.text.includes('Hi there!'))), true);
  await activeSpeaker.click();
  assert.equal(await welcome.getByRole('button', { name: 'Read message aloud' }).getAttribute('aria-pressed'), 'false');
  await welcome.evaluate((article) => { article._responseLocale = 'sw'; });
  await page.evaluate(() => window.__setSpeechVoices([]));
  await welcome.getByRole('button', { name: 'Read message aloud' }).click();
  await page.waitForFunction(() => document.querySelector('#chat-widget .la-action-feedback')?.textContent.includes('No on-device voice is available. Your message was not sent anywhere.'));
  assert.equal(await isScreenReaderOnly(speechStatus), true, 'voice-unavailable explanation is screen-reader-only');
  assert.match(await welcome.getByRole('button', { name: 'Read message aloud' }).getAttribute('title'), /No on-device voice is available/);
  await welcome.evaluate((article) => { article._responseLocale = 'en'; });
  await page.evaluate(() => window.__setSpeechVoices([{ name: 'Local English fixture voice', lang: 'en-US', localService: true }]));
  const shareButton = welcome.getByRole('button', { name: 'Share message' });
  await shareButton.click();
  const shareDialog = page.locator('#chat-widget .la-share-dialog');
  await shareDialog.waitFor({ state: 'visible' });
  assert.equal(await shareDialog.getByRole('heading', { name: 'Share response' }).count(), 1);
  assert.match(await shareDialog.locator('.la-share-preview').textContent(), /Hi there!/);
  const optionLabels = await shareDialog.locator('.la-share-option:not([hidden]) span').allTextContents();
  assert.deepEqual(optionLabels, ['WhatsApp', 'Telegram', 'Facebook', 'X', 'LinkedIn', 'Email', 'More apps']);
  const logoChecks = await shareDialog.locator('.la-share-option img').evaluateAll((images) => images.map((image) => ({ source: image.getAttribute('src'), complete: image.complete, width: image.naturalWidth, height: image.naturalHeight })));
  assert.equal(logoChecks.length, 5);
  assert.equal(logoChecks.every((image) => image.complete && image.width > 0 && image.height > 0), true, 'bundled brand SVGs load as sharp local vector images');
  const whatsappHref = await shareDialog.locator('[data-share-target="whatsapp"]').getAttribute('href');
  assert.match(whatsappHref, /^https:\/\/wa\.me\/\?text=/);
  assert.match(decodeURIComponent(whatsappHref), /Hi there!/);
  const telegramUrl = new URL(await shareDialog.locator('[data-share-target="telegram"]').getAttribute('href'));
  assert.equal(telegramUrl.hostname, 't.me');
  assert.equal(telegramUrl.pathname, '/share/url');
  assert.equal(telegramUrl.searchParams.get('url'), 'https://www.lakeoilgroup.com/');
  assert.match(telegramUrl.searchParams.get('text'), /Hi there!/);
  const facebookUrl = new URL(await shareDialog.locator('[data-share-target="facebook"]').getAttribute('href'));
  assert.equal(facebookUrl.hostname, 'www.facebook.com');
  assert.equal(facebookUrl.searchParams.get('u'), 'https://www.lakeoilgroup.com/');
  assert.equal(facebookUrl.searchParams.has('quote'), false, 'Facebook fallback shares only a public URL, not unsupported response text');
  const linkedinUrl = new URL(await shareDialog.locator('[data-share-target="linkedin"]').getAttribute('href'));
  assert.equal(linkedinUrl.hostname, 'www.linkedin.com');
  assert.equal(linkedinUrl.searchParams.get('url'), 'https://www.lakeoilgroup.com/');
  assert.equal(linkedinUrl.searchParams.has('text'), false, 'LinkedIn public share URL does not pretend to prefill answer text');
  const xUrl = new URL(await shareDialog.locator('[data-share-target="x"]').getAttribute('href'));
  assert.equal(xUrl.hostname, 'twitter.com');
  assert.equal(xUrl.pathname, '/intent/tweet');
  assert.ok(Array.from(xUrl.searchParams.get('text')).length <= 280);
  assert.match(await shareDialog.locator('.la-share-note').textContent(), /Facebook and LinkedIn share Lake Group’s public website link/);
  assert.equal(await shareDialog.locator('[data-share-target="sms"]').isVisible(), false, 'SMS is hidden on the desktop browser');
  assert.equal(await shareDialog.getByRole('button', { name: 'Copy response' }).count(), 1);
  await shareDialog.getByRole('button', { name: 'More apps' }).click();
  await shareDialog.waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => window.__speechCalls.some((call) => call.type === 'share' && call.payload.text.includes('Hi there!'))), true, 'native sharing is available from its explicit More apps option');
  await page.evaluate(() => Object.defineProperty(window.navigator, 'share', { configurable: true, value: undefined }));
  await shareButton.click();
  await shareDialog.waitFor({ state: 'visible' });
  assert.equal(await shareDialog.getByRole('button', { name: 'More apps' }).count(), 0, 'native option is omitted when unavailable');
  assert.equal(await shareDialog.locator('.la-share-option:not([hidden]) span').count(), 6);
  await shareDialog.getByRole('button', { name: 'Copy response' }).click();
  await shareDialog.waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.querySelector('#chat-widget .la-action-feedback')?.textContent.includes('Copied'));
  assert.equal(await isScreenReaderOnly(page.locator('#chat-widget .la-action-feedback')), true, 'share copy confirmation does not add a visible row');
  await shareButton.click();
  await shareDialog.waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await shareDialog.waitFor({ state: 'detached' });
  assert.equal(await shareButton.evaluate((button) => button === document.activeElement), true, 'Escape restores focus to Share');
  await shareButton.click();
  await shareDialog.waitFor({ state: 'visible' });
  const panelBounds = await page.locator('#chat-widget .la-panel').boundingBox();
  await page.mouse.click(panelBounds.x + 8, panelBounds.y + 8);
  await shareDialog.waitFor({ state: 'detached' });
  assert.equal(await page.locator('#chat-widget .la-panel').isVisible(), true, 'clicking outside the share dialog but inside chat keeps chat open');
  await shareButton.click();
  await shareDialog.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(evidenceDir, 'desktop-share-dialog.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(evidenceDir, 'desktop-welcome-actions.png'), fullPage: false });

  const input = page.locator('#chat-widget .la-form textarea');
  const composer = page.locator('#chat-widget .la-form');
  const composerBeforeTyping = await composer.boundingBox();
  const micBeforeTyping = await page.locator('#chat-widget .la-voice').boundingBox();
  const sendBeforeTyping = await page.locator('#chat-widget .la-send').boundingBox();
  assert.equal(await input.evaluate((textarea) => getComputedStyle(textarea).paddingTop), '8px', 'placeholder and typed text share the lowered text inset');
  await input.fill('hi'); await page.locator('#chat-widget .la-send').click();
  const composerAfterTyping = await composer.boundingBox();
  assert.equal(composerAfterTyping.height, composerBeforeTyping.height, 'short typed text preserves the approved composer height');
  assert.deepEqual(await page.locator('#chat-widget .la-voice').boundingBox(), micBeforeTyping, 'microphone remains fixed while typing');
  assert.deepEqual(await page.locator('#chat-widget .la-send').boundingBox(), sendBeforeTyping, 'Send remains fixed while typing');
  await page.getByText('Lake Assistant is temporarily unavailable. Please try again shortly.', { exact: true }).waitFor({ state: 'visible' });
  const user = page.locator('#chat-widget .la-message.la-user').first();
  const error = page.locator('#chat-widget .la-message.la-bot').filter({ hasText: 'temporarily unavailable' });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#chat-widget .la-message.la-user')).opacity === '1');
  assert.deepEqual(await user.locator('.la-response-action').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))), ['Copy your message', 'Edit your message']);
  assert.equal(await user.locator('.la-message-body').evaluate((bubble) => getComputedStyle(bubble).backgroundColor), 'rgb(1, 129, 187)');
  assert.equal(await user.evaluate((article) => getComputedStyle(article).opacity), '1');
  assert.equal(await user.locator('.la-assistant-avatar').count(), 0, 'visitor messages never show the Lake AI avatar');
  assert.equal(await error.locator('.la-assistant-avatar').count(), 1, 'assistant error messages retain the Lake AI avatar');
  assert.deepEqual(await error.locator('.la-response-action').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))), [
    'Copy message', 'Share message', 'Read message aloud', 'Good response', 'Bad response', 'Retry failed question',
  ]);
  await page.screenshot({ path: path.join(evidenceDir, 'desktop-error-and-user-actions.png'), fullPage: false });

  await error.getByRole('button', { name: 'Retry failed question' }).click();
  await page.getByText('Replacement answer for: hi', { exact: true }).waitFor({ state: 'visible' });
  const firstSuccess = page.locator('#chat-widget .la-message.la-bot').filter({ hasText: 'Replacement answer for: hi' });
  assert.deepEqual(await firstSuccess.locator('.la-response-action').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))), [
    'Copy message', 'Share message', 'Read message aloud', 'Regenerate response', 'Good response', 'Bad response',
  ]);
  assert.equal(await firstSuccess.getByRole('button', { name: 'Regenerate response' }).isDisabled(), false, 'every successful AI response keeps regeneration available');
  await firstSuccess.getByRole('button', { name: 'Copy message' }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'Replacement answer for: hi');

  await input.fill('Tell me about Lake Aviation.'); await page.locator('#chat-widget .la-send').click();
  await page.getByText('Lake Aviation answer from the controlled browser fixture.', { exact: true }).waitFor({ state: 'visible' });
  await input.fill('Tell me more.'); await page.locator('#chat-widget .la-send').click();
  await page.getByText('Lake Group answer from the controlled browser fixture.', { exact: true }).waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(evidenceDir, 'desktop-multi-message-actions.png'), fullPage: false });

  const latest = page.locator('#chat-widget .la-message.la-bot').last();
  const beforeReaction = await latest.evaluate((article) => article.getBoundingClientRect().height);
  await page.screenshot({ path: path.join(evidenceDir, 'reaction-default-toolbar.png'), fullPage: false });
  await latest.locator('.la-response-actions').screenshot({ path: path.join(evidenceDir, 'reaction-default-icons.png') });
  assert.equal(await latest.locator('.la-rating-action .la-rating-outline').count(), 2, 'both reactions begin with outline variants');
  assert.deepEqual(await latest.locator('.la-rating-action .la-rating-filled').evaluateAll((icons) => icons.map((icon) => getComputedStyle(icon).display)), ['none', 'none']);
  await latest.getByRole('button', { name: 'Good response' }).click();
  const positive = page.getByRole('dialog', { name: 'Share positive feedback' });
  await positive.waitFor({ state: 'visible' });
  await page.waitForTimeout(180);
  assert.equal(await latest.getByRole('button', { name: 'Good response' }).getAttribute('aria-pressed'), 'false', 'Like is uncommitted until Submit');
  assert.equal(await positive.locator('legend').textContent(), 'What did Lake Assistant do well? Select all that apply.');
  assert.deepEqual(await positive.locator('.la-feedback-category').allTextContents(), [
    'Accurate information', 'Answered my question', 'Clear and easy to understand', 'Helpful and detailed', 'Relevant and useful information', 'Good language and tone', 'Fast and responsive', 'Other',
  ]);
  await page.screenshot({ path: path.join(evidenceDir, 'reaction-positive-feedback-dialog.png'), fullPage: false });
  await positive.getByRole('button', { name: 'Accurate information' }).click();
  await positive.getByRole('button', { name: 'Helpful and detailed' }).click();
  await positive.locator('.la-feedback-details').fill('The answer was accurate and easy to follow.');
  await positive.getByRole('button', { name: 'Submit' }).click();
  await page.waitForTimeout(180);
  const positiveButton = latest.getByRole('button', { name: 'Good response' });
  assert.equal(await positiveButton.getAttribute('aria-pressed'), 'true');
  assert.equal(await latest.getByRole('button', { name: 'Bad response' }).getAttribute('aria-pressed'), 'false');
  assert.equal(await positiveButton.evaluate((button) => getComputedStyle(button).backgroundColor), 'rgba(0, 0, 0, 0)', 'selected Like has no tile background');
  assert.equal(await positiveButton.locator('.la-rating-outline').evaluate((icon) => getComputedStyle(icon).display), 'none');
  assert.equal(await positiveButton.locator('.la-rating-filled').evaluate((icon) => getComputedStyle(icon).display), 'block');
  assert.equal(await positiveButton.locator('.la-rating-filled path').evaluate((path) => getComputedStyle(path).fill), 'rgb(89, 101, 107)', 'selected Like is a solid neutral icon');
  assert.equal(await latest.evaluate((article) => article._feedback.rating), 'up');
  assert.deepEqual(await latest.evaluate((article) => article._feedback.categories), ['Accurate information', 'Helpful and detailed']);
  assert.equal(await latest.locator('.la-action-feedback').count(), 0, 'reaction adds no feedback text beneath the message');
  assert.equal(await latest.evaluate((article) => article.getBoundingClientRect().height), beforeReaction, 'reaction does not shift message layout');
  const toast = page.locator('#chat-widget .la-feedback-toast');
  await toast.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#chat-widget .la-feedback-toast')?.classList.contains('is-visible'));
  await toast.locator('.la-feedback-toast-copy').waitFor({ state: 'visible' });
  assert.equal(await toast.locator('strong').textContent(), 'Thank you for your feedback!');
  assert.equal(await toast.locator('.la-feedback-toast-copy > span').textContent(), 'Your feedback has been saved.');
  assert.equal(await toast.evaluate((element) => element.getAttribute('aria-live')), 'polite');
  assert.equal(await toast.evaluate((element) => element.getBoundingClientRect().bottom <= element.closest('.la-panel').querySelector('.la-form').getBoundingClientRect().top), true, 'toast does not cover the composer');
  await page.screenshot({ path: path.join(evidenceDir, 'reaction-feedback-success-toast.png'), fullPage: false });
  await toast.waitFor({ state: 'detached', timeout: 4500 });
  await latest.locator('.la-response-actions').screenshot({ path: path.join(evidenceDir, 'reaction-selected-like.png') });
  await positiveButton.click();
  const reopenPositive = page.getByRole('dialog', { name: 'Share positive feedback' });
  await reopenPositive.waitFor({ state: 'visible' });
  assert.equal(await reopenPositive.getByRole('button', { name: 'Accurate information' }).getAttribute('aria-pressed'), 'true', 'reopening restores prior feedback selections');
  assert.equal(await reopenPositive.locator('.la-feedback-details').inputValue(), 'The answer was accurate and easy to follow.');
  await reopenPositive.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(await positiveButton.getAttribute('aria-pressed'), 'true', 'Cancel preserves committed positive feedback');
  assert.equal(await latest.evaluate((article) => article.getBoundingClientRect().height), beforeReaction, 'feedback toast and dialog do not shift message layout');

  const negativeButton = latest.getByRole('button', { name: 'Bad response' });
  await negativeButton.click();
  const feedback = page.getByRole('dialog', { name: 'Share feedback' });
  await feedback.waitFor({ state: 'visible' });
  await page.waitForTimeout(180);
  assert.equal(await negativeButton.getAttribute('aria-pressed'), 'false', 'Dislike is uncommitted until Submit');
  assert.equal(await latest.getByRole('button', { name: 'Good response' }).getAttribute('aria-pressed'), 'true', 'opening Dislike preserves the committed Like');
  assert.equal(await feedback.locator('legend').textContent(), 'What could Lake Assistant improve? Select all that apply.');
  assert.equal(await feedback.locator('.la-feedback-category').count(), 10);
  assert.deepEqual(await feedback.locator('.la-feedback-category').allTextContents(), [
    'Incorrect information', "Didn't answer my question", 'Incomplete or vague answer', 'Lost conversation context', 'Outdated information',
    'Unreliable or irrelevant sources', 'Wrong language or unclear wording', 'Slow response or technical issue', 'Safety or privacy concern', 'Other',
  ]);
  assert.equal(await feedback.getByRole('button', { name: 'Submit' }).isDisabled(), true, 'Submit requires a category or details');
  await page.screenshot({ path: path.join(evidenceDir, 'reaction-feedback-dialog.png'), fullPage: false });
  await feedback.getByRole('button', { name: 'Incorrect information' }).click();
  await feedback.getByRole('button', { name: 'Wrong language or unclear wording' }).click();
  assert.equal(await feedback.getByRole('button', { name: 'Incorrect information' }).getAttribute('aria-pressed'), 'true');
  assert.equal(await feedback.getByRole('button', { name: 'Wrong language or unclear wording' }).getAttribute('aria-pressed'), 'true');
  assert.equal(await feedback.locator('.la-feedback-categories').evaluate((el) => el.scrollWidth <= el.clientWidth), true, 'category chips wrap without horizontal overflow');
  await feedback.locator('.la-feedback-details').fill('The answer needs a source for this claim.');
  await page.screenshot({ path: path.join(evidenceDir, 'reaction-feedback-categories-selected.png'), fullPage: false });
  await feedback.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(await negativeButton.getAttribute('aria-pressed'), 'false', 'Cancel does not change the rating');
  assert.equal(await latest.evaluate((article) => article._feedback.rating), 'up', 'Cancel preserves the previously saved positive feedback');
  await negativeButton.click();
  const outsideDismiss = page.getByRole('dialog', { name: 'Share feedback' });
  await outsideDismiss.waitFor({ state: 'visible' });
  await outsideDismiss.locator('.la-share-close').focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('la-feedback-cancel')), true, 'keyboard focus wraps inside the feedback dialog');
  await page.locator('#chat-widget .la-head').click({ position: { x: 12, y: 16 } });
  await outsideDismiss.waitFor({ state: 'detached' });
  assert.equal(await page.locator('#chat-widget .la-panel').isVisible(), true, 'clicking outside feedback closes only the dialog');
  assert.equal(await negativeButton.getAttribute('aria-pressed'), 'false', 'outside dismissal does not save feedback');
  assert.equal(await latest.getByRole('button', { name: 'Good response' }).getAttribute('aria-pressed'), 'true', 'outside dismissal preserves the prior Like');
  await negativeButton.click();
  const closeByX = page.getByRole('dialog', { name: 'Share feedback' });
  await closeByX.getByRole('button', { name: 'Close feedback dialog' }).click();
  await closeByX.waitFor({ state: 'detached' });
  assert.equal(await negativeButton.getAttribute('aria-pressed'), 'false', 'X closes without saving feedback');
  assert.equal(await latest.getByRole('button', { name: 'Good response' }).getAttribute('aria-pressed'), 'true', 'X preserves the prior Like');

  await latest.getByRole('button', { name: 'Good response' }).click();
  await negativeButton.click();
  const cancelWithPositive = page.getByRole('dialog', { name: 'Share feedback' });
  await cancelWithPositive.getByRole('button', { name: 'Other', exact: true }).click();
  await cancelWithPositive.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(await latest.getByRole('button', { name: 'Good response' }).getAttribute('aria-pressed'), 'true', 'Cancel preserves the previous Like');

  await negativeButton.click();
  const feedbackToSubmit = page.getByRole('dialog', { name: 'Share feedback' });
  await feedbackToSubmit.getByRole('button', { name: 'Incorrect information' }).click();
  await feedbackToSubmit.getByRole('button', { name: 'Other', exact: true }).click();
  await feedbackToSubmit.locator('.la-feedback-details').fill('The answer needs a source for this claim.');
  await feedbackToSubmit.getByRole('button', { name: 'Submit' }).click();
  await page.waitForTimeout(180);
  assert.equal(await negativeButton.getAttribute('aria-pressed'), 'true');
  assert.equal(await latest.getByRole('button', { name: 'Good response' }).getAttribute('aria-pressed'), 'false', 'Dislike replaces Like');
  assert.equal(await negativeButton.evaluate((button) => getComputedStyle(button).backgroundColor), 'rgba(0, 0, 0, 0)', 'selected Dislike has no tile background');
  assert.equal(await negativeButton.locator('.la-rating-filled').evaluate((icon) => getComputedStyle(icon).display), 'block');
  assert.equal(await negativeButton.locator('.la-rating-filled path').evaluate((path) => getComputedStyle(path).fill), 'rgb(89, 101, 107)', 'selected Dislike is a solid neutral icon');
  assert.deepEqual(await latest.evaluate((article) => ({ messageId: article._feedback.messageId, rating: article._feedback.rating, categories: article._feedback.categories, details: article._feedback.details })), {
    messageId: await latest.getAttribute('data-message-id'), rating: 'down', categories: ['Incorrect information', 'Other'], details: 'The answer needs a source for this claim.',
  }, 'feedback is stored locally against the response message');
  assert.equal(await latest.locator('.la-action-feedback').count(), 0, 'Dislike adds no text under the response');
  assert.equal(await latest.evaluate((article) => article.getBoundingClientRect().height), beforeReaction, 'reaction dialog and state do not shift message layout');
  assert.equal(await firstSuccess.getByRole('button', { name: 'Good response' }).getAttribute('aria-pressed'), 'false', 'ratings are independent for each message');
  await latest.locator('.la-response-actions').screenshot({ path: path.join(evidenceDir, 'reaction-selected-dislike.png') });
  await negativeButton.click();
  const removeNegative = page.getByRole('dialog', { name: 'Share feedback' });
  await removeNegative.waitFor({ state: 'visible' });
  const selectedNegativeCategories = removeNegative.locator('.la-feedback-category[aria-pressed="true"]');
  while (await selectedNegativeCategories.count()) await selectedNegativeCategories.first().click();
  await removeNegative.locator('.la-feedback-details').fill('');
  assert.equal(await removeNegative.getByRole('button', { name: 'Submit' }).isDisabled(), false, 'existing feedback can be submitted empty to remove the reaction');
  await removeNegative.getByRole('button', { name: 'Submit' }).click();
  assert.equal(await negativeButton.getAttribute('aria-pressed'), 'false', 'submitting an empty revised response removes Dislike');
  assert.equal(await latest.evaluate((article) => article._feedback || null), null, 'removing Dislike clears the local record');
  const regenerateStarted = new Promise((resolve) => { notifyRegenerateStarted = resolve; });
  holdNextRegenerate = true;
  await latest.getByRole('button', { name: 'Regenerate response' }).click();
  await regenerateStarted;
  const regenerateTyping = page.locator('#chat-widget .la-regenerate-loading');
  await regenerateTyping.waitFor({ state: 'visible' });
  assert.equal(await regenerateTyping.locator('.la-assistant-avatar').count(), 1, 'regeneration loading state has the same assistant avatar');
  releaseRegenerate();
  await page.getByText('Regenerated fixture answer.', { exact: true }).waitFor({ state: 'visible' });
  assert.equal(await latest.locator('.la-assistant-avatar').count(), 1, 'regenerated assistant reply retains its avatar');

  const firstUser = page.locator('#chat-widget .la-message.la-user').first();
  await firstUser.getByRole('button', { name: 'Edit your message' }).click();
  const editor = firstUser.locator('.la-edit-input');
  assert.equal(await firstUser.locator('.la-message-body').count(), 0, 'editor replaces the original bubble in place');
  assert.equal(await firstUser.getByRole('button', { name: 'Send edited message' }).count(), 1);
  assert.deepEqual(await firstUser.locator('.la-edit-controls button').allTextContents(), ['Cancel', 'Send']);
  await page.screenshot({ path: path.join(evidenceDir, 'desktop-inline-edit.png'), fullPage: false });
  await editor.fill('What is Lake Group?');
  failNextEdit = true;
  await firstUser.getByRole('button', { name: 'Send edited message' }).click();
  await firstUser.getByText('Could not update. Your draft is unsent and history is unchanged. Choose Send to retry.', { exact: true }).waitFor({ state: 'visible' });
  await page.waitForTimeout(260);
  const editStatusBounds = await firstUser.evaluate((article) => { const message = article.getBoundingClientRect(); const viewport = article.closest('.la-messages').getBoundingClientRect(); return { top: message.top, bottom: message.bottom, viewportTop: viewport.top, viewportBottom: viewport.bottom }; });
  assert.ok(editStatusBounds.top >= editStatusBounds.viewportTop && editStatusBounds.bottom <= editStatusBounds.viewportBottom, 'failed edit scrolls its retained draft and status back into view');
  await page.screenshot({ path: path.join(evidenceDir, 'desktop-inline-edit-error.png'), fullPage: false });
  assert.equal(await editor.inputValue(), 'What is Lake Group?');
  assert.equal(await page.locator('#chat-widget .la-message.la-user').count(), 3, 'failed edit must preserve all later turns');
  await firstUser.getByRole('button', { name: 'Send edited message' }).click();
  await page.getByText('Replacement answer for: What is Lake Group?', { exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#chat-widget .la-message.la-user').count(), 1, 'successful edit must remove later turns from the visible branch');
  assert.equal(await page.locator('#chat-widget .la-message.la-user').first().locator('p').textContent(), 'What is Lake Group?');
  assert.equal(editCalls.length, 3);
  assert.equal(editCalls[1].turnId, editCalls[2].turnId, 'retry must keep the same turn identity');
  assert.equal(editCalls[2].message, 'What is Lake Group?');

  const editedUser = page.locator('#chat-widget .la-message.la-user').first();
  await editedUser.getByRole('button', { name: 'Edit your message' }).click();
  await editedUser.locator('.la-edit-input').fill('This draft should be discarded');
  await editedUser.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(await editedUser.locator('p').textContent(), 'What is Lake Group?');

  const longQuestion = 'Tell me about Lake Aviation and its operations, destinations, fleet, services, and how its work connects to the wider Lake Group businesses.';
  await input.fill(longQuestion); await page.locator('#chat-widget .la-send').click();
  await page.waitForFunction((question) => Array.from(document.querySelectorAll('#chat-widget .la-message.la-user')).some((user) => user.textContent.includes(question) && user.nextElementSibling?.classList.contains('la-bot') && user.nextElementSibling.textContent.includes('Lake Aviation answer from the controlled browser fixture.')), longQuestion);
  const longUser = page.locator('#chat-widget .la-message.la-user').last();
  await longUser.getByRole('button', { name: 'Edit your message' }).click();
  const longEditor = longUser.locator('.la-edit-input');
  assert.equal(await longEditor.inputValue(), longQuestion);
  assert.ok((await longEditor.boundingBox()).height > 40, 'long message editor grows to fit its draft');
  await longUser.getByRole('button', { name: 'Cancel' }).click();
  assert.equal(await longUser.locator('p').textContent(), longQuestion, 'cancel restores the complete long message');

  const copy = page.locator('#chat-widget .la-message.la-user').first().getByRole('button', { name: 'Copy your message' });
  await copy.click();
  const copiedState = await page.waitForFunction(() => {
    const button = document.querySelector('#chat-widget .la-message.la-user .la-response-action[aria-label="Message copied"]');
    if (!button || button.querySelector('svg path')?.getAttribute('d') !== 'm5 12 4 4L19 6') return false;
    const status = button.closest('.la-message').querySelector('.la-action-feedback');
    const style = getComputedStyle(status);
    return { icon: button.querySelector('svg path').getAttribute('d'), message: status.textContent, hidden: style.position === 'absolute' && style.width === '1px' && style.clip !== 'auto' };
  });
  const copied = await copiedState.jsonValue();
  assert.equal(copied.icon, 'm5 12 4 4L19 6', 'Copy changes to a checkmark');
  assert.match(copied.message, /copied/i);
  assert.equal(copied.hidden, true, 'Copy confirmation does not add visible text');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'What is Lake Group?');

  await page.locator('#chat-widget .la-close').click();
  await launcher.click();
  await page.getByText(/Welcome back! What can I help you with this time\?/).waitFor({ state: 'visible' });
  const welcomeBack = page.locator('#chat-widget .la-message.la-bot').last();
  assert.deepEqual(await welcomeBack.locator('.la-response-action').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))), [
    'Copy message', 'Share message', 'Read message aloud', 'Good response', 'Bad response',
  ]);
  const retainedUsers = page.locator('#chat-widget .la-message.la-user');
  assert.equal(await retainedUsers.count(), 2, 'reopening must retain the edited conversation and its later question');
  assert.equal(await retainedUsers.nth(0).locator('p').textContent(), 'What is Lake Group?');
  assert.equal(await retainedUsers.nth(1).locator('p').textContent(), longQuestion);
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(evidenceDir, 'mobile-welcome-back-actions.png'), fullPage: false });
  await page.evaluate(() => Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' }));
  const mobileShare = welcomeBack.getByRole('button', { name: 'Share message' });
  await mobileShare.click();
  const mobileShareDialog = page.locator('#chat-widget .la-share-dialog');
  await mobileShareDialog.waitFor({ state: 'visible' });
  assert.equal(await mobileShareDialog.getByRole('link', { name: 'Messages' }).isVisible(), true, 'SMS option appears on mobile devices');
  assert.match(await mobileShareDialog.getByRole('link', { name: 'Messages' }).getAttribute('href'), /^sms:\?body=/);
  const shareBounds = await mobileShareDialog.evaluate((dialog) => { const bounds = dialog.getBoundingClientRect(); return { left: bounds.left, right: bounds.right, bottom: bounds.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight }; });
  assert.ok(shareBounds.left >= 0 && shareBounds.right <= shareBounds.viewportWidth, 'mobile share sheet stays within viewport width');
  assert.ok(shareBounds.bottom <= shareBounds.viewportHeight, 'mobile share sheet stays within viewport height');
  assert.equal(await mobileShareDialog.locator('.la-share-options').evaluate((grid) => grid.scrollWidth <= grid.clientWidth), true, 'mobile sharing grid has no horizontal overflow');
  await page.screenshot({ path: path.join(evidenceDir, 'mobile-share-sheet.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await welcomeBack.getByRole('button', { name: 'Bad response' }).click();
  const mobileFeedback = page.getByRole('dialog', { name: 'Share feedback' });
  await mobileFeedback.waitFor({ state: 'visible' });
  const feedbackBounds = await mobileFeedback.evaluate((dialog) => { const bounds = dialog.getBoundingClientRect(); return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, width: bounds.width, viewportWidth: innerWidth, viewportHeight: innerHeight, scrollWidth: dialog.scrollWidth, clientWidth: dialog.clientWidth }; });
  assert.ok(feedbackBounds.left >= 0 && feedbackBounds.right <= feedbackBounds.viewportWidth, 'mobile feedback dialog stays within viewport width');
  assert.ok(feedbackBounds.top >= 0 && feedbackBounds.bottom <= feedbackBounds.viewportHeight, 'mobile feedback dialog stays within viewport height');
  assert.ok(feedbackBounds.scrollWidth <= feedbackBounds.clientWidth + 1, 'mobile feedback dialog has no horizontal overflow');
  assert.equal(await mobileFeedback.locator('.la-feedback-categories').evaluate((group) => group.scrollWidth <= group.clientWidth), true, 'mobile category chips wrap without horizontal overflow');
  assert.equal(await mobileFeedback.locator('.la-feedback-category').count(), 10, 'all feedback categories remain available on mobile');
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(evidenceDir, 'mobile-feedback-dialog.png'), fullPage: false });
  await page.keyboard.press('Escape');
  assert.equal(await welcomeBack.getByRole('button', { name: 'Bad response' }).getAttribute('aria-pressed'), 'false', 'Escape closes without recording a reaction');
  await mobileShare.evaluate((button) => button.focus());
  const mobilePanel = await page.locator('#chat-widget .la-panel').evaluate((panel) => {
    const bounds = panel.getBoundingClientRect();
    const composer = panel.querySelector('.la-form').getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, composerBottom: composer.bottom, width: bounds.width, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, scrollWidth: panel.scrollWidth, clientWidth: panel.clientWidth };
  });
  assert.equal(mobilePanel.width, mobilePanel.viewportWidth);
  assert.ok(mobilePanel.left >= 0 && mobilePanel.right <= mobilePanel.viewportWidth, 'mobile messenger stays within the viewport');
  assert.ok(mobilePanel.composerBottom <= mobilePanel.viewportHeight, 'mobile composer remains visible');
  assert.ok(mobilePanel.scrollWidth <= mobilePanel.clientWidth + 1, 'mobile messenger has no horizontal overflow');
  const avatarAudit = await page.locator('#chat-widget .la-message').evaluateAll((messages) => messages.map((message) => ({ role: message.classList.contains('la-user') ? 'user' : 'assistant', avatars: message.querySelectorAll('.la-assistant-avatar').length })));
  assert.equal(avatarAudit.every((message) => message.avatars === (message.role === 'assistant' ? 1 : 0)), true, 'every assistant message has exactly one avatar and user messages have none');
  assert.deepEqual(pageErrors, [], `browser console errors: ${pageErrors.join('; ')}`);
  await context.close();
});
