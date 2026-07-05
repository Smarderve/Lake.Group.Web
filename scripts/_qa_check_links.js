#!/usr/bin/env node
// QA: verify every internal href/src across all root HTML pages resolves to a real file.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
const problems = [];
const attrRe = /(?:href|src|srcset|poster|data-src)\s*=\s*["']([^"']+)["']/g;

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    let url = m[1].trim();
    if (!url || url.startsWith('#') || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(url)) continue;
    // srcset may contain multiple
    const candidates = url.includes(',') && m[0].startsWith('srcset')
      ? url.split(',').map(s => s.trim().split(/\s+/)[0])
      : [url.split('#')[0].split('?')[0]];
    for (const c of candidates) {
      if (!c) continue;
      const target = c.startsWith('/') ? path.join(root, c) : path.join(root, c);
      if (!fs.existsSync(target)) problems.push(`${page}: ${c}`);
    }
  }
}

// sitemap URLs vs actual files
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]);
for (const loc of locs) {
  const p = loc.replace(/^https?:\/\/[^/]+\//, '');
  const f = p === '' ? 'index.html' : p;
  if (!fs.existsSync(path.join(root, f))) problems.push(`sitemap.xml: ${loc}`);
}

// deleted pages
const deleted = ['quote-request.html', 'tracking.html'];
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  for (const d of deleted) {
    if (html.includes(d)) problems.push(`DELETED-REF ${page}: references ${d}`);
  }
}
// also check js/json assets for deleted refs
for (const dir of ['assets']) {
  for (const f of fs.readdirSync(path.join(root, dir))) {
    const fp = path.join(root, dir, f);
    if (!fs.statSync(fp).isFile()) continue;
    if (!/\.(js|json|css)$/.test(f)) continue;
    const txt = fs.readFileSync(fp, 'utf8');
    for (const d of deleted) {
      if (txt.includes(d)) problems.push(`DELETED-REF ${dir}/${f}: references ${d}`);
    }
  }
}

if (problems.length) {
  console.log('PROBLEMS (' + problems.length + '):');
  problems.forEach(p => console.log('  ' + p));
  process.exit(1);
} else {
  console.log('OK: all internal references resolve across ' + pages.length + ' pages; sitemap OK; no deleted-page refs.');
}
