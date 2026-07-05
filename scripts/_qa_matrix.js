#!/usr/bin/env node
// QA: cross-page consistency matrix — required head tags/scripts per page,
// plus static accessibility checks (img alt, single h1, labels, canonical).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));

const checks = {
  manifest: h => /rel=["']manifest["']/.test(h),
  themeColor: h => /name=["']theme-color["']/.test(h),
  pwaJs: h => /assets\/pwa\.js/.test(h),
  themeCss: h => /assets\/theme\.css/.test(h),
  motionJs: h => /assets\/motion\.js/.test(h),
  i18nContent: h => /assets\/i18n-content\.js/.test(h),
  i18nJs: h => /assets\/i18n\.js/.test(h),
  i18nOrder: h => {
    const a = h.indexOf('assets/i18n-content.js');
    const b = h.indexOf('assets/i18n.js');
    return a !== -1 && b !== -1 ? a < b : false;
  },
  favicon: h => /rel=["']icon["']/.test(h),
  canonical: h => /rel=["']canonical["']/.test(h),
  title: h => /<title>[^<]+<\/title>/.test(h),
  metaDesc: h => /name=["']description["'] content=["'][^"']+["']/.test(h),
  viewport: h => /name=["']viewport["']/.test(h),
  langAttr: h => /<html[^>]+lang=/.test(h),
};

const a11y = [];
const rows = [];
const canonicals = {};
const descs = {};
for (const page of pages) {
  const h = fs.readFileSync(path.join(root, page), 'utf8');
  const fails = Object.keys(checks).filter(k => !checks[k](h));
  rows.push(`${page}: ${fails.length ? 'FAIL[' + fails.join(',') + ']' : 'ok'}`);

  // imgs without alt
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
  const noAlt = imgs.filter(t => !/\balt\s*=/.test(t));
  if (noAlt.length) a11y.push(`${page}: ${noAlt.length} <img> without alt: ${noAlt[0].slice(0, 90)}`);

  // h1 count
  const h1s = (h.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) a11y.push(`${page}: h1 count = ${h1s}`);

  // inputs without label/aria-label/aria-labelledby (rough static check)
  const inputs = [...h.matchAll(/<(input|textarea|select)\b[^>]*>/g)];
  for (const m of inputs) {
    const tag = m[0];
    if (/type=["'](hidden|submit|button)["']/.test(tag)) continue;
    const hasAria = /aria-label|aria-labelledby/.test(tag);
    const idm = tag.match(/id=["']([^"']+)["']/);
    const hasFor = idm && new RegExp(`for=["']${idm[1]}["']`).test(h);
    // heuristic: label immediately before the control in same form-group
    const idx = m.index;
    const before = h.slice(Math.max(0, idx - 220), idx);
    const wrapped = /<label[^>]*>(?:(?!<\/label>)[\s\S])*$/.test(before) || /<\/label>\s*<?[^<]*$/.test(before);
    if (!hasAria && !hasFor && !wrapped) a11y.push(`${page}: unlabeled control: ${tag.slice(0, 90)}`);
  }

  // buttons without accessible name
  const buttons = [...h.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)];
  for (const m of buttons) {
    const attrs = m[0].slice(0, m[0].indexOf('>'));
    const inner = m[1].replace(/<[^>]+>/g, '').trim();
    const hasName = inner.length > 0 || /aria-label/.test(attrs) || /title=/.test(attrs) ||
      /data-i18n/.test(m[0]) || /<img[^>]+alt=["'][^"']+/.test(m[1]) || /<span[^>]*aria-hidden/.test(m[1]) === false && /material-symbols|icon/.test(m[1]);
    if (!hasName) a11y.push(`${page}: button w/o accessible name: ${m[0].slice(0, 100).replace(/\n/g, ' ')}`);
  }

  const canon = (h.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/) || h.match(/href=["']([^"']+)["'][^>]*rel=["']canonical["']/) || [])[1];
  if (canon) (canonicals[canon] = canonicals[canon] || []).push(page);
  const d = (h.match(/name=["']description["'] content=["']([^"']+)["']/) || [])[1];
  if (d) (descs[d] = descs[d] || []).push(page);
}

console.log('== Head/script matrix ==');
rows.forEach(r => console.log(' ' + r));
console.log('\n== Duplicate canonicals ==');
Object.entries(canonicals).filter(([, v]) => v.length > 1).forEach(([k, v]) => console.log(` ${k}: ${v.join(', ')}`));
console.log('== Duplicate meta descriptions ==');
Object.entries(descs).filter(([, v]) => v.length > 1).forEach(([k, v]) => console.log(` "${k.slice(0, 60)}...": ${v.join(', ')}`));
console.log('\n== A11y findings (' + a11y.length + ') ==');
a11y.forEach(x => console.log(' ' + x));
