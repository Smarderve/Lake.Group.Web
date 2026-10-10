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
    expect(retrieveKnowledge('Tell me everything about it', [], records)[0]?.entity).toBe('Lake Group');
    expect(retrieveKnowledge('What does Lake Aviation do?', [], records)[0]?.entity).toBe('Lake Aviation');
    expect(retrieveKnowledge('Where is your headquarters?', [], records)[0]?.entity).toBe('Lake Group');
    expect(retrieveKnowledge('locaton', [], records).length).toBeGreaterThan(0);
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

  it('returns no-evidence follow-ups without invoking the model until the visitor supplies an evidenced topic', async () => {
    const { requests, fetchImpl } = fakeOllama();
    const service = createAssistantChatService({ fetchImpl });
    const first = await service.chat({ message: 'What is the weather on Mars today?' });
    expect(first.status).toBe('no_evidence');
    expect(first.grounded).toBe(false);
    expect(requests).toHaveLength(0);
    const ambiguous = await service.chat({ message: 'What services does it provide?' });
    expect(ambiguous.status).toBe('no_evidence');
    expect(requests).toHaveLength(0);
    const followUp = await service.chat({ sessionId: first.sessionId, message: 'Can you explain more?' });
    expect(followUp.status).toBe('no_evidence');
    expect(requests).toHaveLength(0);
    const evidenced = await service.chat({ sessionId: first.sessionId, message: 'What is Lake Group?' });
    expect(evidenced.status).toBe('ok');
    expect(requests).toHaveLength(1);
    expect(requests[0].body.messages.map((message) => message.content).join('\n')).toContain('What is Lake Group?');
  });

  it('rejects any configured Ollama port outside the private loopback range', () => {
    expect(() => createAssistantChatService({ ollamaPort: 80 })).toThrow(/loopback port/);
    expect(() => createAssistantChatService({ ollamaPort: 11414 })).toThrow(/loopback port/);
  });
});
