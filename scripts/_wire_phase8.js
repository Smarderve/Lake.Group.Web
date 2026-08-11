/**
 * One-off Phase 8 wiring helper (Tasks 8.2–8.9).
 *
 * Tags each page's rows with the registry loader's attribute contract and
 * appends assets/registry-api.js. Idempotent (skips rows already tagged).
 * Run from the repo root:  node scripts/_wire_phase8.js
 */
import fs from 'node:fs';

const PAGES = [
  'services.html',
  'leadership.html',
  'projects.html',
  'history.html',
  'contact.html',
  'gallery.html',
  'csr.html',
  'careers.html',
  'station-locator.html',
];

const LOADER_TAG = '<script src="assets/registry-api.js?v=1" defer></script>';
const SITE_JS = '<script src="assets/site.js?v=60" defer></script>';

let totalRows = 0;

function edit(file, fn) {
  const p = file;
  if (!fs.existsSync(p)) {
    console.log(`!! missing ${p}`);
    return;
  }
  let html = fs.readFileSync(p, 'utf8');
  const before = html;
  html = fn(html, file);
  if (html !== before) fs.writeFileSync(p, html);
}

function addLoader(html) {
  if (html.includes('registry-api.js')) return html;
  if (!html.includes(SITE_JS)) {
    console.log('!! no site.js anchor in page');
    return html;
  }
  return html.replace(SITE_JS, SITE_JS + '\n' + LOADER_TAG);
}

