const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'assets', 'phase-01-navbar.css'), 'utf8');
const agro = fs.readFileSync(path.join(ROOT, 'lake-agro.html'), 'utf8');
const agrinova = fs.readFileSync(path.join(ROOT, 'agrinova-tech.html'), 'utf8');

test('dropdowns share the dark Lake Group base treatment', () => {
  assert.match(css, /--nav-dropdown-bg:\s*rgba\(3, 53, 79, \.92\)/);
  assert.match(css, /--nav-dropdown-sidebar-bg:\s*#03354f/);
  assert.match(css, /\.nav-dropdown,[\s\S]*?\.lang-menu[\s\S]*?background:\s*var\(--nav-menu-surface\)/);
  assert.match(css, /\.mm-cats[\s\S]*?background:\s*var\(--nav-dropdown-sidebar-bg\)/);
  assert.match(css, /\.mm-panes[\s\S]*?background:\s*var\(--nav-dropdown-pane-bg\)/);
});

test('Lake Agro and Agrinova scope the shared dropdown system to green', () => {
  assert.match(css, /body\.co-theme-agro\s*\{[\s\S]*?--nav-dropdown-sidebar-bg:\s*#004b1e/);
  assert.match(css, /body\.co-theme-agro\[data-company-alt="Agrinova Tech Limited"\][\s\S]*?--nav-dropdown-sidebar-bg:\s*#123d2c/);
  assert.match(css, /body\.co-theme-agro \.nav-mobile\[data-phase01-navbar-mobile\][\s\S]*?var\(--nav-dropdown-sidebar-bg\)/);
});

test('agricultural pages retain their themed shells without a loading veil', () => {
  assert.doesNotMatch(agro, /html\.lg-loading::before/);
  assert.match(agrinova, /html\{background:#123d2c\}/);
  assert.doesNotMatch(agrinova, /html\.lg-loading::before/);
});
