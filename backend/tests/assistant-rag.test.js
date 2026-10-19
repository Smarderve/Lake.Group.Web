import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { createAssistantChatService, retrieveKnowledge, removeUnsupportedCompanyLocations, validateAssistantExternalIndex, validateGroupWideAnswer } from '../src/lib/assistant-rag.js';

const indexPath = fileURLToPath(new URL('../../ai/knowledge/lake-group-index.json', import.meta.url));

function terms(text) {
  return String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

async function indexedRecords() {
  const index = JSON.parse(await readFile(indexPath, 'utf8'));
  return index.records.filter((record) => ['PUBLISHED', 'PUBLISHED_LOCALE_COPY'].includes(record.verification)).map((record) => {
    const words = terms([record.entity, record.topic, record.pageTitle, ...(record.aliases || []), record.text].join(' '));
    const frequencies = new Map();
    words.forEach((word) => frequencies.set(word, (frequencies.get(word) || 0) + 1));
    return { ...record, terms: words, frequencies, length: words.length };
  });
}

function fakeOllama(content = 'A grounded local answer.') {
  const requests = [];
  const fetchImpl = vi.fn(async (url, options) => {
    const body = options?.body && JSON.parse(options.body);
    requests.push({ url, body });
    const metrics = { total_duration: 1_000_000_000, load_duration: 100_000_000, prompt_eval_count: 150, prompt_eval_duration: 200_000_000, eval_count: 30, eval_duration: 500_000_000 };
    if (body?.stream) {
      const records = [
        { message: { content: '<think>private reasoning</think>A grounded ' } },
        { message: { content: 'local answer.' } },
        { ...metrics, done: true },
      ];
      return new Response(records.map((record) => JSON.stringify(record)).join('\n') + '\n', { headers: { 'Content-Type': 'application/x-ndjson' } });
    }
    return new Response(JSON.stringify({ message: { content }, ...metrics }), { headers: { 'Content-Type': 'application/json' } });
  });
  return { requests, fetchImpl };
}

function createTestService(options = {}) {
  return createAssistantChatService({ memoryProvider: () => 8 * 1024 ** 3, ...options });
}

describe('Lake Assistant RAG', () => {
  it('retrieves Lake Group overview, company evidence, headquarters and common typo queries', async () => {
    const records = await indexedRecords();
    expect(retrieveKnowledge('What is Lake Group?', [], records)[0]?.entity).toBe('Lake Group');
    expect(retrieveKnowledge('Tell me everything about Lake Group', [], records)[0]?.entity).toBe('Lake Group');
    expect(retrieveKnowledge('What does Lake Aviation do?', [], records)[0]?.entity).toBe('Lake Aviation');
    expect(retrieveKnowledge('Explain Lake Aviation in detail.', [], records)[0]?.entity).toBe('Lake Aviation');
    expect(retrieveKnowledge('Where is your headquarters?', [], records)[0]?.entity).toBe('Lake Group');
    expect(retrieveKnowledge('locaton', [], records).length).toBeGreaterThan(0);
  });

  it('loads allowlisted independent evidence with provenance and retrieves regulator market-share facts', async () => {
    const { fetchImpl, requests } = fakeOllama('The regulator reported a historical share.');
    const service = createTestService({ fetchImpl });
    const result = await service.chat({ message: 'What was Lake Oil market share in Tanzania? Show sources.' });
    expect(result.grounded).toBe(true);
    expect(result.sources.some((source) => source.publisher?.includes('EWURA'))).toBe(true);
    const diagnostics = {};
    const records = await indexedRecords();
    const externalPath = fileURLToPath(new URL('../../ai/knowledge/lake-group-external-index.json', import.meta.url));
    const externalIndex = JSON.parse(await readFile(externalPath, 'utf8'));
    const merged = [...records, ...validateAssistantExternalIndex(externalIndex)];
    const selected = retrieveKnowledge('What was Lake Oil market share in Tanzania?', [], merged, 6, { diagnostics });
    expect(selected.some((record) => record.id === 'external:ewura-market-share-fy2023-24-lake-oil')).toBe(true);
    expect(selected.some((record) => record.id === 'external:epra-kenya-market-share-fy2024-25-lake-oil')).toBe(true);
    expect(selected.find((record) => record.id === 'external:ewura-market-share-fy2023-24-lake-oil')?.limitations).toMatch(/Historical regulator/);

    const lakeGas = await service.chat({ message: 'What share of the Tanzania LPG market is LakeGas?' });
    expect(lakeGas.grounded).toBe(true);
    expect(requests.at(-1).body.messages[0].content).toMatch(/8\.17%/);
    expect(requests.at(-1).body.messages[0].content).toMatch(/source confidence: medium/);
  });

  it('rejects unallowlisted, undated or tampered external knowledge records', async () => {
    const externalPath = fileURLToPath(new URL('../../ai/knowledge/lake-group-external-index.json', import.meta.url));
    const externalIndex = JSON.parse(await readFile(externalPath, 'utf8'));
    expect(validateAssistantExternalIndex(externalIndex).length).toBe(externalIndex.records.length);
    expect(externalIndex.schemaVersion).toBe(2);
    expect(externalIndex.records.find((record) => record.id === 'external:ewura-factsheet-dec2025-lakegas-lpg-share')?.confidence).toBe('medium');
    const untrusted = structuredClone(externalIndex);
    untrusted.records[0].sourceUrl = 'https://example.com/fact';
    expect(() => validateAssistantExternalIndex(untrusted)).toThrow(/allowlist/);
    const tampered = structuredClone(externalIndex);
    tampered.records[0].text += ' Edited.';
    expect(() => validateAssistantExternalIndex(tampered)).toThrow(/hash/);
    const incomplete = structuredClone(externalIndex);
    delete incomplete.records[0].confidence;
    expect(() => validateAssistantExternalIndex(incomplete)).toThrow(/provenance or confidence metadata/);
    const retired = structuredClone(externalIndex);
    retired.records[0].verification = 'RETIRED';
    retired.records[0].retiredAt = '2026-10-13T00:00:00.000Z';
    retired.records[0].retiredBy = 'Compliance reviewer';
    retired.records[0].retirementReason = 'Replaced by a newer regulator report.';
    expect(validateAssistantExternalIndex(retired).some((record) => record.id === externalIndex.records[0].id)).toBe(false);
  });

  it('prioritizes substantive group profile and history over gallery captions', async () => {
    const records = await indexedRecords();
    const results = retrieveKnowledge('Tell me what you know about Lake Group', [], records, 8);
    expect(results[0]?.entity).toBe('Lake Group');
    expect(results.some((record) => /current public company pages cover/i.test(record.text))).toBe(true);
    expect(results.some((record) => /established in 2006|petroleum operations in Tanzania in 2006/i.test(record.text))).toBe(true);
    expect(results.every((record) => !/gallery/i.test(record.pageTitle) && record.contentKind !== 'gallery')).toBe(true);
    expect(results.every((record) => !['careers', 'contact', 'leadership', 'sustainability'].includes(record.topic))).toBe(true);
  });

  it('ranks exact headquarters evidence ahead of unrelated records with only a company-name match', async () => {
    const records = await indexedRecords();
    const results = retrieveKnowledge('Where is Lake Group headquarters?', [], records, 8);
    expect(results[0]?.pageTitle).toBe('Contact Lake Group');
    expect(results[0]?.text).toMatch(/headquarters/i);
  });

  it('retrieves both named companies for a comparison, with useful company-specific evidence', async () => {
    const records = await indexedRecords();
    const results = retrieveKnowledge('Compare Lake Gas and Lake Lubes', [], records, 8);
    expect(new Set(results.map((record) => record.entity))).toEqual(new Set(['Lake Gas Limited', 'Lake Lubes Ltd']));
    expect(results.some((record) => record.entity === 'Lake Gas Limited' && /LPG|cylinders/i.test(record.text))).toBe(true);
    expect(results.some((record) => record.entity === 'Lake Lubes Ltd' && /lubricant|grease/i.test(record.text))).toBe(true);
  });

  it('handles group-wide company location questions without assigning generic group records to subsidiaries', async () => {
    const records = await indexedRecords();
    for (const query of [
      'locations for each company of lake grup',
      'where are all Lake Group companies located',
      'list subsidiaries and their locations',
      'where does each company operate',
      'kampuni zote ziko wapi?',
    ]) {
      const results = retrieveKnowledge(query, [], records, 24);
      expect(results.length).toBeGreaterThanOrEqual(8);
      expect(new Set(results.map((record) => record.entity)).size).toBe(results.length);
      expect(results.every((record) => record.entity !== 'Lake Group')).toBe(true);
      expect(results.some((record) => record.entity === 'Lake Gas Limited' && /Tanzania|Tanga|depot|facility/i.test(record.text))).toBe(true);
      expect(results.some((record) => record.entity === 'Lake Aviation' && /Airport|Uganda|Entebbe/i.test(record.text))).toBe(true);
      expect(results.find((record) => record.entity === 'Lake Aviation')?.text).toContain('Kilimanjaro International Airport');
      expect(results.find((record) => record.entity === 'Lake Aviation')?.text).not.toMatch(/^Entebbe International Airport.*Lake Oil Uganda$/i);
      expect(results.some((record) => /Concrete Mixer Trucks/i.test(record.pageTitle))).toBe(false);
    }
    const aviation = retrieveKnowledge('Where does Lake Aviation operate?', [], records, 8);
    expect(aviation.some((record) => /Lake Oil Uganda/.test(record.text) && /^Entebbe International Airport/i.test(record.text))).toBe(false);
    expect(aviation.some((record) => /Kilimanjaro International Airport/.test(record.text))).toBe(true);
    const unsafeAnswer = 'Lake Aviation operates in Tanzania and Uganda, including Kilimanjaro International Airport (JRO), Julius Nyerere International Airport (DAR), and Entebbe International Airport (EBB).';
    const safeAnswer = removeUnsupportedCompanyLocations(unsafeAnswer, aviation, { groupWide: false, intent: 'locations', entities: ['Lake Aviation'] });
    expect(safeAnswer).toContain('Kilimanjaro International Airport');
    expect(safeAnswer).not.toMatch(/Entebbe|\bEBB\b|\bUganda\b/);
    expect(safeAnswer).not.toMatch(/\bin\s*\.|\bat\s*\.|operates,\s*including|,\./i);
  });

  it('selects intent-relevant evidence across subsidiaries for services and products', async () => {
    const records = await indexedRecords();
    const services = retrieveKnowledge('What services does each Lake Group company provide?', [], records, 24);
    const products = retrieveKnowledge('Which products do all Lake Group companies make?', [], records, 24);
    expect(services).toHaveLength(18);
    expect(products).toHaveLength(18);
    expect(services.every((record) => record.entity !== 'Lake Group')).toBe(true);
    expect(products.every((record) => record.entity !== 'Lake Group')).toBe(true);
    expect(services.some((record) => record.entity === 'African Inland Logistics Ltd. (AILL)' && /cargo|logistics|port/i.test(record.text))).toBe(true);
    expect(products.some((record) => record.entity === 'Lake Pipes' && /PVC/i.test(record.text))).toBe(true);
  });

  it('filters a group-wide country question to companies with explicit country evidence', async () => {
    const records = await indexedRecords();
    const results = retrieveKnowledge('Which Lake Group companies operate in Kenya?', [], records, 24);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((record) => /\bkenya\b/i.test(record.text))).toBe(true);
    expect(results.some((record) => record.entity === 'Lake Gas Limited')).toBe(true);
    expect(results.some((record) => record.entity === 'Lake Oil Ltd.')).toBe(true);
  });

  it('grounds plural facility wording such as the Lake Gas depot question', async () => {
    const records = await indexedRecords();
    const results = retrieveKnowledge('Where are Lake Gas depots?', [], records, 8);
    expect(results.some((record) => record.entity === 'Lake Gas Limited' && /Dar es Salaam|Mwanza|Arusha/i.test(record.text))).toBe(true);
    const { fetchImpl } = fakeOllama('Lake Gas lists depots in its published network.');
    const service = createTestService({ fetchImpl });
    const answer = await service.chat({ message: 'Where are Lake Gas depots?' });
    expect(answer.grounded).toBe(true);
    expect(answer.sources).toEqual([]);
    const sources = await service.chat({ sessionId: answer.sessionId, message: 'Show me your sources.' });
    expect(sources.sources.length).toBeGreaterThan(0);
  });

  it('keeps group sector contacts labeled as group-level rather than subsidiary contacts', async () => {
    const records = await indexedRecords();
    const results = retrieveKnowledge('List contact details for each Lake Group company', [], records, 24);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((record) => record.entity === 'Lake Group')).toBe(true);
    expect(results.every((record) => record.topic === 'contact')).toBe(true);
  });

  it('buffers group-wide streamed answers, performs at most one coverage retry, then releases one final answer', async () => {
    const { requests, fetchImpl } = fakeOllama('A grounded local answer.');
    const service = createTestService({ fetchImpl });
    const deltas = [];
    const answer = await service.chat({ message: 'List subsidiaries and their locations', onToken: (delta) => deltas.push(delta) });
    expect(requests).toHaveLength(2);
    expect(requests[0].body.stream).toBe(true);
    expect(requests[1].body.stream).toBe(false);
    expect(deltas).toEqual(['A grounded local answer.']);
    expect(answer.answerValidation).toEqual({ passed: false, retryCount: 1 });
  });

  it('exposes retrieval diagnostics only outside production', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(createTestService().diagnose).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it('accepts a complete evidence-matched roster answer and rejects cross-company locations', async () => {
    const records = await indexedRecords();
    const diagnostics = {};
    const evidence = retrieveKnowledge('locations for each company of lake grup', [], records, 24, { diagnostics });
    const plan = { groupWide: true, intent: 'locations', exhaustive: true, companies: diagnostics.companyRoster };
    const completeAnswer = `1. African Inland Container Depot (AFICD) – depot
2. African Inland Logistics Ltd. (AILL) – operating-area across Tanzania, Zambia and Mozambique
3. Agrinova Tech Limited – office on Pugu Road opposite JNIA Terminal 3, Dar es Salaam; factory in Kibaha, Tanzania
4. Assembly Tech Limited – operating-area across East and Central Africa
5. Cross Country Developer Limited – operating-area in Dar es Salaam, Tanzania
6. Gulf Aggregates – operating-area in Lugoba, Tanzania
7. Lake Agro Limited – operating-area including Zambia and Tanzania
8. Lake Aviation – airport operations at Kilimanjaro International Airport (JRO), Julius Nyerere International Airport (DAR) and Abeid Amani Karume International Airport (ZNZ)
9. Lake Building Solution – location in Kibaha Visiga, Coast Region, Tanzania
10. Lake Cylinders Limited – factory in Tanzania
11. Lake Gas Limited – depot locations in Dar es Salaam, Mwanza, Arusha, Dodoma, Morogoro, Iringa, Mbeya, Tanga and Zanzibar; Kenya operations
12. Lake Lubes Ltd. – operating-area across East Africa
13. Lake Oil Ltd. – operating-area including Zambia, DR Congo, Burundi and Kenya
14. Lake Pipes – plant at Visiga, Kibaha, Tanzania
15. Lake Premix – batching plant at Mikocheni, Tanzania
16. Lake Steel & Allied Products Limited – no published location identified
17. Lake Trans Limited – operating-area across East Africa
18. NextDrive Motors Limited – no published location identified`;
    expect(validateGroupWideAnswer(completeAnswer, evidence, plan).misattributedLocations.length).toBeGreaterThan(0);
    const correctedAnswer = completeAnswer
      .replace('Cross Country Developer Limited – operating-area in Dar es Salaam, Tanzania', 'Cross Country Developer Limited – operating-area in Dar es Salaam')
      .replace('Lake Premix – batching plant at Mikocheni, Tanzania', 'Lake Premix – batching plant at Mikocheni');
    expect(validateGroupWideAnswer(correctedAnswer, evidence, plan)).toEqual({ valid: true, missingCompanies: [], answerHasEvidenceLocation: true, answerHasUnrelatedLeak: false, unsupportedAffiliateAttribution: false, misattributedLocations: [] });
    expect(validateGroupWideAnswer(removeUnsupportedCompanyLocations(completeAnswer, evidence, plan), evidence, plan).valid).toBe(true);
    const wrongAffiliate = correctedAnswer.replace('Kilimanjaro International Airport (JRO), Julius Nyerere International Airport (DAR) and Abeid Amani Karume International Airport (ZNZ)', 'Entebbe International Airport (EBB)');
    expect(validateGroupWideAnswer(wrongAffiliate, evidence, plan).valid).toBe(false);
  });

  it('keeps a short follow-up anchored to the preceding Lake Group fact', async () => {
    const records = await indexedRecords();
    const history = [
      { role: 'user', content: "Where was Lake Group's first fuel outlet?" },
      { role: 'assistant', content: 'Lake Group’s first fuel outlet was in Dar es Salaam, Tanzania.' },
    ];
    const results = retrieveKnowledge('What year did that happen?', history, records, 4);
    expect(results.some((record) => record.text.includes('established in 2006 with a single fuel outlet'))).toBe(true);
  });

  it('passes bounded multi-turn history, context, citations and conservative model settings', async () => {
    const { requests, fetchImpl } = fakeOllama('Lake Aviation provides the services described on its published page.');
    const service = createTestService({ fetchImpl });
    const first = await service.chat({ message: 'Tell me about Lake Aviation.' });
    const second = await service.chat({ sessionId: first.sessionId, message: 'What services does it provide?' });
    expect(second.sources).toEqual([]);
    const sourceTurn = await service.chat({ sessionId: first.sessionId, message: 'Show me the sources for that.' });
    const modelRequest = requests[1];
    expect(second.status).toBe('ok');
    expect(sourceTurn.sources.some((source) => source.url.includes('lakeoilgroup.com'))).toBe(true);
    expect(modelRequest.url).toBe('http://127.0.0.1:11434/api/chat');
    expect(modelRequest.body.model).toBe('qwen3:4b-instruct-2507-q4_K_M');
    expect(modelRequest.body.think).toBe(false);
    expect(modelRequest.body.options.num_ctx).toBe(3072);
    expect(modelRequest.body.stream).toBe(false);
    expect(modelRequest.body.messages.map((message) => message.content).join('\n')).toContain('Tell me about Lake Aviation.');
    expect(modelRequest.body.messages.map((message) => message.content).join('\n')).toContain('What services does it provide?');
    expect(modelRequest.body.messages[0].content).toContain('Approved retrieved evidence');
  });

  it('asks Qwen about unavailable financial metrics while exposing dated-source limits instead of hardcoding a reply', async () => {
    const { requests, fetchImpl } = fakeOllama();
    const service = createTestService({ fetchImpl });
    const unsupported = await service.chat({ message: "What was Lake Group's 2024 net profit?" });
    expect(unsupported.grounded).toBe(false);
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0].body.messages[0].content).toMatch(/Financial-question safeguard/);
    expect(requests[0].body.messages[0].content).toMatch(/No relevant verified figure for the requested metric/);
    expect(requests[0].body.messages[0].content).not.toMatch(/KSh 150 billion/);
    expect(unsupported.answer).toBe('A grounded local answer.');
  });

  it('does not fabricate company financial figures or rankings when approved evidence has none', async () => {
    const { requests, fetchImpl } = fakeOllama('Lake Group has a $7 billion valuation and ranks number one.');
    const service = createTestService({ fetchImpl });
    const valuation = await service.chat({ message: 'What is Lake Group worth?' });
    const ranking = await service.chat({ message: 'How does Lake Group rank in East Africa?' });
    expect(valuation.answer).toMatch(/will not give a financial figure/i);
    expect(valuation.answer).not.toMatch(/\$|\bbillion\b/i);
    expect(ranking.answer).toMatch(/will not give a financial figure/i);
    expect(ranking.answer).not.toMatch(/number one|\b#1\b/i);
    expect(valuation.sources).toEqual([]);
    expect(requests.length).toBeGreaterThanOrEqual(4);
    expect(requests[0].body.messages[0].content).toMatch(/No relevant verified figure for the requested metric/i);
    const streamedDeltas = [];
    const guarded = await service.chat({ message: 'What is Lake Group worth?', onToken: (delta) => streamedDeltas.push(delta) });
    expect(streamedDeltas).toEqual([guarded.answer]);
    expect(guarded.answer).not.toMatch(/\$|\bbillion\b|number one/i);
  });

  it('does not substitute Lake Oil or LakeGas market-share evidence for Lake Group valuation', async () => {
    const { requests, fetchImpl } = fakeOllama('No verified valuation appears in the approved evidence.');
    const service = createTestService({ fetchImpl });
    await service.chat({ message: 'What is Lake Group worth?' });
    const prompt = requests[0].body.messages[0].content;
    expect(prompt).toMatch(/No relevant verified figure for the requested metric/);
    expect(prompt).not.toMatch(/5\.9%|8\.17%|112,301\.62/);
  });

  it('answers general valuation concepts normally and supplies the configured server date', async () => {
    const { requests, fetchImpl } = fakeOllama('A valuation is an estimate of economic value.');
    const service = createTestService({ fetchImpl, now: () => Date.parse('2026-10-12T12:00:00.000Z') });
    const definition = await service.chat({ message: 'What does company valuation mean?' });
    const date = await service.chat({ sessionId: definition.sessionId, message: "What's today's date?" });
    expect(definition.status).toBe('conversation');
    expect(requests[0].body.messages[0].content).toContain('Use general knowledge to explain concepts');
    expect(requests[1].body.messages[0].content).toContain('Server date: 12 October 2026');
    expect(date.status).toBe('conversation');
  });

  it('routes unrelated/general and open-ended chat through Qwen without stale Lake evidence or links', async () => {
    const { requests, fetchImpl } = fakeOllama('What would you like to know about Lake Group?');
    const service = createTestService({ fetchImpl });
    const open = await service.chat({ message: 'Tell me' });
    expect(open.status).toBe('conversation');
    expect(open.sources).toEqual([]);
    expect(requests).toHaveLength(1);
    expect(requests[0].body.messages[0].content).toContain('This is a general or conversational turn');
    const unrelated = await service.chat({ sessionId: open.sessionId, message: 'What is the weather on Mars?' });
    expect(unrelated.status).toBe('conversation');
    expect(unrelated.sources).toEqual([]);
    expect(requests).toHaveLength(2);
    expect(requests[1].body.messages[0].content).toContain('(No relevant evidence for this turn.)');
    expect(requests[1].body.messages.slice(1).map((message) => message.content).join('\n')).not.toContain('Lake Group companies');
  });

  it('deduplicates factual sources and keeps raw URLs out of Qwen answers and evidence', async () => {
    const { requests, fetchImpl } = fakeOllama('Lake Aviation supplies aviation fuel. Visit https://www.lakeoilgroup.com/lake-aviation.html');
    const service = createTestService({ fetchImpl });
    const answer = await service.chat({ message: 'Tell me about Lake Aviation. Show sources.' });
    expect(answer.sources).toHaveLength(1);
    expect(answer.sources[0].url).toBe('https://www.lakeoilgroup.com/lake-aviation.html');
    expect(new Set(answer.sources.map((source) => source.url)).size).toBe(answer.sources.length);
    expect(requests[0].body.messages[0].content).not.toContain('URL: https://');
    expect(requests[0].body.options.num_predict).toBe(640);
    expect(requests[0].body.options.repeat_penalty).toBeGreaterThan(1);
  });

  it('streams safe answer deltas and returns Ollama timing metadata', async () => {
    const { requests, fetchImpl } = fakeOllama();
    const service = createTestService({ fetchImpl });
    const deltas = [];
    const result = await service.chat({ message: 'What is Lake Group?', onToken: (text) => deltas.push(text) });
    expect(requests[0].body.stream).toBe(true);
    expect(deltas.join('')).toBe('A grounded local answer.');
    expect(deltas.join('')).not.toContain('private reasoning');
    expect(result.answer).toBe('A grounded local answer.');
    expect(result.metrics.loadDurationNs).toBe(100_000_000);
    expect(result.metrics.promptEvalDurationNs).toBe(200_000_000);
    expect(result.metrics.firstTokenMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.retrievalMs).toBeGreaterThanOrEqual(0);
  });

  it('rejects an Ollama stream that ends before its completion record', async () => {
    const fetchImpl = async () => new Response(`${JSON.stringify({ message: { content: 'partial answer' } })}\n`, { headers: { 'Content-Type': 'application/x-ndjson' } });
    const service = createTestService({ fetchImpl });
    await expect(service.chat({ message: 'What is Lake Group?', onToken: vi.fn() })).rejects.toMatchObject({ code: 'INCOMPLETE_MODEL_STREAM' });
  });

  it('skips startup warm-up when RAM headroom is insufficient and pins Qwen only when safe', async () => {
    const lowMemory = fakeOllama();
    const skipped = createAssistantChatService({ fetchImpl: lowMemory.fetchImpl, memoryProvider: () => 6 * 1024 ** 3 }).warmup();
    await expect(skipped).resolves.toMatchObject({ status: 'skipped', reason: 'insufficient_memory_headroom' });
    expect(lowMemory.requests).toHaveLength(0);

    const sufficientMemory = fakeOllama();
    const warmService = createAssistantChatService({ fetchImpl: sufficientMemory.fetchImpl, memoryProvider: () => 8 * 1024 ** 3 });
    await expect(warmService.warmup()).resolves.toMatchObject({ status: 'ready', loadDurationNs: 100_000_000 });
    expect(sufficientMemory.requests[0].body.keep_alive).toBe(-1);
  });

  it('blocks unsafe inference and cold loads below the memory thresholds', async () => {
    const criticallyLow = fakeOllama();
    const criticalService = createAssistantChatService({ fetchImpl: criticallyLow.fetchImpl, memoryProvider: () => 2.5 * 1024 ** 3 });
    await expect(criticalService.chat({ message: 'What is Lake Group?' })).rejects.toMatchObject({ code: 'INSUFFICIENT_MEMORY_HEADROOM' });
    expect(criticallyLow.requests).toHaveLength(0);

    const cold = fakeOllama();
    const coldService = createAssistantChatService({ fetchImpl: cold.fetchImpl, memoryProvider: () => 6 * 1024 ** 3 });
    await expect(coldService.chat({ message: 'What is Lake Group?' })).rejects.toMatchObject({ code: 'INSUFFICIENT_MEMORY_HEADROOM' });
    expect(cold.requests).toHaveLength(1);
    expect(cold.requests[0].url).toMatch(/\/api\/ps$/);
  });

  it('allows reduced-headroom inference only when Ollama confirms Qwen is already resident', async () => {
    const { requests: modelRequests, fetchImpl } = fakeOllama();
    const guardedFetch = vi.fn(async (url, options) => {
      if (String(url).endsWith('/api/ps')) return new Response(JSON.stringify({ models: [{ name: 'qwen3:4b-instruct-2507-q4_K_M' }] }), { headers: { 'Content-Type': 'application/json' } });
      return fetchImpl(url, options);
    });
    const service = createAssistantChatService({ fetchImpl: guardedFetch, memoryProvider: () => 4 * 1024 ** 3 });
    const result = await service.chat({ message: 'What is Lake Group?' });
    expect(result.answer).toBe('A grounded local answer.');
    expect(guardedFetch.mock.calls[0][0]).toMatch(/\/api\/ps$/);
    expect(modelRequests).toHaveLength(1);
  });

  it('keeps follow-ups on the active company, retrieves fresh detail, and reuses it to simplify', async () => {
    const { requests, fetchImpl } = fakeOllama('Lake Aviation provides aviation fuel and into-plane services.');
    const service = createTestService({ fetchImpl });
    const first = await service.chat({ message: 'Tell me about Lake Aviation.' });
    const more = await service.chat({ sessionId: first.sessionId, message: 'Tell me more about its operations' });
    expect(more.status).toBe('ok');
    expect(more.sources).toEqual([]);
    expect(requests[1].body.messages.map((message) => message.content).join('\n')).toContain('Tell me about Lake Aviation.');
    expect(requests[1].body.messages.map((message) => message.content).join('\n')).not.toContain('Lake Aviation provides aviation fuel and into-plane services.');
    expect(requests[1].body.messages[0].content).toContain('Resolve follow-ups from the current topic');
    const simplify = await service.chat({ sessionId: first.sessionId, message: "I don't understand" });
    expect(simplify.status).toBe('ok');
    expect(requests.at(-1).body.messages[0].content).toContain('Re-explain the same supported facts more simply');
    expect(requests.at(-1).body.messages[0].content).toContain('Lake Aviation');
  });

  it('retains grounded history when a contextual follow-up has no fresh matching retrieval', async () => {
    const { requests, fetchImpl } = fakeOllama('Lake Group works across verified business sectors.');
    const service = createTestService({ fetchImpl });
    const first = await service.chat({ message: 'Tell me about Lake Group.' });
    const followUp = await service.chat({ sessionId: first.sessionId, message: 'Tell me more about its operations.' });
    expect(first.grounded).toBe(true);
    expect(followUp.grounded).toBe(true);
    expect(followUp.status).toBe('ok');
    expect(requests[1].body.messages.map((message) => message.content).join('\n')).toContain('Tell me about Lake Group.');
    expect(requests[1].body.messages[0].content).toContain('Approved retrieved evidence');
  });

  it('preserves Kenya facts and source references across company follow-ups without widening the topic', async () => {
    const { requests, fetchImpl } = fakeOllama('Lake Gas Limited and Lake Oil Ltd. operate in Kenya.');
    const service = createTestService({ fetchImpl });
    const first = await service.chat({ message: 'Which Lake Group companies operate in Kenya?' });
    expect(first.sources).toEqual([]);

    const more = await service.chat({ sessionId: first.sessionId, message: 'Tell me more about their operations.' });
    expect(more.grounded).toBe(true);
    const followUpPrompt = requests[1].body.messages[0].content;
    expect(followUpPrompt).toContain('Which Lake Group companies operate in Kenya?');
    expect(followUpPrompt).toContain('Lake Gas Limited');
    expect(followUpPrompt).toContain('Lake Oil Ltd.');
    expect(followUpPrompt).toMatch(/countries: Kenya/i);
    expect(followUpPrompt).toContain('Clean energy for households and business.');
    expect(followUpPrompt).not.toContain('Connecting Port Operations with Inland Logistics');

    const locations = await service.chat({ sessionId: first.sessionId, message: 'Where are they located?' });
    expect(locations.grounded).toBe(true);
    expect(requests[2].body.messages[0].content).toMatch(/countries: Kenya/i);
    expect(locations.sources).toEqual([]);
    const sources = await service.chat({ sessionId: first.sessionId, message: 'Show sources for that.' });
    expect(sources.sources.map((source) => new URL(source.url).pathname)).toEqual(expect.arrayContaining(['/lake-gas.html', '/lake-oil.html']));
  });

  it('withholds and repairs a country contradiction against previously verified evidence', async () => {
    const requests = [];
    const responses = [
      'Lake Gas Limited and Lake Oil Ltd. operate in Kenya.',
      'The evidence does not specify any Lake Group companies that operate in Kenya. There is no mention of Kenya.',
      'The evidence does not specify any Lake Group companies that operate in Kenya. There is no mention of Kenya.',
    ];
    const metrics = { total_duration: 1_000_000_000, load_duration: 100_000_000, prompt_eval_count: 120, prompt_eval_duration: 200_000_000, eval_count: 40, eval_duration: 600_000_000 };
    const fetchImpl = vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body);
      requests.push(body);
      const content = responses[requests.length - 1] || responses.at(-1);
      if (body.stream) return new Response(`${JSON.stringify({ message: { content } })}\n${JSON.stringify({ ...metrics, done: true })}\n`, { headers: { 'Content-Type': 'application/x-ndjson' } });
      return new Response(JSON.stringify({ message: { content }, ...metrics }), { headers: { 'Content-Type': 'application/json' } });
    });
    const service = createTestService({ fetchImpl });
    const first = await service.chat({ message: 'Which Lake Group companies operate in Kenya?' });
    const onToken = vi.fn();
    const followUp = await service.chat({ sessionId: first.sessionId, message: 'Tell me more about their operations.', onToken });

    expect(requests).toHaveLength(3);
    expect(requests[2].messages[0].content).toContain('Your draft contradicts the visitor');
    expect(followUp.answer).toContain('Lake Gas Limited and Lake Oil Ltd. operate in Kenya');
    expect(followUp.answer).not.toMatch(/no mention of Kenya|does not specify any Lake Group companies/i);
    expect(onToken).toHaveBeenCalledTimes(1);
    expect(onToken).toHaveBeenCalledWith(followUp.answer);
  });

  it('follows the selected locale, honors explicit language requests, and carries it through ambiguous follow-ups', async () => {
    const { requests, fetchImpl } = fakeOllama('Jibu lililothibitishwa.');
    const service = createTestService({ fetchImpl });
    const first = await service.chat({ message: 'Tell me about Lake Aviation.', locale: 'sw' });
    expect(requests[0].body.messages[0].content).toContain('Respond in Kiswahili.');
    expect(requests[0].body.messages[0].content).toContain('Company and subsidiary names are protected proper names');
    expect(requests[0].body.messages[0].content).toContain('Lake Energies');
    expect(requests[0].body.messages[0].content).toContain('Lake Steel & Allied Products Limited');

    await service.chat({ sessionId: first.sessionId, message: 'More.', locale: 'sw' });
    expect(requests[1].body.messages[0].content).toContain('Respond in Kiswahili.');

    await service.chat({ sessionId: first.sessionId, message: 'Explain that in Kiswahili.', locale: 'en' });
    expect(requests[2].body.messages[0].content).toContain('Respond in Kiswahili.');

    const selectedLocales = [['hi', 'Hindi'], ['ar', 'Arabic'], ['zh', 'Simplified Chinese'], ['fr', 'French'], ['es', 'Spanish'], ['pt', 'Portuguese']];
    for (const [locale, name] of selectedLocales) {
      await service.chat({ sessionId: first.sessionId, message: 'Tell me about Lake Aviation.', locale });
      expect(requests.at(-1).body.messages[0].content).toContain(`Respond in ${name}.`);
    }

    await service.chat({ sessionId: first.sessionId, message: 'Where is Lake Group headquarters?', locale: 'sw' });
    const englishPrompts = requests.filter((request) => request.body.messages.at(-1)?.content === 'Where is Lake Group headquarters?').map((request) => request.body.messages[0].content);
    expect(englishPrompts.every((prompt) => prompt.includes('Respond in Kiswahili.'))).toBe(true);
  });

  it.each([['en', 'English'], ['sw', 'Kiswahili'], ['hi', 'Hindi'], ['ar', 'Arabic'], ['zh', 'Simplified Chinese'], ['fr', 'French'], ['es', 'Spanish'], ['pt', 'Portuguese']])(
    'keeps the selected %s locale in financial-answer safeguards', async (locale, language) => {
      const { requests, fetchImpl } = fakeOllama('No verified figure appears in the evidence.');
      const service = createTestService({ fetchImpl });
      await service.chat({ message: "What was Lake Group's 2024 net profit?", locale });
      const prompt = requests[0].body.messages[0].content;
      expect(prompt).toContain(`Respond in ${language}.`);
      expect(prompt).toContain(`Financial-question safeguard: answer in ${language}.`);
    },
  );

  it('regenerates only the latest answer from its original pre-turn context without duplicating history', async () => {
    const { requests, fetchImpl } = fakeOllama();
    const service = createTestService({ fetchImpl });
    const first = await service.chat({ message: 'Tell me about Lake Aviation.' });
    const secondQuestion = 'Tell me more about its operations.';
    const second = await service.chat({ sessionId: first.sessionId, message: secondQuestion });
    const deltas = [];
    const regenerated = await service.regenerate({ sessionId: first.sessionId, onToken: (text) => deltas.push(text) });

    expect(regenerated.answer).toBe('A grounded local answer.');
    expect(regenerated.sessionId).toBe(first.sessionId);
    expect(deltas.join('')).toBe(regenerated.answer);
    expect(requests).toHaveLength(3);
    const regenerationMessages = requests[2].body.messages;
    expect(regenerationMessages.at(-1)).toEqual({ role: 'user', content: secondQuestion });
    expect(regenerationMessages.filter((message) => message.role === 'user' && message.content === secondQuestion)).toHaveLength(1);
    expect(regenerationMessages.some((message) => message.role === 'assistant' && message.content === second.answer)).toBe(false);
    expect(regenerationMessages[0].content).toContain('Regeneration request: write a fresh formulation');
    expect(regenerationMessages[0].content).toContain('Kilimanjaro International Airport');

    await service.regenerate({ sessionId: first.sessionId });
    expect(requests).toHaveLength(4);
    expect(requests[3].body.messages.at(-1)).toEqual({ role: 'user', content: secondQuestion });
    expect(requests[3].body.messages.filter((message) => message.role === 'user' && message.content === secondQuestion)).toHaveLength(1);
  });

  it('rewrites an edited older turn as a branch and drops every later turn only after a successful answer', async () => {
    const { requests, fetchImpl } = fakeOllama();
    const service = createTestService({ fetchImpl });
    const sessionId = 'b9bf248a-88a7-44c6-aaf0-b5f5bcd60e8a';
    const firstId = 'b9bf248a-88a7-44c6-aaf0-b5f5bcd60e8b';
    const secondId = 'b9bf248a-88a7-44c6-aaf0-b5f5bcd60e8c';
    const first = await service.chat({ sessionId, turnId: firstId, message: 'Where does Lake Aviation operate?' });
    await service.chat({ sessionId, turnId: secondId, message: 'Tell me more about its operations.' });

    const edited = await service.editTurn({ sessionId, turnId: firstId, message: 'Tell me about Lake Gas operations.' });
    expect(edited).toMatchObject({ sessionId, turnId: firstId, answer: 'A grounded local answer.' });
    expect(requests).toHaveLength(3);
    expect(requests[2].body.messages.at(-1)).toEqual({ role: 'user', content: 'Tell me about Lake Gas operations.' });

    await service.chat({ sessionId, turnId: 'b9bf248a-88a7-44c6-aaf0-b5f5bcd60e8d', message: 'Tell me more about its operations.' });
    expect(requests).toHaveLength(4);
    expect(requests[3].body.messages[0].content).toContain('subject: Tell me about Lake Gas operations.');
    expect(requests[3].body.messages[0].content).not.toContain('subject: Where does Lake Aviation operate?');
    expect(first.sessionId).toBe(sessionId);
  });

  it('keeps the existing branch unchanged when an edit inference fails and safely retries a failed uncommitted turn', async () => {
    const { requests, fetchImpl: baseFetch } = fakeOllama();
    let shouldFail = false;
    const fetchImpl = vi.fn(async (...args) => {
      if (shouldFail) { shouldFail = false; return new Response('unavailable', { status: 503 }); }
      return baseFetch(...args);
    });
    const service = createTestService({ fetchImpl });
    const sessionId = 'c9bf248a-88a7-44c6-aaf0-b5f5bcd60e8a';
    const firstId = 'c9bf248a-88a7-44c6-aaf0-b5f5bcd60e8b';
    const first = await service.chat({ sessionId, turnId: firstId, message: 'Tell me about Lake Aviation.' });
    shouldFail = true;
    await expect(service.editTurn({ sessionId, turnId: firstId, message: 'Tell me about Lake Gas.' })).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE' });
    const retried = await service.editTurn({ sessionId, turnId: firstId, message: 'Tell me about Lake Gas.' });
    expect(retried).toMatchObject({ sessionId, turnId: firstId });
    expect(first.sessionId).toBe(sessionId);

    const missingId = 'c9bf248a-88a7-44c6-aaf0-b5f5bcd60e8c';
    shouldFail = true;
    await expect(service.chat({ sessionId, turnId: missingId, message: 'What is Lake Group?' })).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE' });
    const retryWithoutCommittedTurn = await service.editTurn({ sessionId, turnId: missingId, message: 'What is Lake Group?' });
    expect(retryWithoutCommittedTurn).toMatchObject({ sessionId, turnId: missingId });
    expect(requests.length).toBeGreaterThanOrEqual(3);
  });

  it('retries an initial unavailable request through the same stable turn without duplicating it', async () => {
    const { requests, fetchImpl: baseFetch } = fakeOllama();
    let unavailable = true;
    const fetchImpl = vi.fn(async (...args) => {
      if (unavailable) return new Response('unavailable', { status: 503 });
      return baseFetch(...args);
    });
    const service = createTestService({ fetchImpl });
    const sessionId = 'd9bf248a-88a7-44c6-aaf0-b5f5bcd60e8a';
    const turnId = 'd9bf248a-88a7-44c6-aaf0-b5f5bcd60e8b';
    await expect(service.chat({ sessionId, turnId, message: 'What is Lake Group?' })).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE' });
    unavailable = false;
    const retried = await service.editTurn({ sessionId, turnId, message: 'What is Lake Group?' });
    expect(retried).toMatchObject({ sessionId, turnId, answer: 'A grounded local answer.' });
    expect(requests).toHaveLength(1);
    expect(requests[0].body.messages.at(-1)).toEqual({ role: 'user', content: 'What is Lake Group?' });
  });

  it('makes duplicate chat submission idempotent for a stable turn id', async () => {
    const { requests, fetchImpl } = fakeOllama();
    const service = createTestService({ fetchImpl });
    const sessionId = 'e9bf248a-88a7-44c6-aaf0-b5f5bcd60e8a';
    const turnId = 'e9bf248a-88a7-44c6-aaf0-b5f5bcd60e8b';
    const first = await service.chat({ sessionId, turnId, message: 'What is Lake Group?' });
    const duplicate = await service.chat({ sessionId, turnId, message: 'What is Lake Group?' });
    expect(duplicate).toMatchObject({ sessionId, turnId, answer: first.answer, sources: first.sources });
    expect(requests).toHaveLength(1);
    await expect(service.chat({ sessionId, turnId, message: 'A different question' })).rejects.toMatchObject({ code: 'TURN_ID_CONFLICT' });
    expect(requests).toHaveLength(1);
  });

  it('keeps the original answer eligible when a regeneration fails', async () => {
    const { fetchImpl: baseFetch } = fakeOllama();
    let failNext = false;
    const fetchImpl = vi.fn(async (url, options) => {
      if (failNext) { failNext = false; return new Response('unavailable', { status: 503 }); }
      return baseFetch(url, options);
    });
    const service = createTestService({ fetchImpl });
    const first = await service.chat({ message: 'Tell me about Lake Aviation.' });
    failNext = true;
    await expect(service.regenerate({ sessionId: first.sessionId })).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE' });
    const next = await service.regenerate({ sessionId: first.sessionId });
    expect(next.answer).toBe('A grounded local answer.');
  });

  it('treats a request for company details as a company profile lookup', async () => {
    const { fetchImpl } = fakeOllama('Agrinova Tech Limited provides the supported agricultural technology information.');
    const service = createTestService({ fetchImpl });
    const result = await service.chat({ message: 'Give me details about Agrinova Tech. Show sources.' });
    expect(result.status).toBe('ok');
    expect(result.grounded).toBe(true);
    expect(result.sources[0].url).toBe('https://www.lakeoilgroup.com/agrinova-tech.html');
  });

  it('rejects any configured Ollama port outside the private loopback range', () => {
    expect(() => createAssistantChatService({ ollamaPort: 80 })).toThrow(/loopback port/);
    expect(() => createAssistantChatService({ ollamaPort: 11414 })).toThrow(/loopback port/);
  });
});
