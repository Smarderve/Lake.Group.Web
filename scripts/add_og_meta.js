#!/usr/bin/env node
// Deprecated compatibility entry point. Search metadata is centrally generated
// by build-seo-foundation.mjs; retaining this wrapper prevents old workflows
// from reintroducing preview-domain Open Graph URLs.
const { spawnSync } = require('child_process');
const path = require('path');
const result = spawnSync(process.execPath, [path.join(__dirname, 'build-seo-foundation.mjs')], { stdio: 'inherit' });
process.exit(result.status ?? 1);
