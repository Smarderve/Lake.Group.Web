import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { assistantRouter } from '../src/routes/assistant.js';

const chatService = { chat: vi.fn(), health: vi.fn(async () => ({ status: 'ready' })) };

function makeWav(seconds = 1) {
  const samples = seconds * 16_000;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16_000, 24); buffer.writeUInt32LE(32_000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

function appWithTranscription(transcriptionService) {
  const app = express();
  app.use('/api/assistant', assistantRouter({ service: chatService, transcriptionService }));
  return app;
}

describe('private assistant voice transcription API', () => {
  it('reports unavailable until the local runtime, model, and memory are ready', async () => {
    const app = appWithTranscription({ health: () => ({ available: true, memoryReady: false }) });
    await request(app).get('/api/assistant/voice-health').expect(200, { ready: false });
  });

  it('accepts a bounded WAV and returns only the recognized text', async () => {
    const transcribe = vi.fn(async ({ audio, language }) => ({ text: 'Habari Lake Group', language: language === 'auto' ? 'sw' : language, bytes: audio.length }));
    const app = appWithTranscription({ health: () => ({ available: true, memoryReady: true }), transcribe });
    await request(app).post('/api/assistant/transcribe').field('language', 'auto').attach('audio', makeWav(), { filename: 'lake-voice.wav', contentType: 'audio/wav' }).expect(200, { text: 'Habari Lake Group', language: 'sw' });
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(transcribe.mock.calls[0][0].audio).toBeInstanceOf(Buffer);
    expect(transcribe.mock.calls[0][0].language).toBe('auto');
  });

  it('rejects missing runtime, malformed language, and cross-origin uploads', async () => {
    const app = appWithTranscription(null);
    await request(app).post('/api/assistant/transcribe').field('language', 'en').attach('audio', makeWav(), { filename: 'voice.wav', contentType: 'audio/wav' }).expect(503);
    const ready = appWithTranscription({ transcribe: vi.fn(), health: () => ({ available: true, memoryReady: true }) });
    await request(ready).post('/api/assistant/transcribe').field('language', 'fr').attach('audio', makeWav(), { filename: 'voice.wav', contentType: 'audio/wav' }).expect(400);
    await request(ready).post('/api/assistant/transcribe').set('Origin', 'https://attacker.invalid').field('language', 'en').attach('audio', makeWav(), { filename: 'voice.wav', contentType: 'audio/wav' }).expect(403);
  });

  it('bounds uploads and returns a safe no-speech result', async () => {
    const service = { health: () => ({ available: true, memoryReady: true }), transcribe: vi.fn(async () => ({ text: '' })) };
    const app = appWithTranscription(service);
    const oversized = Buffer.alloc(1_000_001);
    oversized.write('RIFF'); oversized.write('WAVE', 8);
    await request(app).post('/api/assistant/transcribe').field('language', 'en').attach('audio', oversized, { filename: 'voice.wav', contentType: 'audio/wav' }).expect(413);
    await request(app).post('/api/assistant/transcribe').field('language', 'en').attach('audio', makeWav(), { filename: 'voice.wav', contentType: 'audio/wav' }).expect(422, { error: { code: 'NO_SPEECH', message: 'No speech was recognized. Try again or type your message.' } });
  });
});