/* ---------------- services.html — companies ---------------- */
function wireServices(html) {
  if (!html.includes('data-hydrate="companies"')) {
    html = html.replace('<div class="div-index">', '<div class="div-index" data-hydrate="companies" data-hydrate-match="slug">');
  }
  const rowRe = /<a href="([a-z0-9-]+)\.html" class="div-row"([\s\S]*?)<\/a>/g;
  html = html.replace(rowRe, (m, slug, inner) => {
    if (inner.includes('data-entity-key')) return m;
    totalRows++;
    let body = inner;
    // glyph logo
    body = body.replace(
      /(<span class="div-glyph"[^>]*><img)([^>]*alt=""[^>]*>)/,
      `$1 data-entity-field="logo" data-entity-attr="src"$2`
    );
    // h3 text span (the span that is not .div-glyph)
    body = body.replace(/(<h3>[\s\S]*?<span[^>]*><img[^>]*><\/span>\s*<span)(>)/, `$1 data-entity-field="name"$2`);
    // description paragraph
    body = body.replace(/(<p data-i18n="services\.desc\.[^"]+")(>)/, `$1 data-entity-field="description"$2`);
    return `<a href="${slug}.html" class="div-row" data-entity-key="${slug}"${body}</a>`;
  });
  return html;
}

/* ---------------- leadership.html — leadership ---------------- */
function wireLeadership(html) {
  const tags = [
    ['<div class="ld-featured">', '<div class="ld-featured" data-hydrate="leadership" data-hydrate-match="name">'],
    ['<div class="ld-card-grid">', '<div class="ld-card-grid" data-hydrate="leadership" data-hydrate-match="name">'],
  ];
  for (const [from, to] of tags) {
    if (!html.includes(to)) html = html.replace(from, to);
  }
  const cardRe = /<a class="ld-person-card[^"]*"([^>]*href="leadership-([a-z0-9-]+)\.html"[^>]*)>([\s\S]*?)<\/a>/g;
  html = html.replace(cardRe, (m, attrs, slug, inner) => {
    if (attrs.includes('data-entity-key')) return m;
    totalRows++;
    let body = inner;
    body = body.replace(/(<img)([^>]*class="[^"]*"[^>]*>)/, `$1 data-entity-field="photo" data-entity-attr="src"$2`);
    body = body.replace(/(<h3><span)(>)/, `$1 data-entity-field="name"$2`);
    body = body.replace(/(<p class="ld-person-role"><span)(>)/, `$1 data-entity-field="position"$2`);
    body = body.replace(/(<p class="ld-person-sum"><span)(>)/, `$1 data-entity-field="bio"$2`);
    return `<a class="ld-person-card" data-entity-key="${slug}"${attrs}>${body}</a>`;
  });
  return html;
}

/* ---------------- projects.html — projects (match by title) ---------------- */
function wireProjects(html) {
  if (!html.includes('data-hydrate="projects"')) {
    html = html.replace('<div class="prj-grid">', '<div class="prj-grid" data-hydrate="projects" data-hydrate-match="title">');
  }
  const cardRe = /<div class="card reveal prj-card">([\s\S]*?)<\/div>\s*<\/div>/g;
  html = html.replace(cardRe, (m, inner) => {
    if (inner.includes('data-entity-key')) return m;
    const title = (inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || '';
    if (!title) return m;
    totalRows++;
    let body = inner;
    body = body.replace(/(<h3[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="title"$2`);
    body = body.replace(/(<p[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="description"$2`);
    return `<div class="card reveal prj-card" data-entity-key="${escapeAttr(title.trim())}">${body}</div>\n    </div>`;
  });
  return html;
}

/* ---------------- history.html — history-events (match by title) ---------------- */
function wireHistory(html) {
  if (!html.includes('data-hydrate="history-events"')) {
    html = html.replace('<div class="timeline">', '<div class="timeline" data-hydrate="history-events" data-hydrate-match="title">');
  }
  const itemRe = /<div class="timeline-item reveal">([\s\S]*?)<\/div>\s*<\/div>/g;
  html = html.replace(itemRe, (m, inner) => {
    if (inner.includes('data-entity-key')) return m;
    const title = (inner.match(/<h4[^>]*>([\s\S]*?)<\/h4>/) || [])[1] || '';
    if (!title) return m;
    totalRows++;
    let body = inner;
    body = body.replace(/(<h4[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="title"$2`);
    body = body.replace(/(<p[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="description"$2`);
    return `<div class="timeline-item reveal" data-entity-key="${escapeAttr(title.trim())}">${body}</div>\n      </div>`;
  });
  return html;
}

/* ---------------- contact.html — companies (names + logos) ---------------- */
function wireContact(html) {
  if (!html.includes('data-hydrate="companies"')) {
    html = html.replace('<div class="ct-dir">', '<div class="ct-dir" data-hydrate="companies" data-hydrate-match="slug">');
  }
  const itemRe = /<article class="ct-dir-item" id="([a-z0-9-]+)">([\s\S]*?)<\/article>/g;
  html = html.replace(itemRe, (m, id, inner) => {
    if (inner.includes('data-entity-key')) return m;
    totalRows++;
    let body = inner;
    body = body.replace(/(<img)([^>]*alt="[^"]*"[^>]*>)/, `$1 data-entity-field="logo" data-entity-attr="src"$2`);
    body = body.replace(/(<h3)(>)/, `$1 data-entity-field="name"$2`);
    return `<article class="ct-dir-item" id="${id}" data-entity-key="${id}">${body}</article>`;
  });
  return html;
}

/* ---------------- gallery.html — media (match by url) ---------------- */
function wireGallery(html) {
  if (!html.includes('data-hydrate="media"')) {
    html = html.replace('<div class="gallery-grid" id="gallery-grid">', '<div class="gallery-grid" id="gallery-grid" data-hydrate="media" data-hydrate-match="url">');
  }
  const tileRe = /<article class="gallery-tile"([\s\S]*?)<\/article>/g;
  html = html.replace(tileRe, (m, attrs) => {
    if (attrs.includes('data-entity-key')) return m;
    const src = (attrs.match(/data-src="([^"]+)"/) || [])[1];
    if (!src) return m;
    totalRows++;
    let body = attrs;
    body = body.replace(/^(\s*)/, '$1data-entity-key="' + escapeAttr(src) + '" ');
    body = body.replace(/data-src="[^"]*"/, `$& data-entity-field="url" data-entity-attr="data-src"`);
    body = body.replace(/data-caption="[^"]*"/, `$& data-entity-field="caption" data-entity-attr="data-caption"`);
    body = body.replace(/(<img class="gallery-tile__img")([^>]*>)/, `$1 data-entity-field="url" data-entity-attr="src"$2`);
    body = body.replace(/(<span class="gallery-tile__tag">)([^<]*)(<\/span>)/, `$1<span data-entity-field="tags">$2</span>$3`);
    body = body.replace(/(<span class="gallery-tile__text">)([^<]*)(<\/span>)/, `$1<span data-entity-field="caption">$2</span>$3`);
    return `<article class="gallery-tile"${body}</article>`;
  });
  return html;
}

/* ---------------- csr.html — csr-entries (match by title) ---------------- */
function wireCsr(html) {
  if (!html.includes('data-hydrate="csr-entries"')) {
    html = html.replace(/(<div class="grid-3">)/, '<div class="grid-3" data-hydrate="csr-entries" data-hydrate-match="title">');
  }
  const cardRe = /<div class="card reveal csr-card">([\s\S]*?)<\/div>\s*<\/div>/g;
  html = html.replace(cardRe, (m, inner) => {
    if (inner.includes('data-entity-key')) return m;
    const title = (inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || '';
    if (!title) return m;
    totalRows++;
    let body = inner;
    body = body.replace(/(<h3[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="title"$2`);
    body = body.replace(/(<p[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="description"$2`);
    return `<div class="card reveal csr-card" data-entity-key="${escapeAttr(title.trim())}">${body}</div>\n      </div>`;
  });
  return html;
}

/* ---------------- careers.html — career-listings (match by jobTitle) ---------------- */
function wireCareers(html) {
  if (!html.includes('data-hydrate="career-listings"')) {
    html = html.replace('<div class="cr-roles">', '<div class="cr-roles" data-hydrate="career-listings" data-hydrate-match="jobTitle">');
  }
  const roleRe = /<div class="cr-role">([\s\S]*?)<\/div>/g;
  html = html.replace(roleRe, (m, inner) => {
    if (inner.includes('data-entity-key')) return m;
    const title = (inner.match(/<p data-i18n="careers\.\d+" class="cr-role-title">([\s\S]*?)<\/p>/) || [])[1] || '';
    if (!title) return m;
    totalRows++;
    let body = inner;
    body = body.replace(/(<p[^>]*class="cr-role-title"[^>]*)(>)/, `$1 data-entity-field="jobTitle"$2`);
    body = body.replace(/(<p[^>]*class="cr-role-loc"[^>]*)(>)/, `$1 data-entity-field="description"$2`);
    return `<div class="cr-role" data-entity-key="${escapeAttr(title.trim())}">${body}</div>`;
  });
  return html;
}

/* ---------------- station-locator.html — facilities (match by name) ---------------- */
function wireStations(html) {
  if (!html.includes('data-hydrate="facilities"')) {
    html = html.replace('<div id="station-list">', '<div id="station-list" data-hydrate="facilities" data-hydrate-match="name">');
  }
  const rowRe = /<div class="reveal st-row">([\s\S]*?)<\/div>\s*<\/div>/g;
  html = html.replace(rowRe, (m, inner) => {
    if (inner.includes('data-entity-key')) return m;
    const title = (inner.match(/<h4[^>]*>([\s\S]*?)<\/h4>/) || [])[1] || '';
    if (!title) return m;
    totalRows++;
    let body = inner;
    body = body.replace(/(<h4[^>]*data-i18n="[^"]*")(>)/, `$1 data-entity-field="name"$2`);
    body = body.replace(/(<p[^>]*class="st-addr"[^>]*)(>)/, `$1 data-entity-field="address"$2`);
    return `<div class="reveal st-row" data-entity-key="${escapeAttr(title.trim())}">${body}</div>\n          </div>`;
  });
  return html;
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const WIRERS = {
  'services.html': wireServices,
  'leadership.html': wireLeadership,
  'projects.html': wireProjects,
  'history.html': wireHistory,
  'contact.html': wireContact,
  'gallery.html': wireGallery,
  'csr.html': wireCsr,
  'careers.html': wireCareers,
  'station-locator.html': wireStations,
};

for (const page of PAGES) {
  edit(page, (html) => {
    html = WIRERS[page](html);
    return addLoader(html);
  });
}

console.log(`Wired ${totalRows} rows across ${PAGES.length} pages (registry-api.js appended where missing).`);
