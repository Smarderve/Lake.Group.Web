const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.join(__dirname, '..', 'lake-cylinders.html');
const page = fs.readFileSync(pagePath, 'utf8');

test('Lake Cylinders page uses approved company facts and contacts', () => {
  const required = [
    'specialized LPG cylinder manufacturing company',
    'Visiga, Kibaha, Pwani, Tanzania',
    '40,000 6 kg LPG cylinders per month',
    'production schedules, operating conditions and customer requirements',
    '200,000+ cylinders',
    'Expansion into 38 kg LPG cylinder manufacturing',
    'Cylinder Revalidation &amp; Refurbishment',
    'Cylinder Repair &amp; Maintenance',
    'Quality Inspection &amp; Testing',
    'Customized Cylinder Solutions',
    'LPG Cylinder Supply &amp; Distribution',
    'Zaki Othman',
    '+255 745 552 259',
    'zaki.othman@lakeoilgroup.com',
    'production.lc@lakeoilgroup.com',
  ];

  for (const fragment of required) assert.ok(page.includes(fragment), `missing approved fragment: ${fragment}`);
});

test('Lake Cylinders page does not retain known unsupported legacy claims', () => {
  const removed = [
    '152 retail stations',
    "Tanzania's top 5",
    'East and Central Africa\'s fastest-growing',
  ];

  for (const fragment of removed) assert.equal(page.toLowerCase().includes(fragment.toLowerCase()), false, `stale claim remains: ${fragment}`);
});
