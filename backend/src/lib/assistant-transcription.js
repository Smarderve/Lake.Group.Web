import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { freemem } from 'node:os';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
const DEFAULT_CLI = resolve(PROJECT_ROOT, 'ai/runtime/whisper/whisper-cli.exe');
const DEFAULT_MODEL = resolve(PROJECT_ROOT, 'ai/models/whisper/ggml-tiny.bin');
const MAX_AUDIO_SECONDS = 20;
const MAX_AUDIO_BYTES = 700_000;
const MIN_FREE_MEMORY_BYTES = 2 * 1024 * 1024 * 1024;

function validateWav(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44 || buffer.length > MAX_AUDIO_BYTES) return false;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') return false;
  if (buffer.readUInt16LE(20) !== 1 || buffer.readUInt16LE(22) !== 1 || buffer.readUInt32LE(24) !== 16_000 || buffer.readUInt16LE(34) !== 16) return false;
  const dataSize = buffer.readUInt32LE(40);
  return dataSize > 0 && dataSize <= MAX_AUDIO_SECONDS * 16_000 * 2 && dataSize <= buffer.length - 44;
}

function runWhisper(executable, args, signal, timeoutMs = 45_000) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: 'ignore' });
    const abort = () => {
      child.kill();
      reject(Object.assign(new Error('Transcription was cancelled.'), { name: 'AbortError', code: 'TRANSCRIPTION_CANCELLED' }));
    };
    const timeout = setTimeout(() => {
      child.kill();
      reject(Object.assign(new Error('Transcription exceeded its time limit.'), { status: 504, code: 'TRANSCRIPTION_TIMEOUT' }));
    }, timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    child.once('error', (error) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      reject(Object.assign(new Error('The local transcription runtime could not start.'), { cause: error, status: 503, code: 'TRANSCRIPTION_UNAVAILABLE' }));
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      if (code === 0) resolvePromise();
      else reject(Object.assign(new Error('The local transcription runtime failed.'), { status: 503, code: 'TRANSCRIPTION_FAILED' }));
    });
    if (signal?.aborted) abort();
  });
}

export function createAssistantTranscriptionService({ cliPath = DEFAULT_CLI, modelPath = DEFAULT_MODEL, memoryProvider = freemem } = {}) {
  let active = false;
  return {
    health() {
      return { available: existsSync(cliPath) && existsSync(modelPath), memoryReady: memoryProvider() >= MIN_FREE_MEMORY_BYTES };
    },
    async transcribe({ audio, locale = 'en', signal } = {}) {
      if (active) throw Object.assign(new Error('A transcription is already running.'), { status: 429, code: 'TRANSCRIPTION_BUSY' });
      if (!validateWav(audio)) throw Object.assign(new Error('Audio must be a mono 16 kHz PCM recording no longer than 20 seconds.'), { status: 400, code: 'INVALID_AUDIO' });
      if (!existsSync(cliPath) || !existsSync(modelPath)) throw Object.assign(new Error('The local transcription model is not installed.'), { status: 503, code: 'TRANSCRIPTION_UNAVAILABLE' });
      if (memoryProvider() < MIN_FREE_MEMORY_BYTES) throw Object.assign(new Error('There is not enough free memory to transcribe safely while the assistant model is running.'), { status: 503, code: 'TRANSCRIPTION_MEMORY_GUARD' });
      active = true;
      let workDirectory;
      try {
        workDirectory = await mkdtemp(join(tmpdir(), 'lake-voice-'));
        const inputPath = join(workDirectory, `${randomUUID()}.wav`);
        const outputBase = join(workDirectory, 'transcript');
        await writeFile(inputPath, audio, { flag: 'wx', mode: 0o600 });
        await runWhisper(cliPath, ['-m', modelPath, '-f', inputPath, '-l', locale === 'sw' ? 'sw' : 'en', '-t', '2', '-nt', '-otxt', '-of', outputBase], signal);
        const text = (await readFile(`${outputBase}.txt`, 'utf8')).trim().replace(/\s+/g, ' ').slice(0, 1000);
        if (!text) throw Object.assign(new Error('No speech was recognized.'), { status: 422, code: 'NO_SPEECH' });
        return { text };
      } finally {
        if (workDirectory) await rm(workDirectory, { recursive: true, force: true }).catch(() => {});
        active = false;
      }
    },
  };
}

export const ASSISTANT_TRANSCRIPTION_LIMITS = Object.freeze({ maxAudioBytes: MAX_AUDIO_BYTES, maxAudioSeconds: MAX_AUDIO_SECONDS, minFreeMemoryBytes: MIN_FREE_MEMORY_BYTES });
