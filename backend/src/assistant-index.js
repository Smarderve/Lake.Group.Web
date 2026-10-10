import express from 'express';
import { createAssistantChatService } from './lib/assistant-rag.js';
import { createAssistantTranscriptionService } from './lib/assistant-transcription.js';
import { assistantRouter } from './routes/assistant.js';

const port = Number.parseInt(process.env.PORT || '4001', 10);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Assistant API port is invalid.');
const allowedOrigins = String(process.env.LAKE_ASSISTANT_ALLOWED_ORIGINS || '')
  .split(/[;,]/)
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevelopment = process.env.NODE_ENV !== 'production';
if (!allowedOrigins.length || allowedOrigins.some((origin) => {
  try {
    const parsed = new URL(origin);
    return parsed.protocol !== 'https:' && !(localDevelopment && parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname));
  } catch { return true; }
})) throw new Error('Assistant API requires explicit HTTPS website origins (HTTP is permitted only for local development origins).');

const app = express();
app.disable('x-powered-by');
// This process is reachable only on loopback; IIS is its sole public proxy.
app.set('trust proxy', 1);
app.use('/api/assistant', assistantRouter({
  service: createAssistantChatService(),
  transcriptionService: createAssistantTranscriptionService(),
  cookieSecure: !localDevelopment,
  allowedOrigins,
}));

const server = app.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Lake Assistant private API listening on 127.0.0.1:${port}\n`);
});
server.requestTimeout = 125_000;
server.headersTimeout = 60_000;
server.keepAliveTimeout = 5_000;

function shutdown() {
  server.close(() => process.exit(0));
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
