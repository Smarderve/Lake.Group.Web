import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';

const SESSION_COOKIE = 'lake_assistant.sid';
const SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSISTANT_LOCALES = ['en', 'sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
const requestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  locale: z.enum(ASSISTANT_LOCALES).optional().default('en'),
}).strict();
const chatRequestSchema = requestSchema.extend({ turnId: z.string().uuid().optional() }).strict();
const editRequestSchema = z.object({
  turnId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  locale: z.enum(ASSISTANT_LOCALES).optional(),
}).strict();
const regenerateRequestSchema = z.object({ locale: z.enum(ASSISTANT_LOCALES).optional() }).strict();

function cookieValue(request, name) {
  for (const part of String(request.headers.cookie || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    let value;
    try { value = decodeURIComponent(part.slice(separator + 1).trim()); } catch { return null; }
    return SESSION_PATTERN.test(value) ? value : null;
  }
  return null;
}

function sameOriginIfPresent(request, allowedOrigins = []) {
  const origin = request.get('origin');
  if (!origin) return true;
  const fetchSite = request.get('sec-fetch-site');
  if (fetchSite && fetchSite.toLowerCase() === 'cross-site') return false;
  try {
    const parsedOrigin = new URL(origin).origin.toLowerCase();
    if (allowedOrigins.length) return allowedOrigins.some((candidate) => {
      try { return new URL(candidate).origin.toLowerCase() === parsedOrigin; } catch { return false; }
    });
    return new URL(origin).host.toLowerCase() === String(request.get('host') || '').toLowerCase();
  }
  catch { return false; }
}

function safeUnavailable(res) {
  return res.status(503).json({ error: { code: 'ASSISTANT_UNAVAILABLE', message: 'Lake Assistant is temporarily unavailable. Please try again shortly.' } });
}

export function assistantRouter({ service, transcriptionService = null, cookieSecure = false, allowedOrigins = [] } = {}) {
  if (!service || typeof service.chat !== 'function') throw new TypeError('Assistant service is required.');
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 12,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Please wait a moment before sending another message.' } }),
  });
  const transcriptionLimiter = rateLimit({
    windowMs: 60_000,
    // A 30-second message is transcribed in short, overlapping live windows
    // plus one final pass. Keep a hard per-client ceiling to bound CPU use.
    limit: 12,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Please wait before trying voice input again.' } }),
  });
  const uploadAudio = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1_000_000, files: 1, fields: 1, parts: 4, fieldSize: 8 },
    fileFilter: (_request, file, callback) => callback(null, /^audio\/wav$/iu.test(file.mimetype)),
  }).single('audio');

  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    response.set('X-Content-Type-Options', 'nosniff');
    next();
  });

  router.get('/health', async (_request, response) => {
    try {
      const status = await service.health();
      const ready = status.status === 'ready';
      return response.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
    } catch {
      return safeUnavailable(response);
    }
  });

  router.get('/voice-health', (_request, response) => {
    try {
      const status = transcriptionService?.health?.();
      const ready = Boolean(status?.available && status?.memoryReady);
      const reason = ready ? 'ready' : status?.reason || (!status ? 'runtime_unavailable' : !status.available ? 'runtime_unavailable' : 'insufficient_memory');
      return response.status(200).json({ ready, reason });
    } catch {
      return response.status(200).json({ ready: false, reason: 'runtime_unavailable' });
    }
  });

  router.post('/transcribe', transcriptionLimiter, async (request, response) => {
    if (!transcriptionService || typeof transcriptionService.transcribe !== 'function') {
      return response.status(503).json({ error: { code: 'TRANSCRIPTION_UNAVAILABLE', message: 'Private voice transcription is unavailable on this device.' } });
    }
    if (!/^multipart\/form-data(?:\s*;|$)/iu.test(request.get('content-type') || '')) {
      return response.status(415).json({ error: { code: 'UNSUPPORTED_CONTENT_TYPE', message: 'Send a WAV voice recording.' } });
    }
    if (!sameOriginIfPresent(request, allowedOrigins)) {
      return response.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'This request is not allowed.' } });
    }
    const transcriptionAbort = new AbortController();
    response.once('close', () => { if (!response.writableEnded) transcriptionAbort.abort(); });
    try {
      await new Promise((resolvePromise, reject) => uploadAudio(request, response, (error) => error ? reject(error) : resolvePromise()));
      const language = request.body?.language;
      if (!request.file || !['auto', ...ASSISTANT_LOCALES].includes(language)) {
        return response.status(400).json({ error: { code: 'INVALID_AUDIO', message: 'Record a short voice message and try again.' } });
      }
      const result = await transcriptionService.transcribe({ audio: request.file.buffer, language, signal: transcriptionAbort.signal });
      const text = typeof result?.text === 'string' ? result.text.trim().slice(0, 1000) : '';
      if (!text) return response.status(422).json({ error: { code: 'NO_SPEECH', message: 'No speech was recognized. Try again or type your message.' } });
      const detectedLanguage = typeof result?.language === 'string' ? result.language.toLowerCase().slice(0, 12) : 'unknown';
      return response.json({ text, language: detectedLanguage });
    } catch (error) {
      if (error?.name === 'AbortError' || transcriptionAbort.signal.aborted) return;
      if (error?.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ error: { code: 'AUDIO_TOO_LARGE', message: 'Keep voice messages to 30 seconds or less.' } });
      if (error?.name === 'MulterError') return response.status(400).json({ error: { code: 'INVALID_AUDIO', message: 'The recording is invalid. Please try again.' } });
      if (error?.status === 400) return response.status(400).json({ error: { code: error.code || 'INVALID_AUDIO', message: 'The recording is invalid. Please try again.' } });
      if (error?.status === 422) return response.status(422).json({ error: { code: 'NO_SPEECH', message: 'No speech was recognized. Try again or type your message.' } });
      if (error?.status === 429) return response.status(429).json({ error: { code: 'TRANSCRIPTION_BUSY', message: 'Voice transcription is busy. Please wait and try again.' } });
      if (error?.status === 504) return response.status(504).json({ error: { code: 'TRANSCRIPTION_TIMEOUT', message: 'Transcription took too long. Try a shorter recording.' } });
      request.log?.error?.({ err: error?.code || error?.constructor?.name || 'Error' }, 'local voice transcription failed');
      return response.status(503).json({ error: { code: 'TRANSCRIPTION_UNAVAILABLE', message: 'Private voice transcription is temporarily unavailable. You can type your message.' } });
    }
  });

  router.post('/chat', express.json({ limit: '8kb', type: 'application/json' }), limiter, async (request, response) => {
    try {
      if (!/^application\/json(?:\s*;|$)/iu.test(request.get('content-type') || '')) {
        return response.status(415).json({ error: { code: 'UNSUPPORTED_CONTENT_TYPE', message: 'Send a JSON message.' } });
      }
      if (!sameOriginIfPresent(request, allowedOrigins)) {
        return response.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'This request is not allowed.' } });
      }
      const parsed = chatRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return response.status(400).json({ error: { code: 'INVALID_MESSAGE', message: 'Enter a message of up to 1,000 characters.' } });
      }
      const wantsStream = String(request.get('accept') || '').split(',').some((item) => item.trim().split(';')[0] === 'application/x-ndjson');
      const existingSessionId = cookieValue(request, SESSION_COOKIE);
      const sessionId = existingSessionId || (wantsStream ? randomUUID() : null);
      if (wantsStream) response.append('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/api/assistant; Max-Age=1800; HttpOnly; SameSite=Lax${cookieSecure ? '; Secure' : ''}`);
      let result;
      if (wantsStream) {
        const abortController = new AbortController();
        const abortOnDisconnect = () => abortController.abort();
        request.once('aborted', abortOnDisconnect);
        response.once('close', () => { if (!response.writableEnded) abortOnDisconnect(); });
        response.status(200);
        response.set({
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, no-transform',
          'X-Accel-Buffering': 'no',
        });
        response.flushHeaders();
        const writeEvent = (event) => new Promise((resolvePromise, reject) => {
          if (response.destroyed) return reject(Object.assign(new Error('The visitor disconnected.'), { name: 'AbortError' }));
          if (response.write(`${JSON.stringify(event)}\n`)) return resolvePromise();
          const onDrain = () => { cleanup(); resolvePromise(); };
          const onClose = () => { cleanup(); reject(Object.assign(new Error('The visitor disconnected.'), { name: 'AbortError' })); };
          const cleanup = () => { response.off('drain', onDrain); response.off('close', onClose); };
          response.once('drain', onDrain);
          response.once('close', onClose);
        });
        try {
          result = await service.chat({
            sessionId,
          ...(parsed.data.turnId ? { turnId: parsed.data.turnId } : {}),
            message: parsed.data.message,
            locale: parsed.data.locale,
            signal: abortController.signal,
            onToken: (text) => writeEvent({ type: 'delta', text }),
          });
          if (abortController.signal.aborted || response.destroyed) return;
          await writeEvent({ type: 'done', answer: result.answer, turnId: result.turnId, sources: result.sources || [], grounded: Boolean(result.grounded), status: result.status || 'ok', locale: result.locale || parsed.data.locale, metrics: result.metrics || {} });
          return response.end();
        } catch (error) {
          if (abortController.signal.aborted || error?.name === 'AbortError' || response.destroyed) return;
          await writeEvent({ type: 'error', message: 'Lake Assistant could not complete this response.' }).catch(() => {});
          return response.end();
        } finally {
          request.off('aborted', abortOnDisconnect);
        }
      } else {
        result = await service.chat({
          sessionId: existingSessionId,
          ...(parsed.data.turnId ? { turnId: parsed.data.turnId } : {}),
          message: parsed.data.message,
          locale: parsed.data.locale,
        });
      }
      const resolvedSessionId = SESSION_PATTERN.test(String(result.sessionId || '')) ? result.sessionId : randomUUID();
      if (!wantsStream) response.append('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(resolvedSessionId)}; Path=/api/assistant; Max-Age=1800; HttpOnly; SameSite=Lax${cookieSecure ? '; Secure' : ''}`);
      const rawMetrics = result.metrics || {};
      const metrics = Object.fromEntries(['totalDurationNs', 'loadDurationNs', 'promptTokens', 'promptEvalDurationNs', 'generatedTokens', 'generationDurationNs', 'firstTokenMs', 'retrievalMs', 'totalServiceMs']
        .filter((key) => rawMetrics[key] !== null && rawMetrics[key] !== undefined && Number.isFinite(Number(rawMetrics[key])) && Number(rawMetrics[key]) >= 0)
        .map((key) => [key, Number(rawMetrics[key])]));
      return response.json({ answer: result.answer, ...(result.turnId ? { turnId: result.turnId } : {}), sources: result.sources || [], grounded: Boolean(result.grounded), status: result.status || 'ok', locale: result.locale || parsed.data.locale, ...(Object.keys(metrics).length ? { metrics } : {}) });
    } catch (error) {
      if (error?.status === 400) return response.status(400).json({ error: { code: 'INVALID_MESSAGE', message: 'Enter a message of up to 1,000 characters.' } });
      if (error?.status === 429) return response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Please wait a moment before sending another message.' } });
      if (error?.status === 503 || error?.name === 'TimeoutError' || error?.name === 'AbortError') return safeUnavailable(response);
      request.log?.error?.({ err: error?.constructor?.name || 'Error' }, 'local assistant request failed');
      return safeUnavailable(response);
    }
  });

  router.post('/edit', express.json({ limit: '8kb', type: 'application/json' }), limiter, async (request, response) => {
    if (!/^application\/json(?:\s*;|$)/iu.test(request.get('content-type') || '')) {
      return response.status(415).json({ error: { code: 'UNSUPPORTED_CONTENT_TYPE', message: 'Send a JSON message.' } });
    }
    if (!sameOriginIfPresent(request, allowedOrigins)) {
      return response.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'This request is not allowed.' } });
    }
    if (typeof service.editTurn !== 'function') {
      return response.status(503).json({ error: { code: 'EDIT_UNAVAILABLE', message: 'This conversation cannot be edited right now.' } });
    }
    const parsed = editRequestSchema.safeParse(request.body);
    if (!parsed.success) return response.status(400).json({ error: { code: 'INVALID_EDIT', message: 'Enter a message of up to 1,000 characters.' } });
    const sessionId = cookieValue(request, SESSION_COOKIE);
    if (!sessionId) return response.status(409).json({ error: { code: 'SESSION_EXPIRED', message: 'This conversation has expired. Send the question again to start a new conversation.' } });

    const abortController = new AbortController();
    const abortOnDisconnect = () => abortController.abort();
    request.once('aborted', abortOnDisconnect);
    response.once('close', () => { if (!response.writableEnded) abortOnDisconnect(); });
    response.status(200);
    response.set({
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();
    const writeEvent = (event) => new Promise((resolvePromise, reject) => {
      if (response.destroyed) return reject(Object.assign(new Error('The visitor disconnected.'), { name: 'AbortError' }));
      if (response.write(`${JSON.stringify(event)}\n`)) return resolvePromise();
      const onDrain = () => { cleanup(); resolvePromise(); };
      const onClose = () => { cleanup(); reject(Object.assign(new Error('The visitor disconnected.'), { name: 'AbortError' })); };
      const cleanup = () => { response.off('drain', onDrain); response.off('close', onClose); };
      response.once('drain', onDrain);
      response.once('close', onClose);
    });
    try {
      const result = await service.editTurn({
        sessionId,
        turnId: parsed.data.turnId,
        message: parsed.data.message,
        locale: parsed.data.locale,
        signal: abortController.signal,
        onToken: (text) => writeEvent({ type: 'delta', text }),
      });
      if (abortController.signal.aborted || response.destroyed) return;
      await writeEvent({ type: 'done', answer: result.answer, turnId: result.turnId || parsed.data.turnId, sources: result.sources || [], grounded: Boolean(result.grounded), status: result.status || 'ok', locale: result.locale || parsed.data.locale || 'en', metrics: result.metrics || {} });
      return response.end();
    } catch (error) {
      if (abortController.signal.aborted || error?.name === 'AbortError' || response.destroyed) return;
      const safeCode = ['INSUFFICIENT_MEMORY_HEADROOM', 'MODEL_BUSY', 'MODEL_UNAVAILABLE', 'SESSION_BUSY', 'TURN_NOT_FOUND', 'SESSION_EXPIRED', 'EDIT_NOT_COMMITTED'].includes(error?.code) ? error.code : 'EDIT_FAILED';
      await writeEvent({ type: 'error', code: safeCode, message: 'Lake Assistant could not update this turn. Your previous conversation is unchanged.' }).catch(() => {});
      return response.end();
    } finally {
      request.off('aborted', abortOnDisconnect);
    }
  });

  router.post('/regenerate', express.json({ limit: '1kb', type: 'application/json' }), limiter, async (request, response) => {
    try {
      if (!/^application\/json(?:\s*;|$)/iu.test(request.get('content-type') || '')) {
        return response.status(415).json({ error: { code: 'UNSUPPORTED_CONTENT_TYPE', message: 'Send a JSON request.' } });
      }
      if (!sameOriginIfPresent(request, allowedOrigins)) {
        return response.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'This request is not allowed.' } });
      }
      const parsed = regenerateRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return response.status(400).json({ error: { code: 'INVALID_REGENERATION', message: 'This response cannot be regenerated.' } });
      }
      if (typeof service.regenerate !== 'function') {
        return response.status(503).json({ error: { code: 'REGENERATION_UNAVAILABLE', message: 'Lake Assistant cannot regenerate this response right now.' } });
      }
      const sessionId = cookieValue(request, SESSION_COOKIE);
      if (!sessionId) return response.status(409).json({ error: { code: 'NO_REGENERATABLE_RESPONSE', message: 'There is no recent response to regenerate.' } });

      const abortController = new AbortController();
      const abortOnDisconnect = () => abortController.abort();
      request.once('aborted', abortOnDisconnect);
      response.once('close', () => { if (!response.writableEnded) abortOnDisconnect(); });
      response.status(200);
      response.set({
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, no-transform',
        'X-Accel-Buffering': 'no',
      });
      response.flushHeaders();
      const writeEvent = (event) => new Promise((resolvePromise, reject) => {
        if (response.destroyed) return reject(Object.assign(new Error('The visitor disconnected.'), { name: 'AbortError' }));
        if (response.write(`${JSON.stringify(event)}\n`)) return resolvePromise();
        const onDrain = () => { cleanup(); resolvePromise(); };
        const onClose = () => { cleanup(); reject(Object.assign(new Error('The visitor disconnected.'), { name: 'AbortError' })); };
        const cleanup = () => { response.off('drain', onDrain); response.off('close', onClose); };
        response.once('drain', onDrain);
        response.once('close', onClose);
      });
      try {
        const result = await service.regenerate({
          sessionId,
          locale: parsed.data.locale,
          signal: abortController.signal,
          onToken: (text) => writeEvent({ type: 'delta', text }),
        });
        if (abortController.signal.aborted || response.destroyed) return;
        await writeEvent({ type: 'done', answer: result.answer, sources: result.sources || [], grounded: Boolean(result.grounded), status: result.status || 'ok', locale: result.locale || 'en', metrics: result.metrics || {} });
        return response.end();
      } catch (error) {
        if (abortController.signal.aborted || error?.name === 'AbortError' || response.destroyed) return;
        const safeCode = ['INSUFFICIENT_MEMORY_HEADROOM', 'MODEL_BUSY', 'MODEL_UNAVAILABLE', 'SESSION_BUSY', 'NO_REGENERATABLE_RESPONSE'].includes(error?.code) ? error.code : 'REGENERATION_FAILED';
        await writeEvent({ type: 'error', code: safeCode, message: 'Lake Assistant could not regenerate this response. Your existing answer is unchanged.' }).catch(() => {});
        return response.end();
      } finally {
        request.off('aborted', abortOnDisconnect);
      }
    } catch (error) {
      if (error?.status === 429) return response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Please wait a moment before trying again.' } });
      request.log?.error?.({ err: error?.constructor?.name || 'Error' }, 'local assistant regeneration request failed');
      return safeUnavailable(response);
    }
  });

  return router;
}
