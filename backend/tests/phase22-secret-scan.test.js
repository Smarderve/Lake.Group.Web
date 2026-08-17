import { describe, it, expect } from 'vitest';
import { PATTERNS, scanContent, scanGitignoreRules, runScan } from '../../scripts/check-secrets.mjs';

// SECURITY_ROADMAP Phase 22 — Security Scanning: secret scan regression
// lock. Every pattern must fire on its real credential shape and stay quiet
// on placeholders and test fixtures (the scanner's documented anti-false-
// positive contract).
//
// IMPORTANT: samples are assembled at runtime from fragments so the test
// source itself never contains a full credential shape — otherwise the
// live-tree sweep (runScan) would flag this very file.

const POSITIVES = [
  ['AWS access key', ['AKIA', 'IOSFODNN7EXAMPLE']],
  ['AWS temporary key', ['ASIA', 'IOSFODNN7EXAMPLE']],
  ['GitHub personal access token', ['ghp_', 'A'.repeat(36)]],
  ['GitHub OAuth token', ['gho_', 'B'.repeat(36)]],
  ['Slack token', ['xoxb-', '123456789012-1234567890123-abcdefghijklmn']],
  ['OpenAI-style API key', ['sk-proj-', 'abcdefghijklmnopqrstuvwxyz1234567890']],
  ['Stripe live secret key', ['sk_live_', '51H4xKpLmNopQrStUvWxYz1234']],
  ['Stripe live restricted key', ['rk_live_', '51H4xKpLmNopQrStUvWxYz1234']],
  ['Google API key', ['AIzaSy', '1234567890abcdefghijklmnopqrstuvw']],
  ['JWT', ['eyJhbGciOiJIUzI1NiJ9.', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0.', 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c']],
  ['private key block', ['-----BEGIN ', 'RSA PRIVATE KEY-----', '\nMIIEowIBAAKCAQEA', '\n-----END RSA ', 'PRIVATE KEY-----']],
];

const NEGATIVES = [
  'ghp_xxx placeholder token here',
  'sk-xxx-your-api-key-here',
  'AKIA-REPLACE-ME',
  'password = "hunter2"', // generic password, NOT a credential format
  'apiKey: process.env.API_KEY',
  'const token = req.headers.authorization',
  'AIzaSy placeholder', // too short
  '-----BEGIN CERTIFICATE-----', // public cert, not a private key
  'xoxb-<your-slack-token>', // placeholder (angle brackets break the shape)
];

describe('SECURITY_ROADMAP Phase 22 — secret scan', () => {
  it('every credential pattern fires on its real shape', () => {
    for (const [label, parts] of POSITIVES) {
      const sample = parts.join('');
      const hits = scanContent(sample);
      expect(hits.length, `${label}: expected a hit`).toBeGreaterThan(0);
    }
  });

  it('placeholders and generic values stay quiet (no false positives)', () => {
    for (const sample of NEGATIVES) {
      const hits = scanContent(sample);
      expect(hits, `should not flag: ${sample}`).toEqual([]);
    }
  });

  it('gitignore check passes on the real repo (live .env protection)', () => {
    const { hasEnv } = scanGitignoreRules();
    expect(hasEnv).toBe(true);
  });

  it('real working tree is clean (live sweep, tracked sources)', () => {
    const { findings } = runScan();
    expect(findings).toEqual([]);
  });

  it('each positive maps to the pattern it targets (label correspondence)', () => {
    for (const [label, parts] of POSITIVES) {
      const sample = parts.join('');
      const labels = scanContent(sample).map((h) => h.label);
      const expectedToken = label.split(' ')[0];
      expect(labels.some((l) => l.includes(expectedToken)),
        `${label}: got ${labels.join(', ')}`).toBe(true);
    }
  });

  it('PATTERNS table is wired to every positive (no orphan pattern)', () => {
    const firedLabels = new Set();
    for (const [, parts] of POSITIVES) {
      for (const { label } of scanContent(parts.join(''))) firedLabels.add(label);
    }
    for (const [, label] of PATTERNS) {
      expect(firedLabels.has(label), `pattern never exercised: ${label}`).toBe(true);
    }
  });
});
