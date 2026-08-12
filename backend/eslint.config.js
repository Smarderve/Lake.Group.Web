/**
 * SECURITY_ROADMAP Phase 22 — Security Scanning: static analysis.
 * ESLint 9 flat config: eslint:recommended + eslint-plugin-security
 * (free, eslint-community). Every finding is reviewed (see
 * docs/security/phase-22-report.md); rules that fire on reviewed-safe code
 * carry an inline justification where they are disabled, never a blanket
 * off switch.
 */
import js from '@eslint/js';
import globals from 'globals';
import security from 'eslint-plugin-security';

export default [
  {
    ignores: [
      'node_modules/**',
      'generated/**',
      'prisma/generated/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // Triage notes (reviewed; see phase-22-report.md):
      // - detect-non-literal-fs-filename: resolveStatic and content-health
      //   build paths from constants + user input ALREADY constrained by the
      //   Phase 14 containment checks, and the Phase 14 tripwire asserts the
      //   pattern; disabling per-file where the containment is adjacent.
      // - detect-child-process: backup/restore/audit-gate spawn WITHOUT a
      //   shell (Phase 13 reviewed allowlist). Configured off only for those
      //   files via comments, not globally.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
