#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PAGES = ['news.html', 'careers.html', 'csr.html', 'sustainability.html', 'africa-network.html', 'investors.html'];
const STYLESHEET = '<link rel="stylesheet" href="assets/phase-01-under-construction.css">';
const CRITICAL_OVERLAY = '[data-lg-skeleton-overlay]{position:fixed!important;inset:0;width:100vw;height:100vh;background:#013f5c;opacity:1}';
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'scripts', 'templates', 'under-construction.html'), 'utf8').trim();

for (const filename of PAGES) {
  const file = path.join(ROOT, filename);
  const original = fs.readFileSync(file, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const canonical = TEMPLATE.replace(/\n/g, eol);
  const footer = /<footer\b[^>]*>/i.exec(original);
  if (!footer) throw new Error(filename + ': missing footer');
  let next = original.replace(/<body\b[^>]*>/i, (body) => {
    const clean = body.replace(/\sdata-phase-01-under-construction=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return clean.slice(0, -1) + ' data-phase-01-under-construction="true">';
  });
  const existing = /<main class="phase-01-under-construction"[\s\S]*?<\/main>\s*/i.exec(next);
  if (existing) next = next.slice(0, existing.index) + next.slice(existing.index + existing[0].length);
  const footerAt = /<footer\b[^>]*>/i.exec(next);
  next = next.slice(0, footerAt.index) + canonical + eol + next.slice(footerAt.index);
  const head = /<head\b[^>]*>[\s\S]*?<\/head>/i.exec(next);
  if (!head) throw new Error(filename + ': missing head');
  const cleanHead = head[0]
    .replace(/[ \t]*<link\b(?=[^>]*href="assets\/phase-01-under-construction\.css")[^>]*>\r?\n?/gi, '')
    .replace(/html\.lg-skel-done::before\{display:none\}/i, (match) => match + CRITICAL_OVERLAY)
    .replace(/<\/head>/i, '  ' + STYLESHEET + eol + '</head>');
  next = next.slice(0, head.index) + cleanHead + next.slice(head.index + head[0].length);
  if (next !== original) fs.writeFileSync(file, next, 'utf8');
}
