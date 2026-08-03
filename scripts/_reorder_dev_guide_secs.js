#!/usr/bin/env node
/**
 * Reorders new sections 41/42/43 in docs/_gen_developer_guide.py so a
 * future regeneration appends them at the very end (after section 40),
 * matching the order in docs/developer-guide.html.
 */
const fs = require('fs');
const path = require('path');
const p = path.resolve('docs/_gen_developer_guide.py');

let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// 1) Locate the spliced block: '<section id="sec-41"' .. end of sec-43 '</section>\n'
const start = s.indexOf('<section id="sec-41"');
if (start < 0) { console.log('sec-41 block not found — aborting.'); process.exit(1); }
// find the closing '</section>' of sec-43 (the block ends right before <section id="sec-38")
const anchor = s.indexOf('<section id="sec-38"', start);
if (anchor < 0) { console.log('sec-38 anchor not found — aborting.'); process.exit(1); }
const block = s.slice(start, anchor);
const blockWithNewline = block.endsWith('\n') ? block : block + '\n';
s = s.slice(0, start) + s.slice(anchor);
console.log('removed block length:', blockWithNewline.length);

// 2) Append the block at the end of main(), after build_script_encyclopedia()
const mainMarker = '    body_parts.extend(build_script_encyclopedia())';
if (!s.includes(mainMarker)) { console.log('main() marker not found — aborting.'); process.exit(1); }
// The block is HTML — wrap it as a Python string literal appended to body_parts.
const pythonLiteral = '    body_parts.append("""\n' + blockWithNewline + '""")\n';
s = s.replace(mainMarker, mainMarker + '\n' + pythonLiteral);

fs.writeFileSync(p, s, 'utf8');
console.log('reordered OK');
