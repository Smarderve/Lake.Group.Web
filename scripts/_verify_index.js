#!/usr/bin/env node
'use strict';
const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
console.log('broken img', (h.match(/\/ loading=/g) || []).length);
console.log('hero eager', h.includes('hero-photo-grid') && h.includes('loading="eager"'));
console.log('pwa58', /pwa\.js\?v=58/.test(h));
console.log('theme73', /theme\.css\?v=73/.test(h));
console.log('skel3', /skeleton\.css\?v=3/.test(h));
console.log('logo fallback', /nav-logo-height, 48px/.test(h));
console.log('lines', h.split(/\n/).length);
console.log('comment ok', h.includes('also imported by theme.css'));
