/* Rebuild footers on all pages to match index.html (home) structure:
 *   - flags row moves from Contact column -> footer-brand (under motto)
 *   - social icons move from footer-brand -> new "Connect With Us" column
 *   - Contact column heading changes to "Got a Question?" (footer.question)
 *   - contact button wrapper normalized to home's markup
 * Requires uniform footer markup (footer.contactHeading + margin-top:14px flags).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = fs.readdirSync(root).filter((f) => /\.html$/.test(f));

const OLD_FLAGS = 'margin-top:14px;display:flex;flex-wrap:wrap;gap:5px';
const NEW_FLAGS = 'margin-top:22px;display:flex;flex-wrap:wrap;gap:5px';

let done = 0, skipped = 0;

for (const page of pages) {
  const fp = path.join(root, page);
  const raw = fs.readFileSync(fp, 'utf8');
  const crlf = raw.includes('\r\n');
  const html = raw.replace(/\r\n/g, '\n'); // normalize line endings for regex work

  // Only transform pages that still use the old structure
  if (!html.includes('footer.contactHeading')) { skipped++; continue; }

  const footerStart = html.indexOf('<footer class="site-footer"');
  const footerEnd = html.indexOf('</footer>', footerStart);
  if (footerStart === -1 || footerEnd === -1) { skipped++; continue; }

  let foot = html.slice(footerStart, footerEnd + '</footer>'.length);

  /* 1) Capture + remove the social block from footer-brand */
  const socialRe = /\n(\s*)<div class="footer-social">\n([\s\S]*?)\n\1<\/div>/;
  const socialM = foot.match(socialRe);
  if (!socialM) { skipped++; continue; }
  const socialInner = socialM[2];
  foot = foot.replace(socialRe, '\n');

  /* 2) Capture + remove flags block from the Contact column (replace with connect col) */
  const flagsRe = /\n\s*<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:5px">\n([\s\S]*?)\n\s*<\/div><\/div>\n(\s*)<\/div>\n\s*<div class="footer-bottom">/;
  const flagsM = foot.match(flagsRe);
  if (!flagsM) { skipped++; continue; }
  const flagsInner = flagsM[1];
  const gridIndent = flagsM[2];

  const connectCol =
    '\n      <div class="footer-col"><h5 data-i18n="footer.connect">Connect With Us</h5>\n' +
    '        <div class="footer-social">\n' + socialInner + '\n' +
    '        </div>\n      </div></div>\n' + gridIndent + '</div>\n    <div class="footer-bottom">';

  foot = foot.replace(flagsRe, connectCol);

  /* 3) Insert flags under motto in footer-brand (after motto <p>) */
  const mottoRe = /(<p class="footer-motto"[^>]*>[^<]*<\/p>)/;
  if (!mottoRe.test(foot)) { skipped++; continue; }
  foot = foot.replace(mottoRe, '$1\n        <div style="' + NEW_FLAGS + '">\n' + flagsInner + '\n        </div>');

  /* 4) Normalize contact button wrapper to home markup */
  foot = foot.replace(
    /<div style="margin-top:20px;display:flex;gap:10px">\n\s*<a href="contact.html" class="btn btn-outline btn-sm"[^>]*>[^<]*<\/a>\n\s*<\/div>/,
    '<div style="margin-top:22px"><a href="contact.html" class="btn btn-outline btn-sm" data-i18n="footer.contact">Contact Us</a></div>'
  );

  /* 5) Heading: Contact -> Got a Question? */
  foot = foot.replace(/<h5 data-i18n="footer.contactHeading">Contact<\/h5>/, '<h5 data-i18n="footer.question">Got a Question?</h5>');

  /* Validate: no leftovers (old heading, old flags style, social still in brand col) */
  const socialCount = (foot.match(/class="footer-social"/g) || []).length;
  if (foot.includes('footer.contactHeading') || foot.includes(OLD_FLAGS) || socialCount !== 1) {
    console.log('WARN leftover in ' + page + ' (contactHeading:' + foot.includes('footer.contactHeading') + ', oldFlags:' + foot.includes(OLD_FLAGS) + ', socialCount:' + socialCount + ')');
    skipped++; continue;
  }

  const out = html.slice(0, footerStart) + foot + html.slice(footerEnd + '</footer>'.length);
  fs.writeFileSync(fp, crlf ? out.replace(/\n/g, '\r\n') : out);
  done++;
}

console.log(`Transformed: ${done}, skipped: ${skipped}`);
