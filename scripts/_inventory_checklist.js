#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

const checks = {};
checks.atl = exists('atl.html');
checks.agro = exists('lake-agro.html');
checks.atlPng = exists('assets/images/logos/companies/atl.png');
checks.agroPng = exists('assets/images/logos/companies/lake-agro.png');
if (checks.atl) checks.atlBytes = fs.statSync(path.join(ROOT, 'atl.html')).size;
if (checks.agro) checks.agroBytes = fs.statSync(path.join(ROOT, 'lake-agro.html')).size;

const mount = read('assets/components/logo-loop-mount.js');
checks.fade = (mount.match(/fadeOutColor:\s*'([^']+)'/) || [])[1];
checks.speed = (mount.match(/speed:\s*(\d+)/) || [])[1];
checks.gap = (mount.match(/gap:\s*(\d+)/) || [])[1];
checks.logoHeight = (mount.match(/logoHeight:\s*(\d+)/) || [])[1];
checks.mountAtl = /atl\.png/.test(mount);
checks.mountAgro = /lake-agro\.png/.test(mount);
checks.onError = /hideFailedLogoItem|setProperty\('display',\s*'none'\)/.test(mount);

const css = read('assets/components/LogoLoop.css');
checks.listReset = /\.logoloop__list[\s\S]*?list-style:\s*none/.test(css);

const idx = read('index.html');
const mq = (idx.match(/\.marquee-wrap \{[\s\S]{0,280}/) || [''])[0];
checks.marqueeBlue = /color-brand-blue|--blue\b/.test(mq);
checks.yellowBorder = /border-top:\s*2px solid var\(--color-yellow/.test(mq);
checks.heroLoop = /id="hero-logo-loop"/.test(idx);
checks.oldMarquee = /class="marquee-track"|marquee-content/.test(idx);
checks.aboutBadge = /about\.badge/.test(idx);
checks.siteJsVer = (idx.match(/site\.js\?v=(\d+)/) || [])[1];

const tokens = read('assets/tokens.css');
checks.footerH = /footer-logo-height/.test(tokens);
checks.agroGreen = /color-agro-green/.test(tokens);
checks.navLogoH = (tokens.match(/--nav-logo-height:\s*([^;]+)/) || [])[1];
checks.letterboxScale = (tokens.match(/--nav-logo-letterbox-scale:\s*([^;]+)/) || [])[1];

const site = read('assets/site.js');
checks.counterI18n = /formatNumberForLang/.test(site);
checks.refreshCounters = /refreshCountersForLang/.test(site);
checks.listenerBeforeInit = /addEventListener\('lake-i18n-applied'[\s\S]{0,80}LakeI18n\.init/.test(site);
checks.letterbox = /nav-logo-img--letterboxed/.test(site);

const nav = read('scripts/templates/nav.html');
checks.navAtl = /href="atl\.html"/.test(nav) && !/atl-tz/.test(nav);
checks.navAgro = /href="lake-agro\.html"/.test(nav) && !/lakeagro/.test(nav);
checks.subsidiaries = /Subsidiaries/.test(nav) && !/Our Companies/.test(nav);

const flagship = read('assets/flagship.css');
checks.footerCss = /footer-logo-height/.test(flagship) || /\.footer-logo img \{[^}]*56px/.test(flagship);
checks.letterboxCss = /nav-logo-img--letterboxed/.test(flagship);

let ext = [];
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
  const s = read(f);
  if (/href="https:\/\/atl-tz\.com"|href="https:\/\/lakeagro\.com/.test(s)) ext.push(f);
}
checks.externalPages = ext;

const j = JSON.parse(read('assets/i18n-content.json'));
checks.arHero = j.ar['hero.eyebrow'];
checks.arBadge = j.ar['about.badge'];
checks.arHasDarLatin = /\bDar es Salaam\b/.test(JSON.stringify(j.ar));
checks.hiHasDarLatin = /\bDar es Salaam\b/.test(JSON.stringify(j.hi));
checks.arHasTanzaniaLatin = /\bTanzania\b/.test(JSON.stringify(j.ar));
checks.hiHasTanzaniaLatin = /\bTanzania\b/.test(JSON.stringify(j.hi));

const lubes = fs.readFileSync(path.join(ROOT, 'assets/images/logos/companies/lake-lubes.png'));
checks.lubesDims = lubes.readUInt32BE(16) + 'x' + lubes.readUInt32BE(20);
const ratio = lubes.readUInt32BE(16) / lubes.readUInt32BE(20);
checks.lubesLetterbox = ratio < 1.35;

console.log(JSON.stringify(checks, null, 2));
