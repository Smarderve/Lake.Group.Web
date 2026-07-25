#!/usr/bin/env node
/**
 * One-shot: align leadership profile type overrides + bump tokens/theme/flagship cache.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TOKENS_V = '62';
const THEME_V = '79';
const FLAGSHIP_V = '80';

const LP_NAME_OLD =
  '.lp-name { font-family: var(--font-display, var(--font-heading)); font-weight: 700; font-size: clamp(2.4rem, 5vw, 3.8rem); line-height: 1; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 10px; color: var(--ink, var(--color-text-heading)); }';
const LP_NAME_NEW =
  '.lp-name { font-family: var(--font-display, var(--font-heading)); font-weight: 700; font-size: var(--fs-hero-company); line-height: var(--display-line-height, 1.05); text-transform: uppercase; letter-spacing: var(--display-letter-spacing, -0.01em); margin: 0 0 10px; color: var(--ink, var(--color-text-heading)); }';

const LP_BODY_REPLACERS = [
  [
    /\.lp-role \{ font-size: 1\.05rem;/g,
    '.lp-role { font-size: var(--fs-lede);',
  ],
  [
    /\.lp-lede \{ font-size: 1\.12rem; line-height: 1\.65;/g,
    '.lp-lede { font-size: var(--fs-lede); line-height: 1.65;',
  ],
  [
    /\.lp-body p \{ font-size: \.98rem; line-height: 1\.75;/g,
    '.lp-body p { font-size: var(--fs-body); line-height: var(--body-line-height, 1.65);',
  ],
];

function bumpHtml(html) {
  return html
    .replace(/tokens\.css\?v=\d+/g, `tokens.css?v=${TOKENS_V}`)
    .replace(/theme\.css\?v=\d+/g, `theme.css?v=${THEME_V}`)
    .replace(/flagship\.css\?v=\d+/g, `flagship.css?v=${FLAGSHIP_V}`)
    .replace(/@import url\(["']assets\/tokens\.css\?v=\d+["']\)/g, `@import url("assets/tokens.css?v=${TOKENS_V}")`)
    .replace(/flagship\.css\?v=\d+/g, `flagship.css?v=${FLAGSHIP_V}`);
}

let htmlChanged = 0;
let lpChanged = 0;

for (const fn of fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort()) {
  const fp = path.join(ROOT, fn);
  let html = fs.readFileSync(fp, 'utf8');
  const orig = html;

  if (html.includes(LP_NAME_OLD)) {
    html = html.replace(LP_NAME_OLD, LP_NAME_NEW);
    lpChanged += 1;
  }
  for (const [re, rep] of LP_BODY_REPLACERS) {
    html = html.replace(re, rep);
  }

  html = bumpHtml(html);

  if (html !== orig) {
    fs.writeFileSync(fp, html, 'utf8');
    htmlChanged += 1;
    console.log('updated', fn);
  }
}

// CSS imports inside theme/flagship already set; ensure flagship @import tokens
const flagshipPath = path.join(ROOT, 'assets', 'flagship.css');
let flagship = fs.readFileSync(flagshipPath, 'utf8');
const flagshipOrig = flagship;
flagship = flagship
  .replace(/tokens\.css\?v=\d+/g, `tokens.css?v=${TOKENS_V}`)
  .replace(
    '.mob-section { padding: 14px 16px 4px; font-size: 0.62rem; letter-spacing: 0.26em;',
    '.mob-section { padding: 14px 16px 4px; font-size: 0.72rem; letter-spacing: var(--eyebrow-letter-spacing, 0.16em);'
  )
  .replace(
    '.footer-motto { color: var(--gold) !important; font-size: var(--fs-micro) !important; font-weight: 700 !important; letter-spacing: 0.26em !important; text-transform: uppercase; }',
    '.footer-motto { color: var(--gold) !important; font-size: var(--fs-micro) !important; font-weight: 700 !important; letter-spacing: var(--eyebrow-letter-spacing, 0.16em) !important; text-transform: uppercase; }'
  )
  .replace(
    '  color: #fff; font-size: var(--fs-micro); letter-spacing: 0.26em;\n  text-transform: uppercase; font-weight: 700; margin-bottom: var(--sp-5);',
    '  color: #fff; font-size: var(--fs-micro); letter-spacing: var(--eyebrow-letter-spacing, 0.16em);\n  text-transform: uppercase; font-weight: 700; margin-bottom: var(--sp-5);'
  );

if (flagship !== flagshipOrig) {
  fs.writeFileSync(flagshipPath, flagship, 'utf8');
  console.log('updated assets/flagship.css');
}

const themePath = path.join(ROOT, 'assets', 'theme.css');
let theme = fs.readFileSync(themePath, 'utf8');
const themeOrig = theme;
theme = theme.replace(/tokens\.css\?v=\d+/g, `tokens.css?v=${TOKENS_V}`);
if (theme !== themeOrig) {
  fs.writeFileSync(themePath, theme, 'utf8');
  console.log('updated assets/theme.css');
}

// SW precache versions
const swPath = path.join(ROOT, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
const swOrig = sw;
sw = sw
  .replace(/const VERSION = 'v\d+';/, "const VERSION = 'v63';")
  .replace(/v62: Jost hero type scale[^\n]*/, 'v63: Jost sitewide type scale retune (tokens --fs-*).')
  .replace(/tokens\.css\?v=\d+/g, `tokens.css?v=${TOKENS_V}`)
  .replace(/theme\.css\?v=\d+/g, `theme.css?v=${THEME_V}`)
  .replace(/flagship\.css\?v=\d+/g, `flagship.css?v=${FLAGSHIP_V}`);
if (sw !== swOrig) {
  fs.writeFileSync(swPath, sw, 'utf8');
  console.log('updated sw.js');
}

console.log(
  JSON.stringify(
    {
      htmlChanged,
      lpChanged,
      tokens: TOKENS_V,
      theme: THEME_V,
      flagship: FLAGSHIP_V,
      sw: 'v63',
    },
    null,
    2
  )
);
