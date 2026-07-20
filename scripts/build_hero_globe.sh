#!/bin/bash
# Bundles assets/hero-globe (React + react-globe.gl island) into a single
# classic IIFE script: assets/hero-globe.bundle.js
#
# Required because browsers block type="module" under file://. A classic
# <script> loads offline and from local file preview.
#
# Run after editing assets/hero-globe/* :
#   bash scripts/build_hero_globe.sh
#   # or: npm run build:hero-globe
set -e
cd "$(dirname "$0")/.."

# Prefer the Node driver so Windows/PowerShell quoting stays reliable.
node scripts/build_hero_globe.js
