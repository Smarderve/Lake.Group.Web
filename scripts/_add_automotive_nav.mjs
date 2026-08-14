#!/usr/bin/env node
/**
 * One-off migration: adds the Automotive sector tab + pane to the desktop
 * megamenu and the mobile accordion of every root *.html page that has the
 * Agro markers. Mirrors scripts/templates/nav.html + mobile_nav.html so the
 * templates and live pages stay in sync without a full normalize pass.
 *
 * Run from repo root: node scripts/_add_automotive_nav.mjs
 */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..');

const TAB =
  '              <button type="button" class="mm-cat" role="tab" id="mm-tab-automotive" data-mm-cat="automotive" aria-controls="mm-pane-automotive" aria-selected="false" tabindex="-1" data-i18n="nav.dd.automotive">Automotive Sector</button>\n';

const PANE =
  '              <div class="mm-pane" role="tabpanel" id="mm-pane-automotive" data-mm-pane="automotive" aria-labelledby="mm-tab-automotive" hidden>\n' +
  '                <div class="mm-companies">\n' +
  '                  <a href="assembly-tech.html" class="mm-company" role="menuitem"><img src="assets/images/logos/companies/lake-group-placeholder.png" alt="Assembly Tech Limited" loading="lazy" width="56" height="32"><span data-i18n="nav.co.assemblyTech">Assembly Tech Limited</span></a>\n' +
  '                  <a href="agrinova-tech.html" class="mm-company" role="menuitem"><img src="assets/images/logos/companies/lake-group-placeholder.png" alt="AgriNova Tech Limited" loading="lazy" width="56" height="32"><span data-i18n="nav.co.agrinovaTech">AgriNova Tech Limited</span></a>\n' +
  '                  <a href="nextdrive-motors.html" class="mm-company" role="menuitem"><img src="assets/images/logos/companies/lake-group-placeholder.png" alt="NextDrive Motors Limited" loading="lazy" width="56" height="32"><span data-i18n="nav.co.nextDriveMotors">NextDrive Motors Limited</span></a>\n' +
  '          </div>\n' +
  '          </div>\n';

const MOB =
  '    <button type="button" class="mob-acc-btn" aria-expanded="false" aria-controls="mob-acc-automotive" data-i18n="nav.dd.automotive">Automotive Sector</button>\n' +
  '    <div class="mob-acc-panel" id="mob-acc-automotive" hidden>\n' +
  '      <a href="assembly-tech.html" data-i18n="nav.co.assemblyTech">Assembly Tech Limited</a>\n' +
  '      <a href="agrinova-tech.html" data-i18n="nav.co.agrinovaTech">AgriNova Tech Limited</a>\n' +
  '      <a href="nextdrive-motors.html" data-i18n="nav.co.nextDriveMotors">NextDrive Motors Limited</a>\n' +
  '    </div>\n';

let changed = 0;
const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();

for (const fn of files) {
  const filePath = path.join(ROOT, fn);
  let raw = fs.readFileSync(filePath, 'utf8');
  const orig = raw;
  let c = false;

  if (!raw.includes('mm-tab-agro')) continue;

  // Desktop: insert Automotive tab after the Agro tab button (before mm-cats close).
  const tabRe = /(id="mm-tab-agro"[^>]*>[\s\S]*?<\/button>)(\s*<\/div>)/;
  if (!raw.includes('mm-tab-automotive') && tabRe.test(raw)) {
    raw = raw.replace(tabRe, '$1\n' + TAB + '            $2');
    c = true;
  }

  // Desktop: insert Automotive pane right after the Agro pane closes.
  if (!raw.includes('id="mm-pane-automotive"')) {
    const paneRe = /(<div class="mm-pane"[^>]*id="mm-pane-agro"[^>]*>[\s\S]*?<a href="lake-agro\.html"[\s\S]*?<\/a>\s*<\/div>\s*<\/div>)/;
    if (paneRe.test(raw)) {
      raw = raw.replace(paneRe, '$1\n' + PANE);
      c = true;
    }
  }

  // Mobile: insert Automotive accordion right after the Agro panel closes.
  if (!raw.includes('mob-acc-automotive')) {
    const mobRe = /(<button type="button" class="mob-acc-btn"[^>]*aria-controls="mob-acc-agro"[^>]*>[\s\S]*?<\/button>\s*<div class="mob-acc-panel" id="mob-acc-agro"[^>]*>[\s\S]*?<a href="lake-agro\.html"[\s\S]*?<\/a>\s*<\/div>)/;
    if (mobRe.test(raw)) {
      raw = raw.replace(mobRe, '$1\n' + MOB);
      c = true;
    }
  }

  if (c) {
    fs.writeFileSync(filePath, raw, 'utf8');
    changed += 1;
    console.log('updated ' + fn);
  }
}
console.log('\nDone. ' + changed + ' files updated.');
