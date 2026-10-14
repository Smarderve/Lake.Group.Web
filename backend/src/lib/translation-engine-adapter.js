import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, statfs } from 'node:fs/promises';
import os from 'node:os';

/** Resource policy is intentionally conservative and externally configurable. */
export async function inspectTranslationResources({ modelPath = process.env.LAKE_TRANSLATION_MODEL_PATH, policy = {} } = {}) {
  const limits = {
    minFreeMemoryBytes: Number(policy.minFreeMemoryBytes ?? process.env.LAKE_TRANSLATION_MIN_FREE_BYTES ?? 8 * 1024 ** 3),
    maxCpuLoad: Number(policy.maxCpuLoad ?? process.env.LAKE_TRANSLATION_MAX_CPU_LOAD ?? 0.8),
    minFreeDiskBytes: Number(policy.minFreeDiskBytes ?? process.env.LAKE_TRANSLATION_MIN_DISK_BYTES ?? 10 * 1024 ** 3),
    maxConcurrentJobs: Number(policy.maxConcurrentJobs ?? process.env.LAKE_TRANSLATION_CONCURRENCY ?? 1),
  };
  const freeMemoryBytes = os.freemem();
  // Windows does not provide a meaningful load average; never interpret its
  // conventional zero return as proof that the CPU is idle.
  const cpuLoad = process.platform === 'win32' ? null : os.loadavg()[0] / Math.max(os.cpus().length, 1);
  let modelBytes = null;
  let freeDiskBytes = null;
  let modelAvailable = false;
  if (modelPath) {
    try {
      const info = await statfs(modelPath);
      freeDiskBytes = Number(info.bavail) * Number(info.bsize);
      modelAvailable = true;
    } catch { /* missing private model path is fail-closed */ }
  }
  const blockers = [];
  if (!modelPath || !modelAvailable) blockers.push('MODEL_PATH_UNAVAILABLE');
  if (freeMemoryBytes < limits.minFreeMemoryBytes) blockers.push('INSUFFICIENT_FREE_MEMORY');
  if (cpuLoad !== null && cpuLoad > limits.maxCpuLoad) blockers.push('CPU_BUSY');
  if (freeDiskBytes !== null && freeDiskBytes < limits.minFreeDiskBytes) blockers.push('INSUFFICIENT_DISK');
  return { ready: blockers.length === 0, blockers, totalMemoryBytes: os.totalmem(), freeMemoryBytes, cpuCount: os.cpus().length, cpuLoad, cpuLoadSupported: cpuLoad !== null, freeDiskBytes, modelPathConfigured: Boolean(modelPath), gpu: 'not-probed', limits };
}

/**
 * Provider-neutral local process adapter. The IT-approved executable implements
 * line-delimited JSON: one request on stdin, one JSON result on stdout. No model
 * format or runtime is assumed; absent configuration always fails closed.
 */
export function createOfflineProcessAdapter({ executable = process.env.LAKE_TRANSLATION_EXECUTABLE, modelPath = process.env.LAKE_TRANSLATION_MODEL_PATH, resourcePolicy = {}, args = [], timeoutMs = Number(process.env.LAKE_TRANSLATION_JOB_TIMEOUT_MS || 120000), maxOutputBytes = 1024 * 1024, resourceCheck = inspectTranslationResources } = {}) {
  return async function translate(input) {
    if (!executable) throw Object.assign(new Error('No approved offline translation engine is configured.'), { code: 'TRANSLATION_ENGINE_NOT_CONFIGURED' });
    const resources = await resourceCheck({ modelPath, policy: resourcePolicy });
    if (!resources.ready) throw Object.assign(new Error(`Translation engine paused by resource policy (${resources.blockers.join(',')}).`), { code: 'TRANSLATION_RESOURCE_POLICY' });
    await access(executable, fsConstants.X_OK).catch(() => { throw Object.assign(new Error('Configured translation executable is unavailable.'), { code: 'TRANSLATION_ENGINE_UNAVAILABLE' }); });
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true, env: { ...process.env, LAKE_TRANSLATION_MODEL_PATH: modelPath || '' } });
      let stdout = '';
      let settled = false;
      const timer = setTimeout(() => { child.kill(); finish(Object.assign(new Error('Translation job timed out.'), { code: 'TRANSLATION_TIMEOUT' })); }, timeoutMs);
      const finish = (error, result) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(result); };
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; if (Buffer.byteLength(stdout) > maxOutputBytes) { child.kill(); finish(Object.assign(new Error('Engine response exceeded the configured limit.'), { code: 'TRANSLATION_OUTPUT_LIMIT' })); } });
      child.on('error', () => finish(Object.assign(new Error('Translation process could not start.'), { code: 'TRANSLATION_ENGINE_UNAVAILABLE' })));
      child.on('close', (code) => {
        if (code !== 0) return finish(Object.assign(new Error(`Translation process exited with code ${code}.`), { code: 'TRANSLATION_ENGINE_FAILED' }));
        try {
          const result = JSON.parse(stdout);
          if (typeof result.translation !== 'string' || !result.modelVersion || result.fixture === true) throw new Error('Invalid model result metadata.');
          finish(null, result);
        } catch { finish(Object.assign(new Error('Translation process returned an invalid response.'), { code: 'TRANSLATION_INVALID_RESPONSE' })); }
      });
      child.stdin.end(`${JSON.stringify(input)}\n`);
    });
  };
}

export const OFFLINE_ENGINE_CANDIDATES = Object.freeze({
  madlad400: { checkpoint: 'google/madlad400-3b-mt', state: 'unbenchmarked-unapproved' },
  m2m100: { checkpoint: 'facebook/m2m100_418M', state: 'unbenchmarked-unapproved' },
  ctranslate2: { runtime: 'operator-supplied-adapter', state: 'compatibility-unverified' },
});
