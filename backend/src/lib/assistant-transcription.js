import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { freemem } from 'node:os';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
const DEFAULT_CLI = resolve(PROJECT_ROOT, 'ai/speech/runtime/whisper-cli.exe');
const DEFAULT_MODEL = resolve(PROJECT_ROOT, 'ai/speech/models/ggml-base.bin');
const MAX_AUDIO_SECONDS = 30;
const MAX_AUDIO_BYTES = 1_000_000;
const MIN_FREE_MEMORY_BYTES = 3 * 1024 * 1024 * 1024;
const COMPANY_PROMPT = 'Lake Group. Lake Oil. Lake Gas. Lake Aviation. Lake Steel. Lake Trans. Lake Pipes.';

function validateWav(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 46 || buffer.length > MAX_AUDIO_BYTES) return false;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE' || buffer.toString('ascii', 12, 16) !== 'fmt ') return false;
  if (buffer.readUInt32LE(16) !== 16 || buffer.readUInt16LE(20) !== 1 || buffer.readUInt16LE(22) !== 1) return false;
  if (buffer.readUInt32LE(24) !== 16_000 || buffer.readUInt32LE(28) !== 32_000 || buffer.readUInt16LE(32) !== 2 || buffer.readUInt16LE(34) !== 16) return false;
  if (buffer.toString('ascii', 36, 40) !== 'data') return false;
  const dataSize = buffer.readUInt32LE(40);
  return dataSize > 0 && dataSize <= MAX_AUDIO_SECONDS * 16_000 * 2 && dataSize === buffer.length - 44;
}

function runWhisper(executable, args, signal, timeoutMs = 90_000) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: 'ignore' });
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolvePromise();
    };
    const abort = () => {
      child.kill();
      finish(Object.assign(new Error('Transcription was cancelled.'), { name: 'AbortError', code: 'TRANSCRIPTION_CANCELLED' }));
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(Object.assign(new Error('Transcription exceeded its time limit.'), { status: 504, code: 'TRANSCRIPTION_TIMEOUT' }));
    }, timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    child.once('error', (error) => finish(Object.assign(new Error('The local transcription runtime could not start.'), { cause: error, status: 503, code: 'TRANSCRIPTION_UNAVAILABLE' })));
    child.once('exit', (code) => code === 0
      ? finish()
      : finish(Object.assign(new Error('The local transcription runtime failed.'), { status: 503, code: 'TRANSCRIPTION_FAILED' })));
    if (signal?.aborted) abort();
  });
}

function parseWhisperJson(payload) {
  const text = Array.isArray(payload?.transcription)
    ? payload.transcription.map((segment) => String(segment?.text || '')).join(' ')
    : String(payload?.text || '');
  const language = String(payload?.result?.language || payload?.language || 'unknown').toLowerCase();
  return { text: text.trim().replace(/\s+/g, ' ').slice(0, 1000), language };
}

export function createAssistantTranscriptionService({ cliPath = DEFAULT_CLI, modelPath = DEFAULT_MODEL, memoryProvider = freemem } = {}) {
  let active = false;
  return {
    health() {
      return { available: existsSync(cliPath) && existsSync(modelPath), memoryReady: memoryProvider() >= MIN_FREE_MEMORY_BYTES };
    },
    async transcribe({ audio, language = 'auto', signal } = {}) {
      if (active) throw Object.assign(new Error('A transcription is already running.'), { status: 429, code: 'TRANSCRIPTION_BUSY' });
      if (!validateWav(audio)) throw Object.assign(new Error('Audio must be mono 16 kHz PCM and no longer than 30 seconds.'), { status: 400, code: 'INVALID_AUDIO' });
      if (!existsSync(cliPath) || !existsSync(modelPath)) throw Object.assign(new Error('The local multilingual transcription runtime or model is not installed.'), { status: 503, code: 'TRANSCRIPTION_UNAVAILABLE' });
      if (memoryProvider() < MIN_FREE_MEMORY_BYTES) throw Object.assign(new Error('There is not enough free memory to transcribe safely alongside the assistant model.'), { status: 503, code: 'TRANSCRIPTION_MEMORY_GUARD' });
      active = true;
      let workDirectory;
      try {
        workDirectory = await mkdtemp(join(tmpdir(), 'lake-voice-'));
        const inputPath = join(workDirectory, `${randomUUID()}.wav`);
        const outputBase = join(workDirectory, 'transcript');
        await writeFile(inputPath, audio, { flag: 'wx', mode: 0o600 });
        const whisperLanguage = language === 'sw' ? 'sw' : language === 'en' ? 'en' : 'auto';
        await runWhisper(cliPath, ['-m', modelPath, '-f', inputPath, '-l', whisperLanguage, '-t', '2', '-nt', '-ojf', '-of', outputBase, '--prompt', COMPANY_PROMPT], signal);
        const payload = JSON.parse(await readFile(`${outputBase}.json`, 'utf8'));
        const result = parseWhisperJson(payload);
        if (!result.text) throw Object.assign(new Error('No speech was recognized.'), { status: 422, code: 'NO_SPEECH' });
        return result;
      } finally {
        if (workDirectory) await rm(workDirectory, { recursive: true, force: true }).catch(() => {});
        active = false;
      }
    },
  };
}

export const ASSISTANT_TRANSCRIPTION_LIMITS = Object.freeze({ maxAudioBytes: MAX_AUDIO_BYTES, maxAudioSeconds: MAX_AUDIO_SECONDS, minFreeMemoryBytes: MIN_FREE_MEMORY_BYTES });
