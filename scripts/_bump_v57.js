#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const V = {
  tokens: '57',
  theme: '71',
  flagship: '71',
  pwa: '57',
  site: '57',
  motion: '57',
  flagshipMotion: '57',
  skeleton: '2',
};
const map = {
  'tokens.css': V.tokens,
  'theme.css': V.theme,
  'flagship.css': V.flagship,
  'pwa.js': V.pwa,
  'site.js': V.site,
  'motion.js': V.motion,
  'flagship-motion.js': V.flagshipMotion,
  'skeleton.css': V.skeleton,
  'skeleton.js': V.skeleton,
};

function bump(html) {
  let out = html;
  for (const [file, ver] of Object.entries(map)) {
    const re = new RegExp(
      `((?:href|src)=["'])assets/${file.replace('.', '\\.')}(?:\\?[^"']*)?(["'])`,
      'g'
    );
    out = out.replace(re, `$1assets/${file}?v=${ver}$2`);
  }
  out = out.replace(
    /@import\s+url\(["']assets\/tokens\.css(?:\?[^"']*)?["']\)/g,
    `@import url("assets/tokens.css?v=${V.tokens}")`
  );
  const crit =
    '<style id="lg-skel-critical">html.lg-loading{overflow:hidden}html.lg-loading::before{content:"";position:fixed;inset:0;z-index:99989;background:#013f5c;pointer-events:none}html.lg-skel-done::before{display:none}</style>';
  if (out.includes('id="lg-skel-critical"')) {
    out = out.replace(/<style id="lg-skel-critical">[\s\S]*?<\/style>/, crit);
  }
  return out;
}

function writeRetry(fp, data) {
  for (let i = 0; i < 12; i++) {
    try {
      fs.writeFileSync(fp, data);
      return true;
    } catch (e) {
      const sab = new SharedArrayBuffer(4);
      Atomics.wait(new Int32Array(sab), 0, 0, 300);
    }
  }
  return false;
}

const files = fs.readdirSync('.').filter((f) => f.endsWith('.html')).sort();
let n = 0;
for (const f of files) {
  const fp = path.join('.', f);
  let html = fs.readFileSync(fp, 'utf8');
  const before = html;
  html = bump(html);
  if (html !== before) {
    if (writeRetry(fp, html)) {
      console.log('updated', f);
      n++;
    } else console.log('FAIL', f);
  } else console.log('ok', f);
}
console.log('bumped', n);
