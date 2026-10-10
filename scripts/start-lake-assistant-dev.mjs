import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { connect } from 'node:net';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modelName = 'qwen3:4b-instruct-2507-q4_K_M';
const explicitWebsitePort = Boolean(process.env.LAKE_ASSISTANT_DEV_PORT);
const explicitBackendPort = Boolean(process.env.LAKE_ASSISTANT_BACKEND_PORT);
let websitePort = Number(process.env.LAKE_ASSISTANT_DEV_PORT || 8000);
let backendPort = Number(process.env.LAKE_ASSISTANT_BACKEND_PORT || 4001);
const ollamaPort = Number(process.env.LAKE_ASSISTANT_OLLAMA_PORT || 11434);
const nodePath = process.execPath;
const ollamaPath = resolve(root, 'ai/runtime/ollama/ollama.exe');
const backendEntry = resolve(root, 'backend/src/assistant-index.js');
const speechManifestPath = resolve(root, 'ai/speech/config/whisper-manifest.json');
const children = [];
let closing = false;

function fail(message) { throw new Error(message); }
function delay(ms) { return new Promise((done) => setTimeout(done, ms)); }

async function isListening(port) {
  return new Promise((done) => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => { socket.destroy(); done(true); });
    socket.once('error', () => done(false));
    socket.once('timeout', () => { socket.destroy(); done(false); });
  });
}

async function findFreePort(startPort, excludedPort) {
  for (let offset = 0; offset < 200; offset += 1) {
    const candidate = startPort + offset;
    if (candidate > 65535) break;
    if (candidate !== excludedPort && !(await isListening(candidate))) return candidate;
  }
  fail(`No free loopback port is available near ${startPort}.`);
}

async function selectDevelopmentPorts() {
  if (await isListening(websitePort)) {
    if (explicitWebsitePort) fail(`Website port ${websitePort} is already occupied; no listener was stopped.`);
    const previous = websitePort;
    websitePort = await findFreePort(websitePort + 1, backendPort);
    console.warn(`Website port ${previous} is occupied; using ${websitePort} without stopping the existing service.`);
  }
  if (await isListening(backendPort)) {
    let reusable = false;
    try {
      const { response, payload } = await getJson(`http://127.0.0.1:${backendPort}/api/assistant/health`);
      if (response.ok && payload.status === 'ready') {
        const voice = await getJson(`http://127.0.0.1:${backendPort}/api/assistant/voice-health`);
        reusable = voice.response.ok && voice.payload.ready;
      }
    } catch { reusable = false; }
    if (!reusable) {
      if (explicitBackendPort) fail(`Backend port ${backendPort} is occupied by an API that is not ready for private voice transcription; no listener was stopped.`);
      const previous = backendPort;
      backendPort = await findFreePort(backendPort + 1, websitePort);
      console.warn(`Backend port ${previous} does not expose a ready assistant and voice endpoint; using ${backendPort} without stopping the existing service.`);
    }
  }
}

async function getJson(url, timeoutMs = 3000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function sha256File(path) {
  const hash = createHash('sha256');
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.once('error', reject);
    stream.once('end', resolvePromise);
  });
  return hash.digest('hex');
}

async function ensureSpeechPayload() {
  if (!existsSync(speechManifestPath)) fail(`Whisper manifest is missing: ${speechManifestPath}`);
  const manifest = JSON.parse(await readFile(speechManifestPath, 'utf8'));
  const cliPath = resolve(root, manifest.runtime.installedPath);
  const modelPath = resolve(root, manifest.model.file);
  for (const [label, path, expectedBytes, expectedHash] of [
    ['Whisper runtime', cliPath, manifest.runtime.executableBytes, manifest.runtime.executableSha256],
    ['Whisper Base model', modelPath, manifest.model.bytes, manifest.model.sha256],
  ]) {
    if (!existsSync(path)) fail(`${label} is missing: ${path}`);
    const info = await stat(path);
    if (info.size !== expectedBytes) fail(`${label} has ${info.size} bytes; expected ${expectedBytes}.`);
    if (await sha256File(path) !== expectedHash) fail(`${label} failed its pinned SHA-256 check.`);
  }
  for (const dependency of manifest.runtime.dependencies || []) {
    if (!existsSync(resolve(root, 'ai/speech/runtime', dependency))) fail(`Whisper runtime dependency is missing: ${dependency}`);
  }
  console.log(`Verified bundled Whisper ${manifest.runtime.version} and ${manifest.model.name}.`);
}

function launch(executable, args, options) {
  const child = spawn(executable, args, { windowsHide: true, stdio: 'inherit', ...options });
  child.once('error', (error) => process.stderr.write(`Assistant dev service failed to start: ${error.message}\n`));
  child.once('exit', (code) => {
    if (!closing && code !== 0 && code !== null) process.stderr.write(`Assistant dev service exited with code ${code}.\n`);
  });
  children.push(child);
  return child;
}

async function waitFor(check, child, label, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'not ready yet';
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) fail(`${label} exited with code ${child.exitCode}.`);
    try {
      const value = await check();
      if (value) return value;
    } catch (error) { lastError = error.message; }
    await delay(1000);
  }
  fail(`${label} did not become ready within ${Math.round(timeoutMs / 1000)} seconds (${lastError}).`);
}

