#!/usr/bin/env node
/** Sanity-checks docs/_gen_developer_guide.py after edits (no Python available). */
const fs = require('fs');
const s = fs.readFileSync('docs/_gen_developer_guide.py', 'utf8');

const tq = (s.match(/"""/g) || []).length;
console.log('triple-quotes:', tq, tq % 2 === 0 ? 'BALANCED' : 'UNBALANCED!');

// crude bracket balance on code lines (lines that aren't inside triple-quoted HTML are hard to
// isolate, but triple-quoted blocks are the main risk after bulk edits)
for (const c of ['(', ')', '[', ']', '{', '}']) {
  const n = s.split(c).length - 1;
  console.log(`  '${c}': ${n}`);
}

console.log('def build_html:', /^\s*def build_html\(\):/.test(s));
console.log('def main:', /^\s*def main\(\):/.test(s));
console.log('ends with guard:', /if __name__ == ["']__main__["']:/.test(s));
console.log('sec-41/42/43 present:', s.includes('id="sec-41"'), s.includes('id="sec-42"'), s.includes('id="sec-43"'));
console.log('no hero-3d.bundle left:', !s.includes('hero-3d.bundle'));
console.log('no "Firebase Hosting" left:', !s.includes('Firebase Hosting'));
console.log('lines:', s.split('\n').length);
