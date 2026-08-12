/**
 * SECURITY_ROADMAP Phase 22 — honest `typecheck` / `build` for a plain-ESM
 * backend: a full-tree syntax sweep using node:vm's parser.
 *
 *   node scripts/syntax-check.js [dir ...]     (default: src scripts tests)
 *
 * Parses every .js/.mjs file WITHOUT executing it: ESM-flavored files (any
 * import/export) go through acorn's ECMAScript module parser, the rest
 * through vm.Script. No child processes, no network, no DB — the Phase 13
 * spawn tripwire stays intact, and this genuinely proves the shipped tree
 * parses.
 *
 * Exit 0 = clean, 1 = any file fails to parse.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as acorn from 'acorn';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIRS = ['src', 'scripts', 'tests'];
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DIRS;
const base = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseAsModule(code) {
  // acorn parses ESM (import/export) without executing; ecmaVersion 'latest'
  // accepts top-level await and every stage-4 syntax Node 22+ supports.
  acorn.parse(code, { sourceType: 'module', ecmaVersion: 'latest' });
}

function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else if (/\.(js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let failures = 0;
for (const dir of dirs) {
  const root = path.join(base, dir);
  if (!fs.existsSync(root)) {
    console.log(`SKIP ${dir} (not present)`);
    continue;
  }
  for (const file of collect(root)) {
    try {
      const code = fs.readFileSync(file, 'utf8');
      if (/\b(import|export)\b/.test(code) || file.endsWith('.mjs')) {
        parseAsModule(code); // ESM — parse only, never executes
      } else {
        new vm.Script(code, { filename: file }); // CJS — parse only, never executes
      }
    } catch (err) {
      failures++;
      console.log(`  ✗ ${path.relative(base, file)}: ${err.message.split('\n')[0]}`);
    }
  }
}

if (failures) {
  console.log(`SYNTAX CHECK: FAIL (${failures} file(s))`);
  process.exit(1);
}
console.log(`SYNTAX CHECK: PASS (${dirs.join(', ')})`);
process.exit(0);
