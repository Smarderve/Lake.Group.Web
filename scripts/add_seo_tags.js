#!/usr/bin/env node
// Deprecated compatibility entry point. The SEO manifest is the only supported
// metadata source; use `npm run build:seo` for the complete SEO + sitemap run.
const { spawnSync } = require('child_process');
const path = require('path');
const result = spawnSync(process.execPath, [path.join(__dirname, 'build-seo-foundation.mjs')], { stdio: 'inherit' });
process.exit(result.status ?? 1);
