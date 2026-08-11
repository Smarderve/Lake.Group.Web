/* Fix footer nesting introduced by _rebuild_footer_connect.js:
 * Connect With Us column was nested inside Got a Question column.
 * Correct: close Got a Question with </ul></div> first, then Connect as sibling.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = fs.readdirSync(root).filter((f) => /\.html$/.test(f));

let fixed = 0, skipped = 0;

for (const page of pages) {
  const fp = path.join(root, page);
  const raw = fs.readFileSync(fp, 'utf8');
  const crlf = raw.includes('\r\n');
  const html = raw.replace(/\r\n/g, '\n');

  if (!html.includes('footer.connect')) { skipped++; continue; }

  let out = html;

  /* 1) Close Got a Question col before Connect col opens */
  const openRe = /(<\/ul>)\n(\s*)<div class="footer-col"><h5 data-i18n="footer\.connect">/;
  out = out.replace(openRe, '$1</div>\n$2<div class="footer-col"><h5 data-i18n="footer.connect">');

  /* 2) Remove the extra closing </div> (Connect col close + question close were doubled) */
  const tailRe = /(\n\s*<\/div>\n\s*<\/div><\/div>\n\s*<\/div>\n\s*<div class="footer-bottom">)/;
  out = out.replace(tailRe, (m) => m.replace('</div></div>\n', '</div>\n'));

  if (out !== html) {
    fs.writeFileSync(fp, crlf ? out.replace(/\n/g, '\r\n') : out);
    fixed++;
  } else {
    skipped++;
  }
}

console.log(`Fixed: ${fixed}, skipped: ${skipped}`);
