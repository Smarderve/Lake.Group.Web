import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Flat config wrapper that reuses the battle-tested Next.js + TypeScript
// rule sets (eslint-config-next) that `create-next-app` ships with.
const compat = new FlatCompat({
  baseDirectory: __dirname,
})

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      '.payload/**',
      'next-env.d.ts',
      'src/payload-types.ts',
      'src/migrations/**',
      // Payload-generated files — not hand-written code.
      'src/app/(payload)/admin/importMap.js',
      'src/app/(payload)/api/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Seed/extraction scripts deliberately use `any` to bridge Payload's
    // per-collection generic API. Keep the rule on everywhere else.
    files: ['scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]

export default eslintConfig
