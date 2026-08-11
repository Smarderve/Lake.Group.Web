#!/usr/bin/env node
/**
 * Phase 11 — performance / load check against the running backend.
 *
 * Fires a configurable number of concurrent requests across the read-heavy
 * public surface (health, metrics, companies, knowledge facts, map, news)
 * and reports throughput + latency percentiles. Exits non-zero when p95
 * exceeds the threshold (500 ms default), so it can gate a release.
 *
 * Usage:  npm run perf:load            (backend on :4000, default 300 req, 20 concurrent)
 *         node scripts/load-check.js --base http://127.0.0.1:4000 --total 1000 --concurrency 50 --p95 400
 */
import 'dotenv/config';

const args = process.argv.slice(2);
function arg(name, dflt) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : dflt;
}

const BASE = (arg('--base', process.env.LAKE_API_BASE || 'http://127.0.0.1:4000')).replace(/\/+$/, '');
const TOTAL = Number(arg('--total', '300'));
const CONCURRENCY = Number(arg('--concurrency', '20'));
const P95_MS = Number(arg('--p95', '500'));

const ENDPOINTS = [
  ['/health', null],
  ['/api/public/metrics/employees', null],
  ['/api/public/companies', null],
  ['/api/public/knowledge/facts', null],
  ['/api/public/map', null],
  ['/api/public/news', null],
];

async function one(endpoint) {
  const started = performance.now();
  const res = await fetch(BASE + endpoint);
  if (!res.ok) throw new Error(`${endpoint} -> HTTP ${res.status}`);
  await res.arrayBuffer(); // drain the body
  return performance.now() - started;
}

async function main() {
  console.log(`Load check: ${TOTAL} requests / concurrency ${CONCURRENCY} / p95 gate ${P95_MS}ms`);
  console.log(`Endpoints: ${ENDPOINTS.map(([e]) => e).join(', ')}`);

  const queue = [];
  for (let i = 0; i < TOTAL; i += 1) {
    queue.push(ENDPOINTS[i % ENDPOINTS.length][0]);
  }

  const latencies = [];
  let failures = 0;
  let next = 0;
  const started = performance.now();

  async function worker() {
    while (next < queue.length) {
      const endpoint = queue[next];
      next += 1;
      try {
        latencies.push(await one(endpoint));
      } catch (e) {
        failures += 1;
        console.error('  request failed:', e.message);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const elapsedSec = (performance.now() - started) / 1000;

  latencies.sort((a, b) => a - b);
  const p = (q) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * q))].toFixed(1);
  const rps = (latencies.length / elapsedSec).toFixed(1);

  console.log(`\nCompleted ${latencies.length} ok / ${failures} failed in ${elapsedSec.toFixed(1)}s`);
  console.log(`Throughput: ${rps} req/s`);
  console.log(`Latency: min ${latencies[0].toFixed(1)}ms · p50 ${p(0.5)}ms · p95 ${p(0.95)}ms · max ${latencies[latencies.length - 1].toFixed(1)}ms`);

  const p95 = Number(p(0.95));
  const pass = failures === 0 && p95 <= P95_MS;
  console.log(pass ? `\nRESULT: PASS (p95 ${p95}ms <= ${P95_MS}ms)` : `\nRESULT: FAIL (p95 ${p95}ms > ${P95_MS}ms or failures)`);
  process.exit(pass ? 0 : 1);
}

main();
