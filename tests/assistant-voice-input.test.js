const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const assistantCode = fs.readFileSync(path.join(__dirname, '..', 'assets', 'assistant.js'), 'utf8');

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.handlers = {};
    this.style = { setProperty() {} }; this.hidden = false; this.value = ''; this.textContent = ''; this.className = '';
    this.scrollHeight = 0; this.scrollTop = 0; this.disabled = false; this.readOnly = false;
    this.classList = {
      add: (name) => { if (!this.className.split(/\s+/).includes(name)) this.className = `${this.className} ${name}`.trim(); },
      remove: (name) => { this.className = this.className.split(/\s+/).filter((item) => item !== name).join(' '); },
      toggle: (name, force) => { const has = this.className.split(/\s+/).includes(name); if (force === undefined ? !has : force) this.classList.add(name); else this.classList.remove(name); },
    };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  replaceChildren(...children) { this.children = [...children]; }
  addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); }
  contains(target) { return this === target || this.children.some((child) => child.contains(target)); }
  dispatch(name, event = {}) { event.preventDefault ||= () => { event.defaultPrevented = true; }; (this.handlers[name] || []).forEach((handler) => handler(event)); }
  focus() {}
  querySelector(selector) { return this.find((element) => selector[0] === '.' ? element.className.split(/\s+/).includes(selector.slice(1)) : element.tagName.toLowerCase() === selector); }
  find(predicate) { for (const child of this.children) { if (predicate(child)) return child; const found = child.find(predicate); if (found) return found; } return null; }
  requestSubmit() { this.dispatch('submit'); }
}

function harness(SpeechRecognition = class {}) {
  const mount = new Element('div');
  const document = {
    readyState: 'loading', handlers: {}, body: new Element('body'), head: new Element('head'),
    getElementById(id) { return id === 'chat-widget' ? mount : null; },
    createElement(tag) { return new Element(tag); }, createElementNS(_ns, tag) { return new Element(tag); },
    addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); },
    dispatch(name, event = {}) { (this.handlers[name] || []).forEach((handler) => handler(event)); },
  };
  const window = { LAKE_ASSISTANT_ENABLED: true, SpeechRecognition, setTimeout() {}, addEventListener() {}, FlexSearch: { Index: class { add() {} search() { return []; } } }, __LAKE_ASSISTANT_KB__: { langs: { en: { docs: [] } }, entities: [] } };
  const context = { window, document, location: { pathname: '/index.html' }, Promise, Date, console, setTimeout() {} };
  vm.createContext(context);
  vm.runInContext(assistantCode, context);
  document.handlers.DOMContentLoaded[0]();
  const panel = mount.children.find((child) => child.id === 'lake-assistant-panel');
  const form = panel.children.find((child) => child.tagName === 'FORM');
  form.requestSubmit = function () { this.dispatch('submit'); };
  const refs = {
    mount, panel, launcher: mount.children.find((child) => child.className.includes('la-launcher')),
    messages: panel.children.find((child) => child.className.includes('la-messages')),
    form, input: form.children.find((child) => child.tagName === 'TEXTAREA'),
    language: form.children.find((child) => child.tagName === 'SELECT'),
    mic: form.children.find((child) => child.className === 'la-voice'),
    stop: form.find((child) => child.className === 'la-voice-stop'),
    cancel: form.find((child) => child.className === 'la-voice-cancel'),
    close: panel.find((child) => child.className === 'la-close'),
  };
  return { window, document, refs };
}

function userMessages(messages) { return messages.children.filter((item) => item.className.includes('la-user')); }

test('voice input feature-detects support and leaves typed chat usable when unsupported', () => {
  const { refs } = harness(null);
  assert.equal(refs.mic.hidden, true);
  assert.equal(refs.language.hidden, true);
  assert.ok(refs.input);
  assert.ok(refs.form.querySelector('.la-send'));
});

test('final transcript submits once through the normal form; interim text never submits', () => {
  const recognitions = [];
  class MockRecognition { constructor() { recognitions.push(this); } start() { this.started = true; } stop() {} abort() {} }
  const { refs } = harness(MockRecognition);
  refs.mic.dispatch('click'); refs.mic.dispatch('click');
  assert.equal(recognitions.length, 1, 'rapid taps do not create multiple recognition sessions');
  const recognition = recognitions[0];
  assert.equal(recognition.lang, 'en-US'); assert.equal(recognition.continuous, false); assert.equal(recognition.interimResults, true); assert.equal(recognition.maxAlternatives, 1);
  recognition.onstart();
  recognition.onresult({ results: [{ isFinal: false, 0: { transcript: 'Where is Lake Group' } }] });
  assert.match(refs.input.value, /Where is Lake Group/);
  assert.equal(userMessages(refs.messages).length, 0, 'interim words are only a visible draft');
  recognition.onresult({ results: [{ isFinal: true, 0: { transcript: 'Where is Lake Group headquarters located?' } }] });
  assert.equal(userMessages(refs.messages).length, 0, 'final words remain visible before recognition ends');
  recognition.onspeechend(); recognition.onend(); recognition.onend();
  assert.equal(userMessages(refs.messages).length, 1);
  assert.match(userMessages(refs.messages)[0].children[0].textContent, /Where is Lake Group headquarters located\?/);
  assert.equal(refs.input.value, '');
});

