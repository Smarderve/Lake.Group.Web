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

test('actual Chrome website renders message actions, retries and rewrites edited conversation history', async (t) => {
  const { server, url } = await startStaticSite();
  let browser = null;
  const evidenceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lake-assistant-actions-'));
  const editCalls = [];
  let failNextEdit = false;
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
    if (endpoint.endsWith('/regenerate')) return route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: ndjson([{ type: 'delta', text: 'Regenerated fixture answer.' }, { type: 'done', answer: 'Regenerated fixture answer.', grounded: true, status: 'ok', locale: 'en', sources: [] }]) });
    return route.fulfill({ status: 404, body: '' });
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const launcher = page.locator('#chat-widget .la-launcher');
  await launcher.waitFor({ state: 'visible', timeout: 15_000 });
  await launcher.click();
  await page.locator('#chat-widget .la-typing').waitFor({ state: 'visible' });
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
  await welcome.getByText('Looking for an on-device voice…', { exact: true }).waitFor({ state: 'visible' });
  await page.evaluate(() => window.__setSpeechVoices([{ name: 'Local English fixture voice', lang: 'en-US', localService: true }]));
  await page.waitForFunction(() => window.__speechCalls.some((call) => call.type === 'speak' && call.text.includes('Hi there!')));
  assert.equal(await page.evaluate(() => window.__speechCalls.some((call) => call.type === 'speak' && call.text.includes('Hi there!'))), true);
  await activeSpeaker.click();
  assert.equal(await welcome.getByRole('button', { name: 'Read message aloud' }).getAttribute('aria-pressed'), 'false');
  await welcome.evaluate((article) => { article._responseLocale = 'sw'; });
  await page.evaluate(() => window.__setSpeechVoices([]));
  await welcome.getByRole('button', { name: 'Read message aloud' }).click();
  await welcome.getByText('No on-device Kiswahili voice is available. Your message was not sent anywhere.', { exact: true }).waitFor({ state: 'visible' });
  await welcome.evaluate((article) => { article._responseLocale = 'en'; });
  await page.evaluate(() => window.__setSpeechVoices([{ name: 'Local English fixture voice', lang: 'en-US', localService: true }]));
  await welcome.getByRole('button', { name: 'Share message' }).click();
  assert.equal(await page.evaluate(() => window.__speechCalls.some((call) => call.type === 'share' && call.payload.text.includes('Hi there!'))), true);
  await page.evaluate(() => Object.defineProperty(window.navigator, 'share', { configurable: true, value: undefined }));
  const shareButton = welcome.getByRole('button', { name: 'Share message' });
  await shareButton.click();
  const shareDialog = page.locator('#chat-widget .la-share-dialog');
  await shareDialog.waitFor({ state: 'visible' });
  assert.equal(await shareDialog.getByRole('heading', { name: 'Share response' }).count(), 1);
  assert.match(await shareDialog.locator('.la-share-preview').textContent(), /Hi there!/);
  assert.match(await shareDialog.getByRole('link', { name: 'Email' }).getAttribute('href'), /^mailto:/);
  assert.match(await shareDialog.getByRole('link', { name: 'WhatsApp' }).getAttribute('href'), /^https:\/\/wa\.me\//);
  assert.equal(await shareDialog.getByRole('button', { name: 'Copy response' }).count(), 1);
  await shareDialog.getByRole('button', { name: 'Copy response' }).click();
  await shareDialog.waitFor({ state: 'detached' });
  await page.locator('#chat-widget .la-action-feedback').filter({ hasText: 'Copied' }).waitFor({ state: 'visible' });
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
  await input.fill('hi'); await page.locator('#chat-widget .la-send').click();
  await page.getByText('Lake Assistant is temporarily unavailable. Please try again shortly.', { exact: true }).waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  const user = page.locator('#chat-widget .la-message.la-user').first();
  const error = page.locator('#chat-widget .la-message.la-bot').filter({ hasText: 'temporarily unavailable' });
  assert.deepEqual(await user.locator('.la-response-action').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))), ['Copy your message', 'Edit your message']);
  assert.equal(await user.locator('.la-message-body').evaluate((bubble) => getComputedStyle(bubble).backgroundColor), 'rgb(1, 129, 187)');
  assert.equal(await user.evaluate((article) => getComputedStyle(article).opacity), '1');
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
  await latest.getByRole('button', { name: 'Good response' }).click();
  assert.equal(await latest.getByRole('button', { name: 'Good response' }).getAttribute('aria-pressed'), 'true');
  await latest.getByRole('button', { name: 'Bad response' }).click();
  assert.equal(await latest.getByRole('button', { name: 'Good response' }).getAttribute('aria-pressed'), 'false');
  assert.equal(await latest.getByRole('button', { name: 'Bad response' }).getAttribute('aria-pressed'), 'true');
  await latest.getByRole('button', { name: 'Regenerate response' }).click();
  await page.getByText('Regenerated fixture answer.', { exact: true }).waitFor({ state: 'visible' });

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
  await page.locator('#chat-widget .la-action-feedback').filter({ hasText: 'Copied' }).first().waitFor({ state: 'visible' });
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
  const mobileShare = welcomeBack.getByRole('button', { name: 'Share message' });
  await mobileShare.click();
  const mobileShareDialog = page.locator('#chat-widget .la-share-dialog');
  await mobileShareDialog.waitFor({ state: 'visible' });
  const shareBounds = await mobileShareDialog.evaluate((dialog) => { const bounds = dialog.getBoundingClientRect(); return { left: bounds.left, right: bounds.right, bottom: bounds.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight }; });
  assert.ok(shareBounds.left >= 0 && shareBounds.right <= shareBounds.viewportWidth, 'mobile share sheet stays within viewport width');
  assert.ok(shareBounds.bottom <= shareBounds.viewportHeight, 'mobile share sheet stays within viewport height');
  await page.screenshot({ path: path.join(evidenceDir, 'mobile-share-sheet.png'), fullPage: false });
  await page.keyboard.press('Escape');
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
  assert.deepEqual(pageErrors, [], `browser console errors: ${pageErrors.join('; ')}`);
  await context.close();
});
