#!/usr/bin/env node
/**
 * One-shot site update:
 * - Replace company-page Contact Details blocks with slim CTAs to contact.html
 * - Point company hero contact buttons at contact.html#slug
 * - Rename "Our Companies" page copy on services.html
 * - Sync i18n keys for Subsidiaries / Contact Us
 * - Regenerate assets/i18n-content.js from JSON
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const COMPANY_PAGES = [
  { file: 'lake-oil.html', slug: 'lake-oil', name: 'Lake Oil' },
  { file: 'lake-aviation.html', slug: 'lake-aviation', name: 'Lake Aviation' },
  { file: 'lake-gas.html', slug: 'lake-gas', name: 'Lake Gas' },
  { file: 'lake-lubes.html', slug: 'lake-lubes', name: 'Lake Lubes' },
  { file: 'lake-buildings.html', slug: 'lake-buildings', name: 'Lake Buildings' },
  { file: 'lake-plastics.html', slug: 'lake-plastics', name: 'Lake Plastics' },
  { file: 'lake-steel.html', slug: 'lake-steel', name: 'Lake Steel' },
  { file: 'lake-cylinders.html', slug: 'lake-cylinders', name: 'Lake Cylinders' },
  { file: 'gulf-aggregates.html', slug: 'gulf-aggregates', name: 'Gulf Aggregates' },
  { file: 'lake-premix-cement.html', slug: 'lake-premix-cement', name: 'Lake Premix & Cement' },
  { file: 'aficd.html', slug: 'aficd', name: 'AFICD' },
  { file: 'aill.html', slug: 'aill', name: 'AILL' },
  { file: 'lake-trans.html', slug: 'lake-trans', name: 'Lake Trans' },
  { file: 'cross-country.html', slug: 'cross-country', name: 'Cross Country' },
  { file: 'ocean-galleria.html', slug: 'ocean-galleria', name: 'Ocean Galleria' },
];

function contactCtaBlock(slug, name) {
  return [
    '<!-- 6. CONTACT -->',
    '<section class="fs-section fs-on-dark">',
    '  <div class="container">',
    '    <div class="fs-marker"><span class="fs-marker-no">06</span><span class="fs-eyebrow">Contact</span></div>',
    '    <h2 class="fs-display" style="margin-bottom:var(--sp-4)">Contact ' + name + '</h2>',
    '    <p class="fs-lede" style="max-width:58ch;margin-bottom:var(--sp-6)">Division phone, email and address details for ' + name + ' and every Lake Group subsidiary are listed on the Contact Us page.</p>',
    '    <a href="contact.html#' + slug + '" class="btn btn-primary btn-lg">Contact Us</a>',
    '  </div>',
    '</section>',
    '',
  ].join('\r\n');
}

function replaceContactSection(raw, slug, name) {
  const re = /<!-- 6\. CONTACT DETAILS -->[\s\S]*?(?=<!-- 7\. IMAGES -->)/;
  if (!re.test(raw)) return [raw, false];
  return [raw.replace(re, contactCtaBlock(slug, name)), true];
}

function retargetHeroContact(raw, slug) {
  let changed = false;
  const out = raw.replace(
    /(<a href="contact\.html")([^>]*class="btn btn-outline-dark"[^>]*>)(Contact[^<]*|Get in Touch)/g,
    (full, a, mid, label) => {
      changed = true;
      return '<a href="contact.html#' + slug + '"' + mid + label;
    }
  );
  return [out, changed];
}

function updateServicesPage() {
  const filePath = path.join(ROOT, 'services.html');
  let raw = fs.readFileSync(filePath, 'utf8');
  const before = raw;
  raw = raw.replace(/Our Companies \| Lake Group/g, 'Subsidiaries | Lake Group');
  raw = raw.replace(/<span>Our Companies<\/span>/g, '<span>Subsidiaries</span>');
  raw = raw.replace(/<h1>Our Companies<\/h1>/g, '<h1>Subsidiaries</h1>');
  raw = raw.replace(
    /or use the "Our Companies" menu at the top of any page\./g,
    'or use the "Subsidiaries" menu at the top of any page.'
  );
  if (raw !== before) {
    fs.writeFileSync(filePath, raw, 'utf8');
    console.log('updated services.html copy');
  }
}

function updateI18n() {
  const jsonPath = path.join(ROOT, 'assets', 'i18n-content.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  Object.assign(data.en, {
    'nav.companies': 'Subsidiaries ▾',
    'mob.companies': 'Subsidiaries',
    'nav.contact': 'Contact Us',
    'footer.services': 'Subsidiaries',
    'footer.viewAllCompanies': 'View All Subsidiaries',
    'footer.contact': 'Contact Us',
  });

  Object.assign(data.fr, {
    'nav.companies': 'Filiales ▾',
    'mob.companies': 'Filiales',
    'nav.contact': 'Contactez-nous',
    'footer.services': 'Filiales',
    'footer.viewAllCompanies': 'Voir toutes les filiales',
    'footer.contact': 'Contactez-nous',
  });

  Object.assign(data.sw, {
    'nav.companies': 'Kampuni Tawi ▾',
    'mob.companies': 'Kampuni Tawi',
    'nav.contact': 'Wasiliana Nasi',
    'footer.services': 'Kampuni Tawi',
    'footer.viewAllCompanies': 'Tazama Kampuni Tawi Zote',
    'footer.contact': 'Wasiliana Nasi',
  });

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  const jsPath = path.join(ROOT, 'assets', 'i18n-content.js');
  fs.writeFileSync(jsPath, 'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(data) + ';\n', 'utf8');
  console.log('updated i18n-content.json + i18n-content.js');
}

function updateThemeComments() {
  const p = path.join(ROOT, 'assets', 'theme.css');
  let raw = fs.readFileSync(p, 'utf8');
  const before = raw;
  raw = raw.replace(/"Our Companies"/g, '"Subsidiaries"');
  if (raw !== before) {
    fs.writeFileSync(p, raw, 'utf8');
    console.log('updated theme.css comments');
  }
}

function updateAssistantKb() {
  const p = path.join(ROOT, 'scripts', 'build_assistant_kb.js');
  if (!fs.existsSync(p)) return;
  let raw = fs.readFileSync(p, 'utf8');
  const before = raw;
  raw = raw.replace(/title: 'Our Companies'/g, "title: 'Subsidiaries'");
  if (raw !== before) {
    fs.writeFileSync(p, raw, 'utf8');
    console.log('updated build_assistant_kb.js');
  }
}

function updateSiteJsComments() {
  const p = path.join(ROOT, 'assets', 'site.js');
  let raw = fs.readFileSync(p, 'utf8');
  const before = raw;
  raw = raw.replace(/"Our Companies"/g, '"Subsidiaries"');
  if (raw !== before) {
    fs.writeFileSync(p, raw, 'utf8');
    console.log('updated site.js comments');
  }
}

function main() {
  for (const page of COMPANY_PAGES) {
    const filePath = path.join(ROOT, page.file);
    if (!fs.existsSync(filePath)) {
      console.warn('missing', page.file);
      continue;
    }
    let raw = fs.readFileSync(filePath, 'utf8');
    let any = false;
    let c;
    [raw, c] = replaceContactSection(raw, page.slug, page.name);
    any = any || c;
    [raw, c] = retargetHeroContact(raw, page.slug);
    any = any || c;
    if (any) {
      fs.writeFileSync(filePath, raw, 'utf8');
      console.log('company page', page.file);
    } else {
      console.log('unchanged', page.file);
    }
  }

  updateServicesPage();
  updateI18n();
  updateThemeComments();
  updateAssistantKb();
  updateSiteJsComments();
  console.log('done');
}

main();
