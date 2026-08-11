import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// SECURITY_ROADMAP Phase 14 — Path Traversal.
//
// Audit found two traversal surfaces:
//   1. The backend content-health link checker joined DB-controlled asset
//      URLs against repoRoot with path.join — a URL like "/../../etc/passwd"
//      escaped the root and probed arbitrary files (existence oracle).
//   2. The localhost verification static servers — six used the classic
//      `startsWith(ROOT)` prefix check (escapable via a sibling dir sharing
//      the root prefix) and four had NO containment guard at all.
// All static servers now route through scripts/_safe_static.js
// (resolveStatic — separator-aware containment). These tests lock both
// fixes down.

const require = createRequire(import.meta.url);
const { resolveStatic } = require('../../scripts/_safe_static.js');

const ROOT = join(tmpdir(), `p14-root-${Date.now()}`);
const SCRIPTS_DIR = fileURLToPath(new URL('../../scripts', import.meta.url));

describe('SECURITY_ROADMAP Phase 14 — path traversal', () => {
  describe('resolveStatic (shared static-server resolver)', () => {
    it('serves legitimate in-root paths', () => {
      expect(resolveStatic(ROOT, '/index.html')).toBe(join(ROOT, 'index.html'));
      expect(resolveStatic(ROOT, '/assets/img.png')).toBe(join(ROOT, 'assets', 'img.png'));
      expect(resolveStatic(ROOT, '/a/../b.png')).toBe(join(ROOT, 'b.png')); // harmless normalization
      expect(resolveStatic(ROOT, '/index.html?v=3#frag')).toBe(join(ROOT, 'index.html'));
    });

    it('rejects .. escapes (plain and percent-encoded)', () => {
      expect(resolveStatic(ROOT, '/../secret')).toBeNull();
      expect(resolveStatic(ROOT, '/../../etc/passwd')).toBeNull();
      expect(resolveStatic(ROOT, '/..%2f..%2fetc%2fpasswd')).toBeNull();
      expect(resolveStatic(ROOT, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
      expect(resolveStatic(ROOT, '/assets/../../../etc/passwd')).toBeNull();
      expect(resolveStatic(ROOT, '/%2e%2e')).toBeNull();
    });

    it('rejects the sibling-prefix escape (startsWith(ROOT) without separator)', () => {
      // A sibling directory whose name merely shares the root's prefix —
      // "ROOT2" — must NOT be reachable through ".." (the classic
      // startsWith(ROOT)-without-separator escape).
      expect(resolveStatic(ROOT, '/../' + dirname(ROOT).split(/[\\/]/).pop() + '-sibling/x')).toBeNull();
      expect(resolveStatic(ROOT, '/../' + ROOT.split(/[\\/]/).pop() + '2/secret')).toBeNull();
    });

    it('rejects malformed input (bad encoding, null bytes)', () => {
      expect(resolveStatic(ROOT, '/%zz')).toBeNull();
      expect(resolveStatic(ROOT, '/%00')).toBeNull();
    });

    it('returns the root itself for "/" (callers map to a default page)', () => {
      expect(resolveStatic(ROOT, '/')).toBe(ROOT);
    });
  });

  describe('content-health checkLinks containment', () => {
    it('a /../../ URL cannot probe files outside repoRoot (existence oracle closed)', async () => {
      const parent = mkdtempSync(join(tmpdir(), 'p14-parent-'));
      const site = join(parent, 'site');
      const sibling = join(parent, 'site2'); // the prefix-escape sibling
      mkdirSync(site, { recursive: true });
      mkdirSync(sibling, { recursive: true });
      mkdirSync(join(site, 'assets'), { recursive: true });
      writeFileSync(join(site, 'assets', 'real.png'), 'x');
      writeFileSync(join(parent, 'secret.txt'), 'TOP SECRET'); // outside site
      writeFileSync(join(sibling, 'leak.txt'), 'sibling');     // sibling dir
      try {
        const { checkLinks } = await import('../src/lib/content-health.js');
        const db = {
          company: { findMany: async () => [
            { slug: 'a', website: '/assets/real.png', logo: null },   // inside → exists
            { slug: 'b', website: '/../secret.txt', logo: null },     // escape → must be missing
            { slug: 'c', website: '/../site2/leak.txt', logo: null }, // sibling → must be missing
          ] },
          leadership: { findMany: async () => [] },
          media: { findMany: async () => [] },
        };
        const res = await checkLinks(db, { repoRoot: site });
        const missing = res.internal.missing.map((m) => m.value);
        expect(missing).toContain('/../secret.txt');
        expect(missing).toContain('/../site2/leak.txt');
        expect(missing).not.toContain('/assets/real.png');
        expect(res.internal.checked).toBe(3);
      } finally {
        rmSync(parent, { recursive: true, force: true });
      }
    });
  });

  describe('static-server tripwire', () => {
    it('no static server in scripts/ uses the bare prefix guard anymore', () => {
      const files = readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith('.js') && f !== '_safe_static.js');
      expect(files.length).toBeGreaterThan(20);
      for (const file of files) {
        const src = readFileSync(join(SCRIPTS_DIR, file), 'utf8');
        expect(src.match(/\bstartsWith\((ROOT|root)\)/), `${file} still uses bare startsWith guard`).toBeNull();
      }
    });

    it('every static server delegates to resolveStatic', () => {
      const files = readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith('.js'));
      const servers = files.filter((f) => readFileSync(join(SCRIPTS_DIR, f), 'utf8').includes('createServer'));
      expect(servers.length).toBeGreaterThanOrEqual(23);
      for (const file of servers) {
        const src = readFileSync(join(SCRIPTS_DIR, file), 'utf8');
        expect(src, `${file} static server lacks the safe resolver`).toContain('resolveStatic');
      }
    });
  });
});