test('typed drafts are preserved and final voice words are appended as an editable draft', () => {
  const recognitions = [];
  class MockRecognition { constructor() { recognitions.push(this); } start() {} stop() {} abort() {} }
  const { refs } = harness(MockRecognition);
  refs.input.value = 'Please also tell me'; refs.mic.dispatch('click');
  const recognition = recognitions[0]; recognition.onstart();
  recognition.onresult({ results: [{ isFinal: true, 0: { transcript: 'where your offices are' } }] });
  recognition.onend();
  assert.equal(refs.input.value, 'Please also tell me where your offices are');
  assert.equal(userMessages(refs.messages).length, 0);
  assert.equal(refs.input.readOnly, false);
});

test('stop finalizes only final speech and honors the selected Kiswahili locale', () => {
  const recognitions = [];
  class MockRecognition { constructor() { recognitions.push(this); } start() {} stop() { this.stopped = true; } abort() {} }
  const { refs } = harness(MockRecognition);
  refs.language.value = 'sw-TZ'; refs.mic.dispatch('click');
  const recognition = recognitions[0];
  assert.equal(recognition.lang, 'sw-TZ');
  recognition.onstart();
  recognition.onresult({ results: [
    { isFinal: true, 0: { transcript: 'Ningependa kujua kuhusu Lake Group' } },
    { isFinal: false, 0: { transcript: 'unfinished words' } },
  ] });
  refs.stop.dispatch('click');
  assert.equal(recognition.stopped, true);
  recognition.onend();
  assert.equal(userMessages(refs.messages).length, 1);
  assert.equal(userMessages(refs.messages)[0].children[0].textContent, 'Ningependa kujua kuhusu Lake Group');
});

test('cancel, empty recognition, permission errors and close never submit partial speech', () => {
  const recognitions = [];
  class MockRecognition { constructor() { recognitions.push(this); } start() {} stop() {} abort() { this.aborted = true; } }
  const { refs } = harness(MockRecognition);
  refs.input.value = 'Keep my typed draft'; refs.mic.dispatch('click');
  let recognition = recognitions[0]; recognition.onstart();
  recognition.onresult({ results: [{ isFinal: false, 0: { transcript: 'discard this' } }] });
  refs.cancel.dispatch('click');
  assert.equal(recognition.aborted, true); assert.equal(refs.input.value, 'Keep my typed draft');
  assert.equal(userMessages(refs.messages).length, 0);

  refs.input.value = ''; refs.mic.dispatch('click'); recognition = recognitions[1]; recognition.onstart(); recognition.onend();
  assert.equal(userMessages(refs.messages).length, 0, 'silence submits nothing');

  refs.mic.dispatch('click'); recognition = recognitions[2]; recognition.onstart();
  recognition.onerror({ error: 'not-allowed' }); recognition.onend();
  assert.equal(userMessages(refs.messages).length, 0);
  assert.equal(refs.input.readOnly, false, 'input is restored after an error');

  refs.mic.dispatch('click'); recognition = recognitions[3]; recognition.onstart();
  recognition.onresult({ results: [{ isFinal: true, 0: { transcript: 'do not send on close' } }] });
  refs.close.dispatch('click');
  assert.equal(recognition.aborted, true);
  assert.equal(userMessages(refs.messages).length, 0, 'closing aborts and invalidates delayed results');
});

test('outside-click closing aborts an active voice session without affecting page clicks', () => {
  const recognitions = [];
  class MockRecognition { constructor() { recognitions.push(this); } start() {} stop() {} abort() { this.aborted = true; } }
  const { document, refs } = harness(MockRecognition);
  refs.launcher.dispatch('click'); refs.mic.dispatch('click');
  const recognition = recognitions[0]; recognition.onstart();
  const outside = new Element('button');
  document.dispatch('pointerdown', { target: outside });
  assert.equal(refs.panel.hidden, true);
  assert.equal(recognition.aborted, true);
  assert.equal(userMessages(refs.messages).length, 0);

  refs.launcher.dispatch('click');
  document.dispatch('pointerdown', { target: refs.input });
  assert.equal(refs.panel.hidden, false, 'a click inside the widget does not close it');
});

test('source uses the native SpeechRecognition variants and retains typed-submit keyboard behavior', () => {
  assert.match(assistantCode, /window\.SpeechRecognition\s*\|\|\s*window\.webkitSpeechRecognition/);
  assert.match(assistantCode, /event\.key !== 'Enter' \|\| event\.shiftKey/);
  assert.match(assistantCode, /refs\.form\.requestSubmit\(\)/);
  assert.match(assistantCode, /window\.addEventListener\('pagehide', cancelVoice\)/);
});
