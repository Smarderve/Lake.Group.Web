#!/usr/bin/env node
/**
 * Generates assets/images/logos/companies/lake-group-placeholder.png - a
 * neutral grey placeholder used as the default logo for the three new
 * automotive companies until real logos exist.
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '..', 'assets', 'images', 'logos', 'companies', 'lake-group-placeholder.png');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="150" viewBox="0 0 480 150">
  <rect x="1" y="1" width="478" height="148" rx="12" fill="#f2f4f7" stroke="#d5dae1" stroke-width="2"/>
  <g fill="#9aa3af">
    <rect x="150" y="38" width="180" height="74" rx="6"/>
    <rect x="150" y="38" width="180" height="6" rx="3"/>
    <circle cx="180" cy="112" r="7" fill="#f2f4f7" stroke="#9aa3af" stroke-width="4"/>
    <circle cx="300" cy="112" r="7" fill="#f2f4f7" stroke="#9aa3af" stroke-width="4"/>
    <rect x="150" y="74" width="180" height="3" fill="#d5dae1"/>
    <rect x="172" y="50" width="22" height="18" rx="2" fill="#d5dae1"/>
    <rect x="202" y="50" width="22" height="18" rx="2" fill="#d5dae1"/>
    <rect x="232" y="50" width="22" height="18" rx="2" fill="#d5dae1"/>
    <rect x="262" y="50" width="22" height="18" rx="2" fill="#d5dae1"/>
    <rect x="292" y="50" width="22" height="18" rx="2" fill="#d5dae1"/>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('wrote ' + out);
