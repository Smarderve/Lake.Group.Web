import { describe, expect, it } from 'vitest';
import { ASSISTANT_TRANSCRIPTION_LIMITS, createAssistantTranscriptionService } from '../src/lib/assistant-transcription.js';

function makeWav(seconds = 1) {
  const samples = seconds * 16_000;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16_000, 24); buffer.writeUInt32LE(32_000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

describe('local Whisper transcription guardrails', () => {
  it('keeps the recording and memory limits explicit', () => {
    expect(ASSISTANT_TRANSCRIPTION_LIMITS.maxAudioSeconds).toBe(20);
    expect(ASSISTANT_TRANSCRIPTION_LIMITS.maxAudioBytes).toBeLessThan(750_000);
    expect(ASSISTANT_TRANSCRIPTION_LIMITS.minFreeMemoryBytes).toBe(2 * 1024 * 1024 * 1024);
  });

  it('fails closed on invalid audio, missing runtime, and low memory', async () => {
    const service = createAssistantTranscriptionService({ cliPath: 'missing-whisper-cli.exe', modelPath: 'missing-model.bin', memoryProvider: () => 4 * 1024 * 1024 * 1024 });
    expect(service.health()).toEqual({ available: false, memoryReady: true });
    await expect(service.transcribe({ audio: Buffer.from('not wav'), locale: 'en' })).rejects.toMatchObject({ status: 400, code: 'INVALID_AUDIO' });
    const constrained = createAssistantTranscriptionService({ memoryProvider: () => 1 });
    expect(constrained.health().memoryReady).toBe(false);
    await expect(constrained.transcribe({ audio: makeWav(), locale: 'en' })).rejects.toMatchObject({ status: 503, code: 'TRANSCRIPTION_MEMORY_GUARD' });
  });

  it('rejects recordings above the duration cap', async () => {
    const service = createAssistantTranscriptionService({ cliPath: 'missing.exe', modelPath: 'missing.bin' });
    await expect(service.transcribe({ audio: makeWav(21), locale: 'sw' })).rejects.toMatchObject({ status: 400, code: 'INVALID_AUDIO' });
  });
});
