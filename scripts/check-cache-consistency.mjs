import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const release = '20260828-01';
const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
const critical = [
  'build-version.js',
  'phase-01-navbar.css',
  'phase-01-footer.css',
  'phase-01-navbar.js',
  'pwa.js',
  'site.js',
  'i18n.js',
  'i18n-content.js',
  'flagship.css',
  'theme.css',
];
const errors = [];
const versions = new Map();

for (const file of htmlFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes('assets/build-version.js?v=' + release)) {
    errors.push(file + ': missing deterministic build marker');
  }

  for (const match of source.matchAll(/(?:href|src)="(assets\/[^"?#]+)(?:\?v=([^"#]+))?[^"]*"/g)) {
    const [, asset, version] = match;
    const name = asset.split('/').pop();
    if (!version && critical.includes(name)) {
      errors.push(file + ': unversioned critical asset ' + asset);
    }
    if (version) {
      if (!versions.has(asset)) versions.set(asset, new Set());
      versions.get(asset).add(version);
      if (critical.includes(name) && version !== release) {
        errors.push(file + ': ' + asset + ' uses ' + version + ', expected ' + release);
      }
    }
  }
}

for (const [asset, assetVersions] of versions) {
  if (assetVersions.size > 1) {
    errors.push(asset + ': inconsistent query versions (' + [...assetVersions].join(', ') + ')');
  }
}

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (!sw.includes('v73-' + release)) errors.push('sw.js: release version is not current');
for (const asset of critical.filter((name) => name !== 'theme.css')) {
  if (!sw.includes(asset + '?v=' + release)) errors.push('sw.js: missing current precache URL for ' + asset);
}

const vercel = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');
if (!vercel.includes('public, max-age=0, must-revalidate')) {
  errors.push('vercel.json: HTML revalidation policy missing');
}

console.log('Cache consistency audit: ' + htmlFiles.length + ' public HTML files, release ' + release);
if (errors.length) {
  console.error(errors.map((error) => 'FAIL: ' + error).join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: build markers, shared asset versions, service-worker release, and HTML policy are consistent.');
}
