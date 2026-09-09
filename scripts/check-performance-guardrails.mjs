import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pages = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
const offenders = pages.filter((name) => {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  return (html.match(/phase-01-navbar\.js/g) || []).length > 1;
});
if (offenders.length) {
  console.error(`Duplicate navbar script include: ${offenders.join(', ')}`);
  process.exit(1);
}
const careersSource = fs.readFileSync(path.join(root, 'cms/src/components/ui/file-upload.tsx'), 'utf8');
if (!careersSource.includes('pointerRect') || /handlePointerMove[\s\S]*?getBoundingClientRect/.test(careersSource)) {
  console.error('Careers pointer handler must use cached geometry, not measure on pointermove.');
  process.exit(1);
}
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const release = '20260828-01';
if (!new RegExp(`v\\d+-${release}`).test(sw) || !sw.includes(`assets/pwa.js?v=${release}`)) {
  console.error('Service-worker release and precache versions are inconsistent.');
  process.exit(1);
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if ((html.match(/careers-file-upload\.js/g) || []).length) {
  console.error('Careers upload bundle must remain route scoped.');
  process.exit(1);
}
console.log(`Performance guardrails passed: ${pages.length} HTML pages checked.`);
