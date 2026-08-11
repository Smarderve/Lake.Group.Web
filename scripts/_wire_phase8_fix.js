/**
 * Fix pass for csr.html + station-locator.html — tags the rows the
 * regex-based wirer missed (cards whose inner divs never close adjacently).
 * Uses a div-depth scanner so row boundaries are exact.
 */
import fs from 'node:fs';

/** Scan div blocks: returns [{ head, body, closeIndex }] for every open tag. */
function divBlocks(html, openRe) {
  const blocks = [];
  let m;
  while ((m = openRe.exec(html))) {
    const head = m[0];
    const bodyStart = m.index + head.length;
    const tagRe = /<\/?div\b[^>]*>/g;
    tagRe.lastIndex = bodyStart;
    let depth = 1;
    let t = null;
    let closeIndex = -1;
    while ((t = tagRe.exec(html))) {
      if (t[0][1] === '/') {
        depth--;
        if (depth === 0) { closeIndex = t.index; break; }
      } else {
        depth++;
      }
    }
    if (closeIndex === -1) break;
    blocks.push({ head, body: html.slice(bodyStart, closeIndex), closeIndex });
    openRe.lastIndex = closeIndex + '</div>'.length;
  }
  return blocks;
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function retag(file, openRe, bodyEdit) {
  let html = fs.readFileSync(file, 'utf8');
  const blocks = divBlocks(html, openRe);
  let n = 0;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.head.includes('data-entity-key')) continue;
    const title = (b.body.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/) || [])[1] || '';
    if (!title) continue;
    const newBlock = b.head.replace('>', ` data-entity-key="${escapeAttr(title.trim())}">`) + bodyEdit(b.body) + '</div>';
    // Rebuild from the end backwards: positions up to this block's close are
    // still valid in the current html (later blocks were already replaced).
    const start = html.lastIndexOf(b.head, blocks[i].closeIndex);
    html = html.slice(0, start) + newBlock + html.slice(b.closeIndex + '</div>'.length);
    n++;
  }
  if (n) { fs.writeFileSync(file, html); }
  return n;
}

let total = 0;
total += retag('csr.html', /<div class="card reveal csr-card">/g, (body) =>
  body
    .replace(/(<h3[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="title"$2`)
    .replace(/(<p[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="description"$2`)
);
total += retag('station-locator.html', /<div class="reveal st-row">/g, (body) =>
  body
    .replace(/(<h4[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="name"$2`)
    .replace(/(<p[^>]*class="st-addr"[^>]*)(>)/, `$1 data-entity-field="address"$2`)
);
console.log(`Fix pass complete: ${total} additional rows tagged.`);
