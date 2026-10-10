const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '..');
const kbCode = fs.readFileSync(path.join(root, 'assets', 'assistant-kb.js'), 'utf8');
const assistantCode = fs.readFileSync(path.join(root, 'assets', 'assistant.js'), 'utf8');

function harness() {
  const window = { LAKE_ASSISTANT_ENABLED: true };
  class SearchIndex { add() {} search() { return []; } }
  window.FlexSearch = { Index: SearchIndex };
  const document = { readyState: 'loading', addEventListener() {} };
  const context = { window, document, location: { pathname: '/index.html' }, console, Promise, Date, setTimeout };
  vm.createContext(context);
  vm.runInContext(kbCode, context);
  vm.runInContext(assistantCode, context);
  return window.LakeAssistantV2;
}

test('greeting variants avoid consecutive repeats and cover multiple natural phrasings', async () => {
  const assistant = harness();
  const replies = [];
  for (const greeting of ['Hi', 'Hi', 'Hello', 'Hey']) replies.push((await assistant.answer(greeting)).text);
  assert.equal(new Set(replies).size, replies.length);
  assert.match(replies[0], /Hi|Hello|Hey|Welcome|Good|Jambo/);
});

test('company context follows pronouns and switches entities explicitly', async () => {
  const assistant = harness();
  await assistant.answer('Tell me about Lake Aviation');
  assert.match((await assistant.answer('Tell me about Lake Aviation')).text, /aviation fuel supply|into-plane fueling/i);
  const services = await assistant.answer('What services do they offer?');
  assert.equal(assistant.getConversationState().currentEntity, 'Lake Aviation');
  assert.match(services.links[0].u, /lake-aviation\.html/);
  const switched = await assistant.answer('What about Lake Steel?');
  assert.equal(assistant.getConversationState().currentEntity, 'Lake Steel & Allied Products Limited');
  const products = await assistant.answer('What products do they manufacture?');
  assert.match(products.links[0].u, /lake-steel\.html/);
  assert.ok(products.text.length < 450);
  assert.ok(switched.text.length > 0);
});

test('repeated factual questions stay consistent while presentation varies', async () => {
  const assistant = harness();
  const first = await assistant.answer('What does Lake Pipes manufacture?');
  const second = await assistant.answer('What does Lake Pipes manufacture?');
  const fact = (text) => text.replace(/^(The current page notes: |Lake Group’s published information says: |According to the current Lake Group page: )/, '');
  assert.equal(fact(first.text), fact(second.text));
  assert.match(first.links[0].u, /lake-pipes\.html/);
});

test('company directory and group-level questions use group sources, not arbitrary company pages', async () => {
  const assistant = harness();
  const directory = await assistant.answer('What companies are part of Lake Group?');
  assert.equal(directory.links[0].u, 'index.html');
  assert.match(directory.text, /Lake Oil.*Lake Gas.*Lake Aviation/);
  assistant.resetConversation();
  const about = await assistant.answer('What is Lake Group?');
  assert.equal(about.links[0].u, 'about.html');
  assistant.resetConversation();
  const stations = await assistant.answer('How many fuel stations does Lake Group have?');
  assert.equal(stations.links[0].u, 'station-locator.html');
  assert.match(stations.text, /500\+ Fuel Stations/i);
});

test('cross-topic requests retrieve current contact, careers, CSR and leadership pages', async () => {
  const assistant = harness();
  for (const [question, route] of [
    ['How can I contact Lake Group?', 'contact.html'],
    ['How do I apply for a job?', 'careers.html'],
    ['What sustainability initiatives does Lake Group have?', 'csr.html'],
    ['Who is the Lake Group chairman?', 'leadership-ally-edha-awadh.html'],
  ]) {
    assistant.resetConversation();
    const answer = await assistant.answer(question);
    assert.equal(answer.links[0].u, route, question);
  }
});

test('unsupported claims receive a safe no-match instead of unrelated company copy', async () => {
  const assistant = harness();
  await assistant.answer('Tell me about Lake Aviation');
  const result = await assistant.answer('What is their global safety certification number?');
  assert.equal(result.nomatch, true);
  assert.match(result.text, /confirmed|verify|published/i);
});

test('knowledge snapshot covers all current indexable routes and company entities', () => {
  const kb = {};
  vm.runInNewContext(kbCode.replace('window.__LAKE_ASSISTANT_KB__ = ', 'kb.value = '), { kb });
  const seo = fs.readFileSync(path.join(root, 'scripts', 'seo-config.mjs'), 'utf8');
  const routeList = seo.match(/export const INDEXABLE_ROUTES = Object\.freeze\(\[([\s\S]*?)\]\);/);
  const routeCount = routeList ? (routeList[1].match(/'[^']+\.html'/g) || []).length : 0;
  assert.equal(kb.value.audit.pageCount, routeCount);
  assert.equal(kb.value.entities.length, 18);
  assert.equal(kb.value.pages.length, routeCount);
  assert.equal(kb.value.audit.pagesWithAnswerableContent, 30);
  assert.ok(kb.value.audit.conflicts.some((item) => item.metric === 'employees' && item.olderValue === '30,000'));
  assert.equal(kb.value.langs.en.docs.some((doc) => /30,000 professionals/i.test(doc.text)), false);
});

test('every entity in the current public company registry resolves to its own current page', async () => {
  const assistant = harness();
  const kb = {};
  vm.runInNewContext(kbCode.replace('window.__LAKE_ASSISTANT_KB__ = ', 'kb.value = '), { kb });
  for (const company of kb.value.entities) {
    assistant.resetConversation();
    const answer = await assistant.answer(`Tell me about ${company.name}`);
    assert.equal(answer.links[0].u, company.route, company.name);
    assert.ok(answer.text.length > 20, company.name);
  }
});
