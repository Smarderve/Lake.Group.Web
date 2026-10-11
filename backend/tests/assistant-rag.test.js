import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { createAssistantChatService, retrieveKnowledge } from '../src/lib/assistant-rag.js';

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
    requests.push({ url, body: options?.body && JSON.parse(options.body) });
    return { ok: true, json: async () => ({ message: { content }, total_duration: 1_000_000_000, prompt_eval_count: 150, eval_count: 30, eval_duration: 500_000_000 }) };
  });
  return { requests, fetchImpl };
}

describe('Lake Assistant RAG', () => {
  it('retrieves Lake Group overview, company evidence, headquarters and common typo queries', async () => {
    const records = await indexedRecords();
    expect(retrieveKnowledge('What is Lake Group?', [], records)[0]?.entity).toBe('Lake Group');
    expect(retrieveKnowledge('Tell me everything about Lake Group', [], records)[0]?.entity).toBe('Lake Group');
    expect(retrieveKnowledge('What does Lake Aviation do?', [], records)[0]?.entity).toBe('Lake Aviation');
    expect(retrieveKnowledge('Where is your headquarters?', [], records)[0]?.entity).toBe('Lake Group');
    expect(retrieveKnowledge('locaton', [], records).length).toBeGreaterThan(0);
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
    const service = createAssistantChatService({ fetchImpl });
    const first = await service.chat({ message: 'Tell me about Lake Aviation.' });
    const second = await service.chat({ sessionId: first.sessionId, message: 'What services does it provide?' });
    const modelRequest = requests.at(-1);
    expect(second.status).toBe('ok');
    expect(second.sources.some((source) => source.url.includes('lakeoilgroup.com'))).toBe(true);
    expect(modelRequest.url).toBe('http://127.0.0.1:11434/api/chat');
    expect(modelRequest.body.model).toBe('qwen3:4b-instruct-2507-q4_K_M');
    expect(modelRequest.body.options.num_ctx).toBe(4096);
    expect(modelRequest.body.stream).toBe(false);
    expect(modelRequest.body.messages.map((message) => message.content).join('\n')).toContain('Tell me about Lake Aviation.');
    expect(modelRequest.body.messages.map((message) => message.content).join('\n')).toContain('What services does it provide?');
    expect(modelRequest.body.messages[0].content).toContain('Approved retrieved evidence');
  });

  it('invokes Qwen for unsupported Lake facts and returns no unrelated evidence links', async () => {
    const { requests, fetchImpl } = fakeOllama();
    const service = createAssistantChatService({ fetchImpl });
    const unsupported = await service.chat({ message: "What was Lake Group's 2024 net profit?" });
    expect(unsupported.status).toBe('no_evidence');
    expect(unsupported.grounded).toBe(false);
    expect(unsupported.sources).toEqual([]);
    expect(requests).toHaveLength(1);
    expect(requests[0].body.messages.map((message) => message.content).join('\n')).toContain('What was Lake Group\'s 2024 net profit?');
    expect(requests[0].body.messages[0].content).toContain('(No relevant evidence for this turn.)');
  });

  it('routes unrelated/general and open-ended chat through Qwen without stale Lake evidence or links', async () => {
    const { requests, fetchImpl } = fakeOllama('What would you like to know about Lake Group?');
    const service = createAssistantChatService({ fetchImpl });
    const open = await service.chat({ message: 'Tell me' });
    expect(open.status).toBe('conversation');
    expect(open.sources).toEqual([]);
    expect(requests).toHaveLength(1);
    expect(requests[0].body.messages[0].content).toContain('friendly, concise clarifying question');
    const unrelated = await service.chat({ sessionId: open.sessionId, message: 'What is the weather on Mars?' });
    expect(unrelated.status).toBe('conversation');
    expect(unrelated.sources).toEqual([]);
    expect(requests).toHaveLength(2);
    expect(requests[1].body.messages[0].content).toContain('(No relevant evidence for this turn.)');
    expect(requests[1].body.messages.slice(1).map((message) => message.content).join('\n')).not.toContain('Lake Group companies');
  });

  it('deduplicates factual sources and keeps raw URLs out of Qwen answers and evidence', async () => {
    const { requests, fetchImpl } = fakeOllama('Lake Aviation supplies aviation fuel. Visit https://www.lakeoilgroup.com/lake-aviation.html');
    const service = createAssistantChatService({ fetchImpl });
    const answer = await service.chat({ message: 'Tell me about Lake Aviation.' });
    expect(answer.sources).toHaveLength(1);
    expect(answer.sources[0].url).toBe('https://www.lakeoilgroup.com/lake-aviation.html');
    expect(new Set(answer.sources.map((source) => source.url)).size).toBe(answer.sources.length);
    expect(requests[0].body.messages[0].content).not.toContain('URL: https://');
    expect(requests[0].body.options.num_predict).toBe(640);
    expect(requests[0].body.options.repeat_penalty).toBeGreaterThan(1);
  });

  it('keeps follow-ups on the active company, retrieves fresh detail, and reuses it to simplify', async () => {
    const { requests, fetchImpl } = fakeOllama('Lake Aviation provides aviation fuel and into-plane services.');
    const service = createAssistantChatService({ fetchImpl });
    const first = await service.chat({ message: 'Tell me about Lake Aviation.' });
    const more = await service.chat({ sessionId: first.sessionId, message: 'Tell me more' });
    expect(more.status).toBe('ok');
    expect(more.sources[0].url).toBe('https://www.lakeoilgroup.com/lake-aviation.html');
    expect(requests[1].body.messages.map((message) => message.content).join('\n')).toContain('Tell me about Lake Aviation.');
    expect(requests[1].body.messages[0].content).toContain('Continue the current topic');
    const simplify = await service.chat({ sessionId: first.sessionId, message: "I don't understand" });
    expect(simplify.status).toBe('ok');
    expect(requests[2].body.messages[0].content).toContain('Re-explain the same supported facts more simply');
    expect(requests[2].body.messages[0].content).toContain('Lake Aviation');
  });

  it('rejects any configured Ollama port outside the private loopback range', () => {
    expect(() => createAssistantChatService({ ollamaPort: 80 })).toThrow(/loopback port/);
    expect(() => createAssistantChatService({ ollamaPort: 11414 })).toThrow(/loopback port/);
  });
});
