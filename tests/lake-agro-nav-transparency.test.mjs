import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../lake-agro.html', import.meta.url), 'utf8');

test('Lake Agro nav is transparent before scrolling', () => {
  const agroNavRule = page.match(/body\.co-theme-agro \.site-nav\s*\{([\s\S]*?)\}/)?.[1] ?? '';

  assert.match(agroNavRule, /background(?:-color)?\s*:\s*transparent/);
  assert.match(agroNavRule, /border-bottom\s*:\s*none/);
});

test('Lake Agro nav keeps a branded elevated state after scrolling', () => {
  const scrolledRule = page.match(/body\.co-theme-agro \.site-nav\.nav-scrolled\s*\{([\s\S]*?)\}/)?.[1] ?? '';

  assert.match(scrolledRule, /background(?:-color)?\s*:/);
  assert.match(scrolledRule, /backdrop-filter\s*:\s*blur/);
});
