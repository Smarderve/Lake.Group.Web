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

test('voice recording uses the private MediaRecorder pipeline, not silence-sensitive speech recognition', () => {
  assert.match(assistantCode, /navigator\.mediaDevices && navigator\.mediaDevices\.getUserMedia && window\.MediaRecorder/);
  assert.match(assistantCode, /recorder\.start\(250\)/);
  assert.doesNotMatch(assistantCode, /SpeechRecognition|onspeechend/);
  assert.match(assistantCode, /voiceEndpoint\('voice-health'\)/);
  assert.match(assistantCode, /voiceEndpoint\('transcribe'\)/);
});

test('recording remains active until an explicit stop, send, cancel, or visible 30-second safety limit', () => {
  assert.match(assistantCode, /voiceState\.timer = window\.setTimeout\(function \(\) \{[\s\S]*?Time limit reached/);
  assert.match(assistantCode, /remaining <= 5 \? remaining \+ ' sec left · recording will stop'/);
  assert.match(assistantCode, /function stopVoice\(\)[\s\S]*?voiceState\.recorder\.stop\(\)/);
  assert.match(assistantCode, /function cancelVoice\(restoreFocus\)[\s\S]*?voiceState\.controller\.abort\(\)/);
  assert.doesNotMatch(assistantCode, /setTimeout\(stopVoice,\s*\d+\)/);
});

test('transcription edits the draft and only an explicit Send action submits it once', () => {
  assert.match(assistantCode, /voiceState\.baseText \+ separator \+ recognized/);
  assert.match(assistantCode, /voiceState\.sendAfterTranscript = true/);
  assert.match(assistantCode, /if \(sendAfterTranscript && finalText && refs\.input\.value\.trim\(\)\)/);
  assert.match(assistantCode, /refs\.form\.requestSubmit\(\)/);
  assert.match(assistantCode, /event\.key !== 'Enter' \|\| event\.shiftKey/);
  assert.match(assistantCode, /window\.addEventListener\('pagehide', function \(\) \{ cancelVoice\(false\); \}\)/);
});

test('outside-click closing still aborts recording and leaves the page click available', () => {
  assert.match(assistantCode, /document\.addEventListener\('pointerdown',[\s\S]*?closePanel\(false\)/);
  assert.match(assistantCode, /function closePanel\([\s\S]*?cancelVoice\(false\)/);
});
