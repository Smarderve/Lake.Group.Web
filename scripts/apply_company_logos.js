#!/usr/bin/env node
/**
 * Apply per-company branding on hosted company pages:
 * - data-company-logo / data-company-alt on <body> (for site.js nav + footer swap)
 * - footer .footer-logo img src/alt set to the company mark
 * - enlarge .co-logo-row mark
 * - ensure .co-logo-row img src matches the company asset map
 * Hero .co-hero-logo marks are intentionally NOT injected (nav swap only).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const PAGES = [
  { file: 'lake-oil.html', logo: 'lake-oil.png', alt: 'Lake Oil' },
  { file: 'lake-aviation.html', logo: 'lake-aviation.png', alt: 'Lake Aviation' },
  { file: 'lake-gas.html', logo: 'lake-gas.png', alt: 'Lake Gas' },
  { file: 'lake-lubes.html', logo: 'lake-lubes.png', alt: 'Lake Lubes' },
  { file: 'lake-buildings.html', logo: 'lake-buildings.png', alt: 'Lake Buildings' },
  { file: 'lake-plastics.html', logo: 'lake-plastics.png', alt: 'Lake Plastics' },
  { file: 'lake-steel.html', logo: 'lake-steel.png', alt: 'Lake Steel' },
  { file: 'lake-cylinders.html', logo: 'lake-cylinders.png', alt: 'Lake Cylinders' },
  { file: 'gulf-aggregates.html', logo: 'gulf-aggregates.png', alt: 'Gulf Aggregates' },
  { file: 'lake-premix-cement.html', logo: 'lake-premix-cement.png', alt: 'Lake Premix & Cement' },
  { file: 'aficd.html', logo: 'aficd.png', alt: 'AFICD' },
  { file: 'aill.html', logo: 'aill.png', alt: 'AILL' },
  { file: 'lake-trans.html', logo: 'lake-trans.png', alt: 'Lake Trans' },
  { file: 'cross-country.html', logo: 'cross-country.png', alt: 'Cross Country' },
  { file: 'ocean-galleria.html', logo: 'ocean-galleria.png', alt: 'Ocean Galleria' },
];

const LOGO_CSS_OLD =
  '.co-logo-row{display:flex;align-items:center;gap:var(--sp-5);margin-bottom:var(--sp-6);flex-wrap:wrap}\r\n' +
  '.co-logo-row img{height:52px;width:auto;max-width:180px;object-fit:contain;background:var(--ink);border:1px solid var(--ink-line-2);padding:8px;border-radius:2px}';

const LOGO_CSS_NEW =
  '.co-logo-row{display:flex;align-items:center;gap:var(--sp-5);margin-bottom:var(--sp-6);flex-wrap:wrap}\r\n' +
  '.co-logo-row img{height:110px;width:auto;max-width:320px;object-fit:contain;background:transparent;border:none;padding:0;border-radius:0}';

function ensureBodyAttrs(raw, logo, alt) {
  const logoPath = 'assets/images/logos/companies/' + logo;
  const attrs =
    ' data-company-logo="' + logoPath + '"' +
    ' data-company-alt="' + alt.replace(/"/g, '&quot;') + '"';

  // Strip any prior company branding attrs, then set fresh ones.
  let out = raw.replace(
    /<body([^>]*)>/i,
    (full, rest) => {
      let r = rest
        .replace(/\sdata-company-logo="[^"]*"/gi, '')
        .replace(/\sdata-company-alt="[^"]*"/gi, '');
      return '<body' + r + attrs + '>';
    }
  );
  return out;
}

function ensureCoLogoRow(raw, logo, alt) {
  const src = 'assets/images/logos/companies/' + logo;
  const altText = alt + ' logo';
  // Replace any img inside the first co-logo-row block
  return raw.replace(
    /(<div class="co-logo-row">\s*)<img[^>]*>/i,
    '$1<img src="' + src + '" alt="' + altText.replace(/"/g, '&quot;') + '">'
  );
}

function ensureFooterLogo(raw, logo, alt) {
  const src = 'assets/images/logos/companies/' + logo;
  const altText = alt.replace(/"/g, '&quot;');
  return raw.replace(
    /(<div class="footer-logo">\s*)<img[^>]*>/i,
    '$1<img src="' + src + '" alt="' + altText + '">'
  );
}

function stripHeroLogo(raw) {
  return raw
    .replace(/^\s*<img class="co-hero-logo"[^>]*>\r?\n?/gm, '')
    .replace(/^\.page-hero \.co-hero-logo\{[^}]*\}\r?\n?/gm, '');
}

function main() {
  let changed = 0;
  for (const page of PAGES) {
    const filePath = path.join(ROOT, page.file);
    if (!fs.existsSync(filePath)) {
      console.warn('missing', page.file);
      continue;
    }
    let raw = fs.readFileSync(filePath, 'utf8');
    const before = raw;

    // Normalize line endings for CSS replace: try both CRLF and LF variants
    if (raw.includes(LOGO_CSS_OLD)) {
      raw = raw.replace(LOGO_CSS_OLD, LOGO_CSS_NEW);
    } else {
      const lfOld = LOGO_CSS_OLD.replace(/\r\n/g, '\n');
      const lfNew = LOGO_CSS_NEW.replace(/\r\n/g, '\n');
      if (raw.includes(lfOld)) raw = raw.replace(lfOld, lfNew);
      else {
        // Partial: just bump the img rule if present
        raw = raw.replace(
          /\.co-logo-row img\{height:52px;width:auto;max-width:180px;object-fit:contain;background:var\(--ink\);border:1px solid var\(--ink-line-2\);padding:8px;border-radius:2px\}/,
          '.co-logo-row img{height:110px;width:auto;max-width:320px;object-fit:contain;background:transparent;border:none;padding:0;border-radius:0}'
        );
      }
    }

    raw = ensureBodyAttrs(raw, page.logo, page.alt);
    raw = ensureCoLogoRow(raw, page.logo, page.alt);
    raw = ensureFooterLogo(raw, page.logo, page.alt);
    raw = stripHeroLogo(raw);

    if (raw !== before) {
      fs.writeFileSync(filePath, raw, 'utf8');
      changed += 1;
      console.log('updated', page.file);
    } else {
      console.log('unchanged', page.file);
    }
  }
  console.log('done,', changed, 'files changed');
}

main();
