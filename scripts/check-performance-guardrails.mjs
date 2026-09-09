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
console.log(`Performance guardrails passed: ${pages.length} HTML pages checked.`);