async function ensureOllama() {
  if (await isListening(ollamaPort)) {
    let result;
    try { result = await getJson(`http://127.0.0.1:${ollamaPort}/api/tags`); }
    catch { fail(`Port ${ollamaPort} is occupied by a service that is not a ready Ollama server; no duplicate was started.`); }
    if (!result.response.ok || !(result.payload.models || []).some((item) => item.name === modelName || item.model === modelName)) {
      fail(`Port ${ollamaPort} is already occupied and does not expose the required ${modelName}; no process was stopped or duplicated.`);
    }
    console.log(`Reusing loopback Ollama with the required model on port ${ollamaPort}.`);
    return;
  }
  if (process.platform !== 'win32' || !existsSync(ollamaPath)) fail(`Packaged Ollama is missing: ${ollamaPath}`);
  const ollama = launch(ollamaPath, ['serve'], {
    cwd: root,
    env: { ...process.env, OLLAMA_MODELS: resolve(root, 'ai/models'), OLLAMA_HOST: `127.0.0.1:${ollamaPort}`, OLLAMA_NUM_PARALLEL: '1', OLLAMA_NO_CLOUD: '1' },
  });
  await waitFor(async () => {
    const { response, payload } = await getJson(`http://127.0.0.1:${ollamaPort}/api/tags`);
    return response.ok && (payload.models || []).some((item) => item.name === modelName || item.model === modelName);
  }, ollama, 'Bundled Ollama/model');
  console.log(`Bundled Ollama is ready with ${modelName} on port ${ollamaPort}.`);
}

async function ensureBackend() {
  if (await isListening(backendPort)) {
    try {
      const { response, payload } = await getJson(`http://127.0.0.1:${backendPort}/api/assistant/health`);
      if (response.ok && payload.status === 'ready') {
        const voice = await getJson(`http://127.0.0.1:${backendPort}/api/assistant/voice-health`);
        if (!voice.response.ok || !voice.payload.ready) fail(`The API is ready, but private Whisper transcription is not ready on port ${backendPort}.`);
        console.log(`Reusing ready Lake Assistant API and private Whisper on port ${backendPort}.`);
        return;
      }
    } catch { /* report the occupied port below */ }
    fail(`Port ${backendPort} is occupied but is not a ready Lake Assistant API; no process was stopped or duplicated.`);
  }
  const backend = launch(nodePath, [backendEntry], {
    cwd: resolve(root, 'backend'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(backendPort),
      LAKE_ASSISTANT_OLLAMA_PORT: String(ollamaPort),
      LAKE_ASSISTANT_ALLOWED_ORIGINS: `http://127.0.0.1:${websitePort},http://localhost:${websitePort}`,
    },
  });
  await waitFor(async () => {
    const { response, payload } = await getJson(`http://127.0.0.1:${backendPort}/api/assistant/health`);
    if (!response.ok || payload.status !== 'ready') return false;
    const voice = await getJson(`http://127.0.0.1:${backendPort}/api/assistant/voice-health`);
    return voice.response.ok && voice.payload.ready;
  }, backend, 'Lake Assistant API', 30_000);
  console.log(`Lake Assistant API and private Whisper are ready on 127.0.0.1:${backendPort}.`);
}

const mimeTypes = {
  '.avif': 'image/avif', '.css': 'text/css; charset=utf-8', '.gif': 'image/gif', '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mp4': 'video/mp4', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

async function serveWebsite(request, response) {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  if (url.pathname === '/api/assistant' || url.pathname.startsWith('/api/assistant/')) {
    const upstream = httpRequest({
      hostname: '127.0.0.1', port: backendPort, path: `${url.pathname}${url.search}`,
      method: request.method, headers: { ...request.headers, host: `127.0.0.1:${backendPort}` },
    }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.once('error', () => {
      if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ error: { code: 'ASSISTANT_PROXY_UNAVAILABLE', message: 'The local assistant API is unavailable.' } }));
    });
    request.pipe(upstream);
    return;
  }
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
    response.writeHead(405, { allow: 'GET, HEAD' }); response.end(); return;
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { response.writeHead(400); response.end('Bad request'); return; }
  if (pathname.split('/').some((part) => ['.git', 'backend', 'node_modules', 'ai'].includes(part.toLowerCase())) || pathname.includes('\\')) {
    response.writeHead(404); response.end('Not found'); return;
  }
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  const relativePath = relative(root, file);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
  try {
    const info = await stat(file);
    if (!info.isFile()) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, {
      'content-type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': info.size,
      'x-content-type-options': 'nosniff',
      'permissions-policy': 'camera=(), microphone=(self), geolocation=(), payment=()',
      ...(file.endsWith('assistant.js') || file.endsWith('assistant.css') || file.endsWith('sw.js') ? { 'cache-control': 'no-store' } : {}),
    });
    if (request.method === 'HEAD') response.end(); else createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end('Not found'); }
}

async function shutdown() {
  if (closing) return;
  closing = true;
  await new Promise((done) => website.close(done));
  for (const child of [...children].reverse()) if (child.exitCode === null) child.kill();
  setTimeout(() => process.exit(0), 500).unref();
}

await ensureSpeechPayload();
await selectDevelopmentPorts();
await ensureOllama();
await ensureBackend();
if (await isListening(websitePort)) fail(`Website port ${websitePort} is occupied; no listener was stopped. Set LAKE_ASSISTANT_DEV_PORT to a free port and run again.`);

const website = createServer((request, response) => { void serveWebsite(request, response); });
website.on('error', (error) => { process.stderr.write(`Local website server failed: ${error.message}\n`); void shutdown(); });
await new Promise((done, reject) => website.listen(websitePort, '127.0.0.1', (error) => error ? reject(error) : done()));
console.log(`Lake Assistant development site: http://127.0.0.1:${websitePort}/`);
console.log(`Assistant health: http://127.0.0.1:${websitePort}/api/assistant/health`);
console.log('Press Ctrl+C to stop only the services started by this command.');
process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
