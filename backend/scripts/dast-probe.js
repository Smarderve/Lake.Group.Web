/**
 * SECURITY_ROADMAP Phase 22 — DAST probe (dynamic application security
 * testing) against a RUNNING backend. Every check is non-destructive:
 * GET/HEAD requests, one malformed-body POST, one bogus-login series — no
 * writes, no data mutation, no probe-account creation.
 *
 *   node scripts/dast-probe.js [BASE_URL]     (default http://127.0.0.1:4000)
 *
 * Exit 0 = every check passed, 1 = at least one FAIL (CI blocks the merge).
 * Prints one line per check so failures name themselves.
 */
const BASE = process.argv[2] || process.env.DAST_BASE_URL || 'http://127.0.0.1:4000';
const CHECK_TIMEOUT_MS = 8000;
const LOGIN_RATE_LIMIT_ATTEMPTS = 8; // Phase 10: burst should 429 well before this

let failures = 0;
const results = [];

function report(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
}

async function get(path, headers = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, { headers, signal: ctl.signal, redirect: 'manual' });
    const body = await res.text();
    return { status: res.status, headers: res.headers, body };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  // 1. Health — the probe target is actually the backend.
  try {
    const h = await get('/health');
    report('health endpoint responds', h.status === 200, `status ${h.status}`);
  } catch (err) {
    report('health endpoint responds', false, String(err.message || err));
  }

  // 2. Security headers on a public read (Phase 11).
  {
    const r = await get('/api/public/news?limit=1');
    const hs = r.headers;
    const need = ['x-content-type-options', 'x-frame-options', 'content-security-policy', 'referrer-policy', 'permissions-policy'];
    const missing = need.filter((n) => !hs.get(n));
    report('security headers present on public reads', missing.length === 0 && r.status < 500, `missing: ${missing.join(', ') || 'none'}`);
    const csp = hs.get('content-security-policy') || '';
    report('CSP blocks framing (frame-ancestors none)', csp.includes("frame-ancestors 'none'"), csp);
  }

  // 3. Admin surface requires authentication (no anonymous admin reads).
  {
    const r = await get('/admin/companies');
    report('admin API rejects anonymous access', r.status === 401, `status ${r.status}`);
  }

  // 4. CORS scope: the '*' is PUBLIC-router-only (Phase 15). Admin responses
  //    must NOT echo Access-Control-Allow-Origin: *.
  {
    const r = await get('/admin/companies', { Origin: 'https://evil.example' });
    const acao = r.headers.get('access-control-allow-origin');
    report('CORS * does not leak to admin routes', acao !== '*', `ACAO: ${acao}`);
  }

  // 5. Path traversal probe (Phase 14): traversal escapes must not return
  //    200 with file-like content from public reads.
  {
    const r = await get('/api/public/news/..%2F..%2F..%2F..%2Fetc%2Fpasswd');
    const looksLikeFile = r.status === 200 && /root:.*:0:0:/.test(r.body.slice(0, 400));
    report('path traversal escapes rejected', r.status >= 400 || !looksLikeFile, `status ${r.status}`);
  }

  // 6. Malformed JSON → clean 4xx, never a 500 with a stack trace.
  {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), CHECK_TIMEOUT_MS);
    try {
      const res = await fetch(BASE + '/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"email": "x@y.z", "password": "broken',
        signal: ctl.signal,
      });
      const body = await res.text();
      // Real stack frames carry function calls ("at fn ("), file:line
      // markers, or module paths — NOT the standard "at position N" wording
      // of JSON.parse errors, which is clean.
      const leaksStack = /(node_modules|\.js:\d+:\d+|\bat (?:async )?[\w$]+\s*\()/.test(body);
      report('malformed JSON → clean 4xx (no stack leak)', res.status >= 400 && res.status < 500 && !leaksStack, `status ${res.status}, stack: ${leaksStack}`);
    } finally {
      clearTimeout(t);
    }
  }

  // 7. Method not allowed is enforced (no accidental GET-mutate surfaces).
  {
    await get('/api/public/news', {});
    // Public GET is expected to work; the check is that a PUT to a read
    // route is rejected rather than silently accepted.
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), CHECK_TIMEOUT_MS);
    try {
      const res = await fetch(BASE + '/api/public/news', { method: 'PUT', body: '{}', signal: ctl.signal });
      report('unsupported methods rejected', res.status === 405 || res.status === 404, `status ${res.status}`);
    } finally {
      clearTimeout(t);
    }
  }

  // 8. No leaking Server header.
  {
    const r = await get('/health');
    const server = r.headers.get('server') || '';
    report('no verbose Server header', !server || !/\d+\.\d+/.test(server), `Server: ${server || '(none)'}`);
  }

  // 9. Login rate limiting (Phase 10): a burst of bad logins must 429.
  {
    let got429 = false;
    let lastStatus = 0;
    for (let i = 0; i < LOGIN_RATE_LIMIT_ATTEMPTS; i++) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), CHECK_TIMEOUT_MS);
      try {
        const res = await fetch(BASE + '/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: `dast-${i}@probe.invalid`, password: 'wrong-password-for-probe' }),
          signal: ctl.signal,
        });
        lastStatus = res.status;
        if (res.status === 429) { got429 = true; break; }
        await res.text();
      } finally {
        clearTimeout(t);
      }
    }
    report('login rate limiter returns 429 on burst', got429, `last status ${lastStatus}`);
  }

  // Summary.
  for (const r of results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
  }
  console.log(`DAST: ${results.length - failures}/${results.length} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error('DAST probe crashed:', err);
  process.exit(1);
});
