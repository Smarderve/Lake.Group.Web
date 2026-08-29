#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const retiredProfiles = [
  'leadership-bibhuti-singh.html', 'leadership-biji-lapat.html',
  'leadership-dileep-kumar.html', 'leadership-jishnu-jayachandran.html',
  'leadership-juma-nuru.html', 'leadership-mohammed-khalid.html',
  'leadership-sridhar-mani.html', 'leadership-zaki-othman.html'
];

function writeIfChanged(file, next) {
  const full = path.join(root, file);
  const current = fs.readFileSync(full, 'utf8');
  if (current !== next) fs.writeFileSync(full, next, 'utf8');
}

function removeBalancedDiv(html, marker) {
  let start = html.indexOf(marker);
  while (start !== -1) {
    start = html.lastIndexOf('<div', start);
    const token = /<div\b|<\/div\s*>/gi;
    token.lastIndex = start;
    let depth = 0;
    let match;
    let end = -1;
    while ((match = token.exec(html))) {
      if (/^<div\b/i.test(match[0])) depth += 1;
      else if (--depth === 0) { end = token.lastIndex; break; }
    }
    if (end < 0) throw new Error('Unbalanced div for ' + marker);
    html = html.slice(0, start) + html.slice(end);
    start = html.indexOf(marker);
  }
  return html;
}

for (const filename of fs.readdirSync(root).filter((name) => name.endsWith('.html'))) {
  const full = path.join(root, filename);
  let html = fs.readFileSync(full, 'utf8');
  for (const retired of retiredProfiles) html = html.split(retired).join('leadership.html');
  html = html.split('services.html').join('index.html');
  writeIfChanged(filename, html);
}

let leadership = fs.readFileSync(path.join(root, 'leadership.html'), 'utf8');
leadership = removeBalancedDiv(leadership, 'class="ld-cat-group"');
leadership = removeBalancedDiv(leadership, 'class="ld-panel reveal"');
leadership = leadership.replace(/"employee"\s*:\s*\[[\s\S]*?\]/, '"employee": [\n    {"@type": "Person", "name": "Ally Edha Awadh", "jobTitle": "Founder & Chairman", "url": "https://www.lakeoilgroup.com/leadership-ally-edha-awadh.html"}\n  ]');
leadership = leadership.replace('Meet the executives guiding Lake Group across energy, manufacturing, logistics and agribusiness in East and Central Africa.', 'Meet Ally Edha Awadh, Founder & Chairman of Lake Group.');
leadership = leadership.replace('Our leaders bring deep domain knowledge across energy, industry, technology and operations. Select a profile to learn more.', 'Founder & Chairman Ally Edha Awadh guides Lake Group with a long-term commitment to quality, service, safety and professionalism.');
leadership = leadership.replace('Leadership Team', 'Founder & Chairman').replace('Corporate Management', 'Ally Edha Awadh');
leadership = leadership.replace('The executives driving Lake Group across energy, manufacturing, operations and agribusiness.', 'Founder & Chairman of Lake Group.');
leadership = leadership.replace('Founder and CEO', 'Founder &amp; Chairman');
writeIfChanged('leadership.html', leadership);

let story = fs.readFileSync(path.join(root, 'our-story.html'), 'utf8');
story = removeBalancedDiv(story, 'class="lang-switcher"');
writeIfChanged('our-story.html', story);

let sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const retired of ['services.html', ...retiredProfiles]) {
  const escaped = retired.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  sitemap = sitemap.replace(new RegExp('\\s*<url>[\\s\\S]*?<loc>[^<]*' + escaped + '<\\/loc>[\\s\\S]*?<\\/url>', 'g'), '');
}
writeIfChanged('sitemap.xml', sitemap);

let sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const retired of ['services.html', ...retiredProfiles]) {
  const escaped = retired.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  sw = sw.replace(new RegExp("\\s*'\\./" + escaped + "',?", 'g'), '');
}
writeIfChanged('sw.js', sw);

const vercelPath = path.join(root, 'vercel.json');
const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
const retiredSources = new Set(['/services.html', ...retiredProfiles.map((p) => '/' + p)]);
vercel.redirects = vercel.redirects.filter((r) => !retiredSources.has(r.source));
vercel.redirects.unshift(
  { source: '/services.html', destination: '/index.html', permanent: true },
  ...retiredProfiles.map((p) => ({ source: '/' + p, destination: '/leadership.html', permanent: true }))
);
fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');

console.log('Phase 01 launch scope applied.');
