#!/bin/bash
# Bundles assets/hero-3d.js (an ES module that imports three.js) into a
# single classic IIFE script, assets/hero-3d.bundle.js, with no import/
# export statements. This is required because browsers block
# type="module" scripts from loading under file:// (CORS policy applies
# to module scripts even for purely local, same-directory imports), which
# is how most people preview a static site by double-clicking index.html.
# A bundled classic <script> has no such restriction.
#
# Run this any time assets/hero-3d.js or assets/vendor/three.module.min.js
# changes. index.html loads the OUTPUT of this script
# (assets/hero-3d.bundle.js), not assets/hero-3d.js directly.
set -e
cd "$(dirname "$0")/.."
npx esbuild assets/hero-3d.js --bundle --minify --format=iife --outfile=assets/hero-3d.bundle.js
echo "Built assets/hero-3d.bundle.js"
